import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CecilSatelliteData {
  id: string;
  transformation_id: string;
  x: number;
  y: number;
  year: number;
  month?: number;
  day?: number;
  measurement_date?: string;
  ndvi?: number;
  evi?: number;
  savi?: number;
  msavi?: number;
  ndwi?: number;
  biomass?: number;
  carbon_capture?: number;
  canopy_cover?: number;
  cloud_coverage?: number;
  data_quality?: string;
  pixel_boundary?: any;
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

    const { action, requestId, transformationId } = await req.json();

    if (action === 'sync_satellite_data') {
      let requestsToSync = [];

      if (requestId) {
        // Sync specific request
        const { data: request } = await supabase
          .from('cecil_data_requests')
          .select('*')
          .eq('id', requestId)
          .single();
        
        if (request) requestsToSync.push(request);
      } else {
        // Sync all pending requests
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
          console.log(`Syncing data for request: ${request.id}`);

          // Check if request is ready in Cecil
          const statusResponse = await fetch(`https://api.cecil.app/data_requests/${request.cecil_request_id}`, {
            headers: {
              'Authorization': `Bearer ${cecilApiKey}`,
            },
          });

          if (!statusResponse.ok) {
            console.error(`Failed to check status for request ${request.id}`);
            continue;
          }

          const statusData = await statusResponse.json();
          console.log(`Request ${request.id} status:`, statusData.status);

          if (statusData.status !== 'completed') {
            console.log(`Request ${request.id} not ready yet, status: ${statusData.status}`);
            continue;
          }

          // Use new query API to get satellite data directly (no transformations)
          console.log(`Querying satellite data for request ${request.id}...`);
          
          // Query satellite data using the new API
          const queryPayload = {
            aoi_id: statusData.aoi_id,
            dataset_id: request.dataset_id,
            start_date: '2020-01-01',
            end_date: new Date().toISOString().split('T')[0] // Current date
          };

          const queryResponse = await fetch('https://api.cecil.app/query', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${cecilApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(queryPayload)
          });

          if (!queryResponse.ok) {
            const errorText = await queryResponse.text();
            console.error(`Failed to query data for request ${request.id}:`, errorText);
            continue;
          }

          const queryData = await queryResponse.json();
          console.log(`Got query response for request ${request.id}:`, queryData);

          // Process the returned data
          if (queryData && queryData.data && Array.isArray(queryData.data)) {
            console.log(`Processing ${queryData.data.length} data points for request ${request.id}`);

            // Store satellite data points
            for (const dataPoint of queryData.data) {
              try {
                // Convert date format if needed
                let measurementDate = dataPoint.date || dataPoint.measurement_date;
                if (measurementDate && typeof measurementDate === 'string') {
                  const dateObj = new Date(measurementDate);
                  measurementDate = dateObj.toISOString().split('T')[0];
                }

                const { error: dataError } = await supabase
                  .from('cecil_satellite_data')
                  .upsert({
                    cecil_aoi_id: request.cecil_aoi_id,
                    transformation_id: null, // No longer using transformations
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
                  }, {
                    onConflict: 'cecil_aoi_id,x,y,measurement_date,dataset_name'
                  });

                if (dataError) {
                  console.error(`Error storing data point:`, dataError);
                }
              } catch (pointError) {
                console.error(`Error processing data point:`, pointError);
              }
            }
          } else {
            console.log(`No data returned for request ${request.id}`);
          }

          // Update request status
          await supabase
            .from('cecil_data_requests')
            .update({ status: 'completed' })
            .eq('id', request.id);

          syncedCount++;
          console.log(`Successfully synced request ${request.id}`);

        } catch (error) {
          console.error(`Error syncing request ${request.id}:`, error);
          errorCount++;
          
          // Update request with error
          await supabase
            .from('cecil_data_requests')
            .update({ 
              status: 'error',
              error_message: error.message 
            })
            .eq('id', request.id);
        }
      }

      return new Response(JSON.stringify({ 
        success: true,
        synced: syncedCount,
        errors: errorCount,
        total: requestsToSync.length,
        message: `Synced ${syncedCount} requests, ${errorCount} errors`
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
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});