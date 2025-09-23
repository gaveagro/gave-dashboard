import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CecilCreateAOIRequest {
  name: string;
  geometry: {
    type: string;
    coordinates: number[][][];
  };
  external_ref?: string;
}

interface CecilDataRequest {
  aoi_id: string;
  dataset_id: string;
}

interface CecilDataset {
  id: string;
  name: string;
  description?: string;
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

    const { action, plotId, datasets } = await req.json();

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
      let geometry;
      
      // Special handling for La Sierra plot with specific coordinates
      if (plot.name === 'La Sierra') {
        // Use the specific polygon coordinates provided by the user
        geometry = {
          type: "Polygon",
          coordinates: [[
            [-99.13166666666666, 21.734166666666667],
            [-99.13111111111111, 21.734722222222224],
            [-99.12972222222221, 21.732499999999998],
            [-99.12972222222221, 21.73222222222222],
            [-99.13166666666666, 21.734166666666667] // Close the polygon
          ]]
        };
      } else {
        // Default polygon creation for other plots
        const [lat, lng] = plot.coordinates.split(', ').map(parseFloat);
        const buffer = 0.001; // Small buffer around the point
        geometry = {
          type: "Polygon",
          coordinates: [[
            [lng - buffer, lat - buffer],
            [lng + buffer, lat - buffer],
            [lng + buffer, lat + buffer],
            [lng - buffer, lat + buffer],
            [lng - buffer, lat - buffer]
          ]]
        };
      }

      // Get available datasets first
      console.log('Fetching available datasets from Cecil...');
      const datasetsResponse = await fetch('https://api.cecil.app/datasets', {
        headers: {
          'Authorization': `Bearer ${cecilApiKey}`,
        },
      });

      if (!datasetsResponse.ok) {
        throw new Error(`Failed to fetch datasets: ${datasetsResponse.status}`);
      }

      const availableDatasets: CecilDataset[] = await datasetsResponse.json();
      console.log('Available datasets:', availableDatasets.map(d => d.id));

      // Use provided datasets or default to first 2 available
      const datasetsToUse = datasets && datasets.length > 0 
        ? datasets.filter((d: string) => availableDatasets.some(ad => ad.id === d))
        : availableDatasets.slice(0, 2).map(d => d.id);

      console.log('Datasets to use:', datasetsToUse);

      // Create AOI in Cecil
      const cecilAOIPayload: CecilCreateAOIRequest = {
        name: plot.name,
        geometry: geometry,
        external_ref: `plot-${plot.id}`
      };

      console.log('Creating AOI in Cecil:', cecilAOIPayload);

      const cecilResponse = await fetch('https://api.cecil.app/aois', {
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
      for (const datasetId of datasetsToUse) {
        try {
          const dataRequestPayload: CecilDataRequest = {
            aoi_id: cecilAOI.id,
            dataset_id: datasetId
          };

          console.log(`Creating data request for ${datasetId}:`, dataRequestPayload);

          const dataResponse = await fetch('https://api.cecil.app/data_requests', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${cecilApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataRequestPayload)
          });

          if (!dataResponse.ok) {
            const errorText = await dataResponse.text();
            console.error(`Data request failed for ${datasetId}:`, errorText);
            continue;
          }

          const dataRequest = await dataResponse.json();
          console.log(`Data request created for ${datasetId}:`, dataRequest);

          // Get dataset name from available datasets
          const datasetInfo = availableDatasets.find(d => d.id === datasetId);
          const datasetName = datasetInfo ? datasetInfo.name : datasetId;

          // Store data request in our database
          const { error: requestError } = await supabase
            .from('cecil_data_requests')
            .insert({
              external_ref: `${plot.id}-${datasetId}`,
              cecil_aoi_id: newAOI.id,
              dataset_name: datasetName,
              dataset_id: datasetId,
              cecil_request_id: dataRequest.id,
              status: 'pending',
              created_by: '00000000-0000-0000-0000-000000000000'
            });

          if (requestError) {
            console.error(`Error storing data request for ${datasetId}:`, requestError);
          } else {
            dataRequests.push(dataRequest);
          }
        } catch (error) {
          console.error(`Error processing dataset ${datasetId}:`, error);
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