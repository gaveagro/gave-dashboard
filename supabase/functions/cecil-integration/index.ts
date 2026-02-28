import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;

    // Verify admin role
    const { data: profile } = await supabaseAuth
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const cecilApiKey = Deno.env.get('CECIL_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const action = typeof body.action === 'string' ? body.action : '';
    const plotId = typeof body.plotId === 'string' ? body.plotId : '';
    const datasets = Array.isArray(body.datasets) ? body.datasets.filter((d: any) => typeof d === 'string').slice(0, 10) : [];

    // Validate UUID format for plotId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (action === 'create_aoi_for_plot') {
      if (!plotId || !uuidRegex.test(plotId)) {
        return new Response(JSON.stringify({ error: 'Invalid plotId' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

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
      
      if (plot.name === 'La Sierra') {
        geometry = {
          type: "Polygon",
          coordinates: [[
            [-99.13166666666666, 21.734166666666667],
            [-99.13111111111111, 21.734722222222224],
            [-99.12972222222221, 21.732499999999998],
            [-99.12972222222221, 21.73222222222222],
            [-99.13166666666666, 21.734166666666667]
          ]]
        };
      } else if (plot.name === 'Aurelio Manrique') {
        geometry = {
          type: "Polygon",
          coordinates: [[
            [-98.65944444444445, 22.30638888888889],
            [-98.65777777777778, 22.307222222222222], 
            [-98.65777777777778, 22.305555555555557],
            [-98.66111111111111, 22.305555555555557],
            [-98.65944444444445, 22.30638888888889]
          ]]
        };
      } else {
        const [lat, lng] = plot.coordinates.split(', ').map(parseFloat);
        const buffer = 0.001;
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

      // Get available datasets
      const datasetsResponse = await fetch('https://api.cecil.app/datasets', {
        headers: { 'Authorization': `Bearer ${cecilApiKey}` },
      });

      if (!datasetsResponse.ok) {
        throw new Error(`Failed to fetch datasets: ${datasetsResponse.status}`);
      }

      const availableDatasets = await datasetsResponse.json();

      const forestDatasets = availableDatasets.filter((d: any) => 
        d.name?.toLowerCase().includes('hansen') || 
        d.name?.toLowerCase().includes('forest') || 
        d.name?.toLowerCase().includes('biomass')
      );
      
      const datasetsToUse = datasets.length > 0 
        ? datasets.filter((d: string) => availableDatasets.some((ad: any) => ad.id === d))
        : forestDatasets.length > 0 
          ? forestDatasets.slice(0, 2).map((d: any) => d.id)
          : availableDatasets.slice(0, 2).map((d: any) => d.id);

      // Create AOI in Cecil
      const cecilResponse = await fetch('https://api.cecil.app/aois', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cecilApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: plot.name,
          geometry: geometry,
          external_ref: `plot-${plot.id}`
        })
      });

      if (!cecilResponse.ok) {
        const errorText = await cecilResponse.text();
        throw new Error(`Cecil API error: ${cecilResponse.status} - ${errorText}`);
      }

      const cecilAOI = await cecilResponse.json();

      // Store in database
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
          created_by: userId
        })
        .select()
        .single();

      if (aoiError) {
        throw new Error(`Failed to store AOI: ${aoiError.message}`);
      }

      // Create data requests
      const dataRequests = [];
      for (const datasetId of datasetsToUse) {
        try {
          const dataResponse = await fetch('https://api.cecil.app/data_requests', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${cecilApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ aoi_id: cecilAOI.id, dataset_id: datasetId })
          });

          if (!dataResponse.ok) continue;

          const dataRequest = await dataResponse.json();
          const datasetInfo = availableDatasets.find((d: any) => d.id === datasetId);

          await supabase
            .from('cecil_data_requests')
            .insert({
              external_ref: `${plot.id}-${datasetId}`,
              cecil_aoi_id: newAOI.id,
              dataset_name: datasetInfo ? datasetInfo.name : datasetId,
              dataset_id: datasetId,
              cecil_request_id: dataRequest.id,
              status: 'pending',
              created_by: userId
            });

          dataRequests.push(dataRequest);
        } catch (error) {
          console.error(`Error processing dataset ${datasetId}:`, error);
        }
      }

      return new Response(JSON.stringify({ 
        success: true,
        aoi: newAOI,
        message: `AOI created with ${dataRequests.length} data requests`
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
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
