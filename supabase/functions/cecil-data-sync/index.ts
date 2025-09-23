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
          const statusResponse = await fetch(`https://api.cecil.ag/v1/data-requests/${request.cecil_request_id}`, {
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

          // Get transformations for this request
          const transformationsResponse = await fetch(`https://api.cecil.ag/v1/data-requests/${request.cecil_request_id}/transformations`, {
            headers: {
              'Authorization': `Bearer ${cecilApiKey}`,
            },
          });

          if (!transformationsResponse.ok) {
            console.error(`Failed to get transformations for request ${request.id}`);
            continue;
          }

          const transformations = await transformationsResponse.json();
          console.log(`Found ${transformations.length} transformations for request ${request.id}`);

          // Process each transformation
          for (const transformation of transformations) {
            // Store transformation info
            const { data: storedTransformation, error: transformError } = await supabase
              .from('cecil_transformations')
              .upsert({
                data_request_id: request.id,
                cecil_transformation_id: transformation.id,
                spatial_resolution: transformation.spatial_resolution || 0.00025,
                crs: transformation.crs || 'EPSG:4326',
                status: transformation.status || 'completed',
                created_by: '00000000-0000-0000-0000-000000000000'
              })
              .select()
              .single();

            if (transformError) {
              console.error(`Error storing transformation ${transformation.id}:`, transformError);
              continue;
            }

            // Get satellite data for this transformation
            const dataResponse = await fetch(`https://api.cecil.ag/v1/transformations/${transformation.id}/data`, {
              headers: {
                'Authorization': `Bearer ${cecilApiKey}`,
              },
            });

            if (!dataResponse.ok) {
              console.error(`Failed to get data for transformation ${transformation.id}`);
              continue;
            }

            const satelliteData: CecilSatelliteData[] = await dataResponse.json();
            console.log(`Got ${satelliteData.length} data points for transformation ${transformation.id}`);

            // Store satellite data
            for (const dataPoint of satelliteData) {
              try {
                const { error: dataError } = await supabase
                  .from('cecil_satellite_data')
                  .upsert({
                    cecil_aoi_id: request.cecil_aoi_id,
                    transformation_id: storedTransformation.id,
                    x: dataPoint.x,
                    y: dataPoint.y,
                    year: dataPoint.year,
                    month: dataPoint.month,
                    day: dataPoint.day,
                    measurement_date: dataPoint.measurement_date,
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
                    pixel_boundary: dataPoint.pixel_boundary
                  });

                if (dataError) {
                  console.error(`Error storing data point:`, dataError);
                }
              } catch (pointError) {
                console.error(`Error processing data point:`, pointError);
              }
            }
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