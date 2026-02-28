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

    switch (action) {
      case 'current': {
        if (!polygonId) throw new Error('polygonId required');
        const weatherUrl = `${AGROMONITORING_API_URL}/weather?polyid=${encodeURIComponent(polygonId)}&appid=${apiKey}`;
        const weatherResponse = await fetch(weatherUrl);
        if (!weatherResponse.ok) throw new Error(`Failed to fetch weather: ${await weatherResponse.text()}`);

        const weather = await weatherResponse.json();
        const measurementDate = new Date().toISOString().split('T')[0];
        const weatherRecord = {
          polygon_id: polygonId, data_type: 'weather_current', measurement_date: measurementDate,
          temperature_celsius: weather.main?.temp ? weather.main.temp - 273.15 : null,
          humidity_percent: weather.main?.humidity,
          wind_speed_kmh: weather.wind?.speed ? weather.wind.speed * 3.6 : null,
          pressure_hpa: weather.main?.pressure,
          precipitation_mm: weather.rain?.['1h'] || weather.rain?.['3h'] || 0,
          weather_description: weather.weather?.[0]?.description,
          cloud_coverage: weather.clouds?.all,
          raw_data: weather
        };

        await supabase.from('agromonitoring_data').upsert(weatherRecord, { onConflict: 'polygon_id,measurement_date,data_type' });

        return new Response(JSON.stringify({ success: true, data: weatherRecord }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'forecast': {
        if (!polygonId) throw new Error('polygonId required');
        const forecastUrl = `${AGROMONITORING_API_URL}/weather/forecast?polyid=${encodeURIComponent(polygonId)}&appid=${apiKey}`;
        const forecastResponse = await fetch(forecastUrl);
        if (!forecastResponse.ok) throw new Error(`Failed to fetch forecast: ${await forecastResponse.text()}`);

        return new Response(JSON.stringify({ success: true, forecast: await forecastResponse.json() }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'soil': {
        if (!polygonId) throw new Error('polygonId required');
        const soilUrl = `${AGROMONITORING_API_URL}/soil?polyid=${encodeURIComponent(polygonId)}&appid=${apiKey}`;
        const soilResponse = await fetch(soilUrl);
        if (!soilResponse.ok) throw new Error(`Failed to fetch soil data: ${await soilResponse.text()}`);

        const soil = await soilResponse.json();
        const measurementDate = new Date().toISOString().split('T')[0];
        const soilRecord = {
          polygon_id: polygonId, data_type: 'soil', measurement_date: measurementDate,
          soil_temperature: soil.t0 ? soil.t0 - 273.15 : null,
          soil_moisture: soil.moisture,
          raw_data: soil
        };

        await supabase.from('agromonitoring_data').upsert(soilRecord, { onConflict: 'polygon_id,measurement_date,data_type' });

        return new Response(JSON.stringify({ success: true, data: soilRecord }), {
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
            const weatherResult = await fetch(`${AGROMONITORING_API_URL}/weather?polyid=${encodeURIComponent(polygon.polygon_id)}&appid=${apiKey}`);
            const weather = weatherResult.ok ? await weatherResult.json() : null;

            const soilResult = await fetch(`${AGROMONITORING_API_URL}/soil?polyid=${encodeURIComponent(polygon.polygon_id)}&appid=${apiKey}`);
            const soil = soilResult.ok ? await soilResult.json() : null;

            const measurementDate = new Date().toISOString().split('T')[0];

            if (weather) {
              await supabase.from('agromonitoring_data').upsert({
                polygon_id: polygon.polygon_id, data_type: 'weather_current', measurement_date: measurementDate,
                temperature_celsius: weather.main?.temp ? weather.main.temp - 273.15 : null,
                humidity_percent: weather.main?.humidity,
                wind_speed_kmh: weather.wind?.speed ? weather.wind.speed * 3.6 : null,
                pressure_hpa: weather.main?.pressure,
                precipitation_mm: weather.rain?.['1h'] || 0,
                weather_description: weather.weather?.[0]?.description,
                cloud_coverage: weather.clouds?.all,
                raw_data: weather
              }, { onConflict: 'polygon_id,measurement_date,data_type' });
            }

            if (soil) {
              await supabase.from('agromonitoring_data').upsert({
                polygon_id: polygon.polygon_id, data_type: 'soil', measurement_date: measurementDate,
                soil_temperature: soil.t0 ? soil.t0 - 273.15 : null,
                soil_moisture: soil.moisture,
                raw_data: soil
              }, { onConflict: 'polygon_id,measurement_date,data_type' });
            }

            results.push({ polygonId: polygon.polygon_id, plotName: polygon.name, success: true });
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
    console.error('Agromonitoring weather error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
