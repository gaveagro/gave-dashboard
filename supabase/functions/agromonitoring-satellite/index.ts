import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AGROMONITORING_API_URL = 'https://api.agromonitoring.com/agro/1.0';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('AGROMONITORING_API_KEY');
    if (!apiKey) {
      throw new Error('AGROMONITORING_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, polygonId, startDate, endDate } = await req.json();
    console.log(`Agromonitoring satellite action: ${action}, polygonId: ${polygonId}`);

    // Calculate date range (default last 30 days)
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startUnix = Math.floor(start.getTime() / 1000);
    const endUnix = Math.floor(end.getTime() / 1000);

    switch (action) {
      case 'fetch': {
        if (!polygonId) {
          throw new Error('polygonId required');
        }

        // Get satellite imagery list
        const satelliteUrl = `${AGROMONITORING_API_URL}/image/search?start=${startUnix}&end=${endUnix}&polyid=${polygonId}&appid=${apiKey}`;
        console.log('Fetching satellite data from:', satelliteUrl);

        const satelliteResponse = await fetch(satelliteUrl);
        
        if (!satelliteResponse.ok) {
          const errorText = await satelliteResponse.text();
          console.error('Satellite fetch error:', errorText);
          throw new Error(`Failed to fetch satellite data: ${errorText}`);
        }

        const images = await satelliteResponse.json();
        console.log(`Found ${images.length} satellite images`);

        if (images.length === 0) {
          return new Response(JSON.stringify({
            success: true,
            message: 'No satellite images found for this period',
            data: []
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Process and get stats for each image (limit to last 5 for performance)
        const recentImages = images.slice(0, 5);
        const processedData = [];

        for (const image of recentImages) {
          try {
            // Get NDVI stats
            let ndviStats = null;
            if (image.stats?.ndvi) {
              const ndviResponse = await fetch(image.stats.ndvi);
              if (ndviResponse.ok) {
                ndviStats = await ndviResponse.json();
              }
            }

            // Get EVI stats
            let eviStats = null;
            if (image.stats?.evi) {
              const eviResponse = await fetch(image.stats.evi);
              if (eviResponse.ok) {
                eviStats = await eviResponse.json();
              }
            }

            const measurementDate = new Date(image.dt * 1000).toISOString().split('T')[0];

            const dataRecord = {
              polygon_id: polygonId,
              data_type: 'satellite',
              measurement_date: measurementDate,
              ndvi_min: ndviStats?.min,
              ndvi_max: ndviStats?.max,
              ndvi_mean: ndviStats?.mean,
              ndvi_median: ndviStats?.median,
              evi_min: eviStats?.min,
              evi_max: eviStats?.max,
              evi_mean: eviStats?.mean,
              evi_median: eviStats?.median,
              satellite_image_url: image.image?.ndvi || image.image?.truecolor,
              satellite_image_type: image.type,
              cloud_coverage: image.cl * 100, // Convert to percentage
              raw_data: { image, ndviStats, eviStats }
            };

            processedData.push(dataRecord);

            // Upsert to database
            const { error: upsertError } = await supabase
              .from('agromonitoring_data')
              .upsert(dataRecord, {
                onConflict: 'polygon_id,measurement_date,data_type'
              });

            if (upsertError) {
              console.error('Error upserting satellite data:', upsertError);
            }
          } catch (imgError) {
            console.error('Error processing image:', imgError);
          }
        }

        return new Response(JSON.stringify({
          success: true,
          data: processedData,
          totalImages: images.length,
          processedImages: processedData.length
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get-ndvi-history': {
        if (!polygonId) {
          throw new Error('polygonId required');
        }

        // Get NDVI history from API
        const historyUrl = `${AGROMONITORING_API_URL}/ndvi/history?start=${startUnix}&end=${endUnix}&polyid=${polygonId}&appid=${apiKey}`;
        console.log('Fetching NDVI history from:', historyUrl);

        const historyResponse = await fetch(historyUrl);

        if (!historyResponse.ok) {
          const errorText = await historyResponse.text();
          throw new Error(`Failed to fetch NDVI history: ${errorText}`);
        }

        const history = await historyResponse.json();
        console.log(`Found ${history.length} NDVI history entries`);

        return new Response(JSON.stringify({
          success: true,
          history
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'sync-all': {
        // Get all polygons and sync satellite data
        const { data: polygons, error: polygonsError } = await supabase
          .from('agromonitoring_polygons')
          .select('polygon_id, plot_id, name');

        if (polygonsError) {
          throw polygonsError;
        }

        console.log(`Syncing satellite data for ${polygons.length} polygons`);

        const results = [];
        for (const polygon of polygons) {
          try {
            // Recursive call to fetch for each polygon
            const fetchResult = await fetch(req.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'fetch',
                polygonId: polygon.polygon_id
              })
            });

            const result = await fetchResult.json();
            results.push({
              polygonId: polygon.polygon_id,
              plotName: polygon.name,
              ...result
            });
          } catch (syncError) {
            console.error(`Error syncing polygon ${polygon.polygon_id}:`, syncError);
            results.push({
              polygonId: polygon.polygon_id,
              success: false,
              error: syncError.message
            });
          }
        }

        return new Response(JSON.stringify({
          success: true,
          results
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Agromonitoring satellite error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
