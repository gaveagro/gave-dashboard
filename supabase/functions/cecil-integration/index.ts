import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CecilCreateAOIRequest {
  name: string;
  geometry: any;
  hectares?: number;
}

interface CecilDataRequest {
  aoi_id: string;
  dataset_name: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const cecilApiKey = Deno.env.get('CECIL_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, plotId, datasets = ['kanop', 'planet'] } = await req.json();

    if (action === 'create_aoi_for_plot') {
      // Get plot details
      const { data: plot, error: plotError } = await supabase
        .from('plots')
        .select('*')
        .eq('id', plotId)
        .single();

      if (plotError || !plot) {
        throw new Error(`Plot not found: ${plotError?.message}`);
      }

      // Check if AOI already exists
      const { data: existingAOI } = await supabase
        .from('cecil_aois')
        .select('*')
        .eq('plot_id', plotId)
        .single();

      if (existingAOI) {
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'AOI already exists',
          aoi: existingAOI 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create geometry from plot coordinates
      const [lat, lng] = plot.coordinates.split(', ').map(parseFloat);
      const buffer = 0.001; // Small buffer around the point
      const geometry = {
        type: "Polygon",
        coordinates: [[
          [lng - buffer, lat - buffer],
          [lng + buffer, lat - buffer],
          [lng + buffer, lat + buffer],
          [lng - buffer, lat + buffer],
          [lng - buffer, lat - buffer]
        ]]
      };

      // Create AOI in Cecil
      const cecilAOIPayload: CecilCreateAOIRequest = {
        name: `plot-${plot.id}`,
        geometry: geometry,
        hectares: plot.area
      };

      console.log('Creating AOI in Cecil:', cecilAOIPayload);

      const cecilResponse = await fetch('https://api.cecil.ag/v1/aois', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cecilApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cecilAOIPayload)
      });

      if (!cecilResponse.ok) {
        const errorText = await cecilResponse.text();
        throw new Error(`Cecil API error: ${cecilResponse.status} - ${errorText}`);
      }

      const cecilAOI = await cecilResponse.json();
      console.log('Cecil AOI created:', cecilAOI);

      // Store in our database
      const { data: newAOI, error: aoiError } = await supabase
        .from('cecil_aois')
        .insert({
          external_ref: `plot-${plot.id}`,
          plot_id: plotId,
          name: plot.name,
          geometry: geometry,
          hectares: plot.area,
          cecil_aoi_id: cecilAOI.id,
          status: 'active',
          created_by: '00000000-0000-0000-0000-000000000000' // System user
        })
        .select()
        .single();

      if (aoiError) {
        console.error('Error storing AOI:', aoiError);
        throw new Error(`Failed to store AOI: ${aoiError.message}`);
      }

      // Create data requests for specified datasets
      const dataRequests = [];
      for (const dataset of datasets) {
        try {
          const dataRequestPayload: CecilDataRequest = {
            aoi_id: cecilAOI.id,
            dataset_name: dataset
          };

          console.log(`Creating data request for ${dataset}:`, dataRequestPayload);

          const dataResponse = await fetch('https://api.cecil.ag/v1/data-requests', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${cecilApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataRequestPayload)
          });

          if (!dataResponse.ok) {
            const errorText = await dataResponse.text();
            console.error(`Data request failed for ${dataset}:`, errorText);
            continue;
          }

          const dataRequest = await dataResponse.json();
          console.log(`Data request created for ${dataset}:`, dataRequest);

          // Store data request in our database
          const { error: requestError } = await supabase
            .from('cecil_data_requests')
            .insert({
              external_ref: `${plot.id}-${dataset}`,
              cecil_aoi_id: newAOI.id,
              dataset_name: dataset,
              dataset_id: dataset,
              cecil_request_id: dataRequest.id,
              status: 'pending',
              created_by: '00000000-0000-0000-0000-000000000000'
            });

          if (requestError) {
            console.error(`Error storing data request for ${dataset}:`, requestError);
          } else {
            dataRequests.push(dataRequest);
          }
        } catch (error) {
          console.error(`Error processing dataset ${dataset}:`, error);
        }
      }

      return new Response(JSON.stringify({ 
        success: true,
        aoi: newAOI,
        cecilAOI: cecilAOI,
        dataRequests: dataRequests,
        message: `AOI created successfully with ${dataRequests.length} data requests`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in cecil-integration:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});