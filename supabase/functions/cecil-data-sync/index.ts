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
    const requestId = typeof body.requestId === 'string' ? body.requestId : undefined;

    if (action === 'sync_satellite_data') {
      let requestsToSync: any[] = [];

      if (requestId) {
        const { data: request } = await supabase
          .from('cecil_data_requests')
          .select('*')
          .eq('id', requestId)
          .single();
        if (request) requestsToSync.push(request);
      } else {
        const { data: requests } = await supabase
          .from('cecil_data_requests')
          .select('*')
          .eq('status', 'pending');
        requestsToSync = requests || [];
      }

      let syncedCount = 0;
      let errorCount = 0;

      for (const request of requestsToSync) {
        try {
          const statusResponse = await fetch(`https://api.cecil.app/data_requests/${request.cecil_request_id}`, {
            headers: { 'Authorization': `Bearer ${cecilApiKey}` },
          });

          if (!statusResponse.ok) continue;

          const statusData = await statusResponse.json();
          if (statusData.status !== 'completed') continue;

          const queryResponse = await fetch('https://api.cecil.app/query', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${cecilApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              aoi_id: statusData.aoi_id,
              dataset_id: request.dataset_id,
              start_date: '2020-01-01',
              end_date: new Date().toISOString().split('T')[0]
            })
          });

          if (!queryResponse.ok) continue;

          const queryData = await queryResponse.json();

          if (queryData?.data && Array.isArray(queryData.data)) {
            for (const dataPoint of queryData.data) {
              try {
                let measurementDate = dataPoint.date || dataPoint.measurement_date;
                if (measurementDate && typeof measurementDate === 'string') {
                  measurementDate = new Date(measurementDate).toISOString().split('T')[0];
                }

                await supabase
                  .from('cecil_satellite_data')
                  .upsert({
                    cecil_aoi_id: request.cecil_aoi_id,
                    transformation_id: null,
                    x: dataPoint.x || dataPoint.longitude || 0,
                    y: dataPoint.y || dataPoint.latitude || 0,
                    year: dataPoint.year || (measurementDate ? new Date(measurementDate).getFullYear() : null),
                    month: dataPoint.month || (measurementDate ? new Date(measurementDate).getMonth() + 1 : null),
                    day: dataPoint.day || (measurementDate ? new Date(measurementDate).getDate() : null),
                    measurement_date: measurementDate,
                    dataset_name: request.dataset_name,
                    ndvi: dataPoint.ndvi,
                    evi: dataPoint.evi,
                    savi: dataPoint.savi,
                    msavi: dataPoint.msavi,
                    ndwi: dataPoint.ndwi,
                    biomass: dataPoint.biomass,
                    carbon_capture: dataPoint.carbon_capture,
                    canopy_cover: dataPoint.canopy_cover,
                    cloud_coverage: dataPoint.cloud_coverage,
                    data_quality: dataPoint.data_quality || 'good',
                    pixel_boundary: dataPoint.pixel_boundary || dataPoint.geometry
                  }, { onConflict: 'cecil_aoi_id,x,y,measurement_date,dataset_name' });
              } catch (pointError) {
                console.error('Error processing data point:', pointError);
              }
            }
          }

          await supabase
            .from('cecil_data_requests')
            .update({ status: 'completed' })
            .eq('id', request.id);

          syncedCount++;
        } catch (error) {
          errorCount++;
          await supabase
            .from('cecil_data_requests')
            .update({ status: 'error', error_message: (error as Error).message })
            .eq('id', request.id);
        }
      }

      return new Response(JSON.stringify({ 
        success: true,
        synced: syncedCount,
        errors: errorCount,
        total: requestsToSync.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in cecil-data-sync:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
