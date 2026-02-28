import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AGROMONITORING_API_URL = 'https://api.agromonitoring.com/agro/1.0';

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

    const apiKey = Deno.env.get('AGROMONITORING_API_KEY');
    if (!apiKey) throw new Error('AGROMONITORING_API_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const action = typeof body.action === 'string' ? body.action : '';
    const polygonId = typeof body.polygonId === 'string' ? body.polygonId : '';

    const end = body.endDate ? new Date(body.endDate) : new Date();
    const start = body.startDate ? new Date(body.startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startUnix = Math.floor(start.getTime() / 1000);
    const endUnix = Math.floor(end.getTime() / 1000);

    switch (action) {
      case 'fetch': {
        if (!polygonId) throw new Error('polygonId required');

        const satelliteUrl = `${AGROMONITORING_API_URL}/image/search?start=${startUnix}&end=${endUnix}&polyid=${encodeURIComponent(polygonId)}&appid=${apiKey}`;
        const satelliteResponse = await fetch(satelliteUrl);
        if (!satelliteResponse.ok) throw new Error(`Failed to fetch satellite data: ${await satelliteResponse.text()}`);

        const images = await satelliteResponse.json();
        if (images.length === 0) {
          return new Response(JSON.stringify({ success: true, message: 'No satellite images found', data: [] }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const recentImages = images.slice(0, 5);
        const processedData = [];

        for (const image of recentImages) {
          try {
            let ndviStats = null;
            if (image.stats?.ndvi) {
              const ndviResponse = await fetch(image.stats.ndvi);
              if (ndviResponse.ok) ndviStats = await ndviResponse.json();
            }

            let eviStats = null;
            if (image.stats?.evi) {
              const eviResponse = await fetch(image.stats.evi);
              if (eviResponse.ok) eviStats = await eviResponse.json();
            }

            const measurementDate = new Date(image.dt * 1000).toISOString().split('T')[0];
            const dataRecord = {
              polygon_id: polygonId,
              data_type: 'satellite',
              measurement_date: measurementDate,
              ndvi_min: ndviStats?.min, ndvi_max: ndviStats?.max, ndvi_mean: ndviStats?.mean, ndvi_median: ndviStats?.median,
              evi_min: eviStats?.min, evi_max: eviStats?.max, evi_mean: eviStats?.mean, evi_median: eviStats?.median,
              satellite_image_url: image.image?.ndvi || image.image?.truecolor,
              satellite_image_type: image.type,
              cloud_coverage: image.cl * 100,
              raw_data: { image, ndviStats, eviStats }
            };

            processedData.push(dataRecord);
            await supabase.from('agromonitoring_data').upsert(dataRecord, { onConflict: 'polygon_id,measurement_date,data_type' });
          } catch (imgError) {
            console.error('Error processing image:', imgError);
          }
        }

        return new Response(JSON.stringify({ success: true, data: processedData, totalImages: images.length }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get-ndvi-history': {
        if (!polygonId) throw new Error('polygonId required');
        const historyUrl = `${AGROMONITORING_API_URL}/ndvi/history?start=${startUnix}&end=${endUnix}&polyid=${encodeURIComponent(polygonId)}&appid=${apiKey}`;
        const historyResponse = await fetch(historyUrl);
        if (!historyResponse.ok) throw new Error(`Failed to fetch NDVI history: ${await historyResponse.text()}`);

        return new Response(JSON.stringify({ success: true, history: await historyResponse.json() }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'sync-all': {
        // Verify admin for sync-all
        const userId = claimsData.claims.sub;
        const { data: prof } = await supabaseAuth.from('profiles').select('role').eq('user_id', userId).single();
        if (prof?.role !== 'admin') {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data: polygons, error: polygonsError } = await supabase
          .from('agromonitoring_polygons').select('polygon_id, plot_id, name');
        if (polygonsError) throw polygonsError;

        const results = [];
        for (const polygon of polygons) {
          try {
            const fetchResult = await fetch(req.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
              body: JSON.stringify({ action: 'fetch', polygonId: polygon.polygon_id })
            });
            results.push({ polygonId: polygon.polygon_id, plotName: polygon.name, ...await fetchResult.json() });
          } catch (syncError: any) {
            results.push({ polygonId: polygon.polygon_id, success: false, error: syncError.message });
          }
        }

        return new Response(JSON.stringify({ success: true, results }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error: any) {
    console.error('Agromonitoring satellite error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
