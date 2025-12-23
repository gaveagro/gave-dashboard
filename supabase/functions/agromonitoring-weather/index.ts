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

    const { action, polygonId, lat, lng } = await req.json();
    console.log(`Agromonitoring weather action: ${action}`);

    switch (action) {
      case 'current': {
        if (!polygonId) {
          throw new Error('polygonId required');
        }

        // Get current weather for polygon
        const weatherUrl = `${AGROMONITORING_API_URL}/weather?polyid=${polygonId}&appid=${apiKey}`;
        console.log('Fetching current weather from:', weatherUrl);

        const weatherResponse = await fetch(weatherUrl);
        
        if (!weatherResponse.ok) {
          const errorText = await weatherResponse.text();
          throw new Error(`Failed to fetch weather: ${errorText}`);
        }

        const weather = await weatherResponse.json();
        console.log('Weather data received:', weather);

        const measurementDate = new Date().toISOString().split('T')[0];

        const weatherRecord = {
          polygon_id: polygonId,
          data_type: 'weather_current',
          measurement_date: measurementDate,
          temperature_celsius: weather.main?.temp ? weather.main.temp - 273.15 : null, // Convert Kelvin to Celsius
          humidity_percent: weather.main?.humidity,
          wind_speed_kmh: weather.wind?.speed ? weather.wind.speed * 3.6 : null, // Convert m/s to km/h
          pressure_hpa: weather.main?.pressure,
          precipitation_mm: weather.rain?.['1h'] || weather.rain?.['3h'] || 0,
          weather_description: weather.weather?.[0]?.description,
          cloud_coverage: weather.clouds?.all,
          raw_data: weather
        };

        // Upsert to database
        const { error: upsertError } = await supabase
          .from('agromonitoring_data')
          .upsert(weatherRecord, {
            onConflict: 'polygon_id,measurement_date,data_type'
          });

        if (upsertError) {
          console.error('Error upserting weather data:', upsertError);
        }

        return new Response(JSON.stringify({
          success: true,
          data: weatherRecord,
          raw: weather
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'forecast': {
        if (!polygonId) {
          throw new Error('polygonId required');
        }

        // Get 5-day forecast
        const forecastUrl = `${AGROMONITORING_API_URL}/weather/forecast?polyid=${polygonId}&appid=${apiKey}`;
        console.log('Fetching forecast from:', forecastUrl);

        const forecastResponse = await fetch(forecastUrl);
        
        if (!forecastResponse.ok) {
          const errorText = await forecastResponse.text();
          throw new Error(`Failed to fetch forecast: ${errorText}`);
        }

        const forecast = await forecastResponse.json();
        console.log(`Forecast entries: ${forecast.length}`);

        return new Response(JSON.stringify({
          success: true,
          forecast
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'soil': {
        if (!polygonId) {
          throw new Error('polygonId required');
        }

        // Get soil data
        const soilUrl = `${AGROMONITORING_API_URL}/soil?polyid=${polygonId}&appid=${apiKey}`;
        console.log('Fetching soil data from:', soilUrl);

        const soilResponse = await fetch(soilUrl);
        
        if (!soilResponse.ok) {
          const errorText = await soilResponse.text();
          throw new Error(`Failed to fetch soil data: ${errorText}`);
        }

        const soil = await soilResponse.json();
        console.log('Soil data received:', soil);

        const measurementDate = new Date().toISOString().split('T')[0];

        const soilRecord = {
          polygon_id: polygonId,
          data_type: 'soil',
          measurement_date: measurementDate,
          soil_temperature: soil.t0 ? soil.t0 - 273.15 : null, // Surface temp in Celsius
          soil_moisture: soil.moisture,
          raw_data: soil
        };

        // Upsert to database
        const { error: upsertError } = await supabase
          .from('agromonitoring_data')
          .upsert(soilRecord, {
            onConflict: 'polygon_id,measurement_date,data_type'
          });

        if (upsertError) {
          console.error('Error upserting soil data:', upsertError);
        }

        return new Response(JSON.stringify({
          success: true,
          data: soilRecord,
          raw: soil
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'sync-all': {
        // Get all polygons and sync weather/soil data
        const { data: polygons, error: polygonsError } = await supabase
          .from('agromonitoring_polygons')
          .select('polygon_id, plot_id, name');

        if (polygonsError) {
          throw polygonsError;
        }

        console.log(`Syncing weather data for ${polygons.length} polygons`);

        const results = [];
        for (const polygon of polygons) {
          try {
            // Fetch current weather
            const weatherResult = await fetch(`${AGROMONITORING_API_URL}/weather?polyid=${polygon.polygon_id}&appid=${apiKey}`);
            const weather = weatherResult.ok ? await weatherResult.json() : null;

            // Fetch soil data
            const soilResult = await fetch(`${AGROMONITORING_API_URL}/soil?polyid=${polygon.polygon_id}&appid=${apiKey}`);
            const soil = soilResult.ok ? await soilResult.json() : null;

            const measurementDate = new Date().toISOString().split('T')[0];

            if (weather) {
              await supabase
                .from('agromonitoring_data')
                .upsert({
                  polygon_id: polygon.polygon_id,
                  data_type: 'weather_current',
                  measurement_date: measurementDate,
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
              await supabase
                .from('agromonitoring_data')
                .upsert({
                  polygon_id: polygon.polygon_id,
                  data_type: 'soil',
                  measurement_date: measurementDate,
                  soil_temperature: soil.t0 ? soil.t0 - 273.15 : null,
                  soil_moisture: soil.moisture,
                  raw_data: soil
                }, { onConflict: 'polygon_id,measurement_date,data_type' });
            }

            results.push({
              polygonId: polygon.polygon_id,
              plotName: polygon.name,
              success: true,
              hasWeather: !!weather,
              hasSoil: !!soil
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
    console.error('Agromonitoring weather error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
