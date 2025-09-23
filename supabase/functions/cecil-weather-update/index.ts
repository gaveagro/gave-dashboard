import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CecilWeatherData {
  temperature_celsius?: number;
  humidity_percent?: number;
  precipitation_mm?: number;
  wind_speed_kmh?: number;
  wind_direction_degrees?: number;
  pressure_hpa?: number;
  solar_radiation_wm2?: number;
  soil_temperature_celsius?: number;
  soil_moisture_percent?: number;
  measurement_timestamp: string;
  forecast_hours?: number;
  data_source: string;
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

    const { action, aoiId } = await req.json();

    if (action === 'update_weather') {
      let aoisToUpdate = [];

      if (aoiId) {
        // Update specific AOI
        const { data: aoi } = await supabase
          .from('cecil_aois')
          .select('*')
          .eq('id', aoiId)
          .single();
        
        if (aoi) aoisToUpdate.push(aoi);
      } else {
        // Update all active AOIs
        const { data: aois } = await supabase
          .from('cecil_aois')
          .select('*')
          .eq('status', 'active');
        
        aoisToUpdate = aois || [];
      }

      let updatedCount = 0;
      let errorCount = 0;
      let alertsGenerated = 0;

      for (const aoi of aoisToUpdate) {
        try {
          console.log(`Updating weather for AOI: ${aoi.id}`);

          // Get current weather from Cecil
          const weatherResponse = await fetch(`https://api.cecil.ag/v1/aois/${aoi.cecil_aoi_id}/weather/current`, {
            headers: {
              'Authorization': `Bearer ${cecilApiKey}`,
            },
          });

          if (!weatherResponse.ok) {
            console.error(`Failed to get weather for AOI ${aoi.id}`);
            errorCount++;
            continue;
          }

          const currentWeather: CecilWeatherData = await weatherResponse.json();
          console.log(`Got current weather for AOI ${aoi.id}:`, currentWeather);

          // Store current weather
          const { error: weatherError } = await supabase
            .from('cecil_weather_data')
            .insert({
              cecil_aoi_id: aoi.id,
              temperature_celsius: currentWeather.temperature_celsius,
              humidity_percent: currentWeather.humidity_percent,
              precipitation_mm: currentWeather.precipitation_mm,
              wind_speed_kmh: currentWeather.wind_speed_kmh,
              wind_direction_degrees: currentWeather.wind_direction_degrees,
              pressure_hpa: currentWeather.pressure_hpa,
              solar_radiation_wm2: currentWeather.solar_radiation_wm2,
              soil_temperature_celsius: currentWeather.soil_temperature_celsius,
              soil_moisture_percent: currentWeather.soil_moisture_percent,
              measurement_timestamp: currentWeather.measurement_timestamp,
              data_source: currentWeather.data_source || 'cecil-api'
            });

          if (weatherError) {
            console.error(`Error storing current weather for AOI ${aoi.id}:`, weatherError);
            errorCount++;
            continue;
          }

          // Get 7-day forecast
          const forecastResponse = await fetch(`https://api.cecil.ag/v1/aois/${aoi.cecil_aoi_id}/weather/forecast?days=7`, {
            headers: {
              'Authorization': `Bearer ${cecilApiKey}`,
            },
          });

          if (forecastResponse.ok) {
            const forecastData: CecilWeatherData[] = await forecastResponse.json();
            console.log(`Got ${forecastData.length} forecast points for AOI ${aoi.id}`);

            // Store forecast data
            for (const forecast of forecastData) {
              await supabase
                .from('cecil_weather_data')
                .insert({
                  cecil_aoi_id: aoi.id,
                  temperature_celsius: forecast.temperature_celsius,
                  humidity_percent: forecast.humidity_percent,
                  precipitation_mm: forecast.precipitation_mm,
                  wind_speed_kmh: forecast.wind_speed_kmh,
                  wind_direction_degrees: forecast.wind_direction_degrees,
                  pressure_hpa: forecast.pressure_hpa,
                  solar_radiation_wm2: forecast.solar_radiation_wm2,
                  soil_temperature_celsius: forecast.soil_temperature_celsius,
                  soil_moisture_percent: forecast.soil_moisture_percent,
                  measurement_timestamp: forecast.measurement_timestamp,
                  forecast_hours: forecast.forecast_hours,
                  data_source: forecast.data_source || 'cecil-forecast'
                });
            }
          }

          // Generate weather alerts based on thresholds
          const alerts = [];

          // High temperature alert
          if (currentWeather.temperature_celsius && currentWeather.temperature_celsius > 35) {
            alerts.push({
              cecil_aoi_id: aoi.id,
              alert_type: 'high_temperature',
              title: 'Temperatura Alta',
              description: `Temperatura actual de ${currentWeather.temperature_celsius}°C excede el umbral recomendado`,
              severity: currentWeather.temperature_celsius > 40 ? 'high' : 'medium',
              threshold_value: 35,
              current_value: currentWeather.temperature_celsius,
              recommendation: 'Considere aumentar la frecuencia de riego y proporcionar sombra adicional si es posible.'
            });
          }

          // Low soil moisture alert
          if (currentWeather.soil_moisture_percent && currentWeather.soil_moisture_percent < 30) {
            alerts.push({
              cecil_aoi_id: aoi.id,
              alert_type: 'low_soil_moisture',
              title: 'Humedad de Suelo Baja',
              description: `Humedad del suelo actual de ${currentWeather.soil_moisture_percent}% está por debajo del umbral`,
              severity: currentWeather.soil_moisture_percent < 20 ? 'high' : 'medium',
              threshold_value: 30,
              current_value: currentWeather.soil_moisture_percent,
              recommendation: 'Se recomienda riego inmediato para mantener la salud de las plantas.'
            });
          }

          // Heavy precipitation alert
          if (currentWeather.precipitation_mm && currentWeather.precipitation_mm > 50) {
            alerts.push({
              cecil_aoi_id: aoi.id,
              alert_type: 'heavy_precipitation',
              title: 'Precipitación Intensa',
              description: `Precipitación actual de ${currentWeather.precipitation_mm}mm puede causar encharcamiento`,
              severity: currentWeather.precipitation_mm > 100 ? 'high' : 'medium',
              threshold_value: 50,
              current_value: currentWeather.precipitation_mm,
              recommendation: 'Verifique el drenaje del terreno y considere medidas preventivas contra erosión.'
            });
          }

          // Store alerts
          for (const alert of alerts) {
            const { error: alertError } = await supabase
              .from('cecil_alerts')
              .insert(alert);

            if (!alertError) {
              alertsGenerated++;
            }
          }

          updatedCount++;
          console.log(`Successfully updated weather for AOI ${aoi.id}, generated ${alerts.length} alerts`);

        } catch (error) {
          console.error(`Error updating weather for AOI ${aoi.id}:`, error);
          errorCount++;
        }
      }

      return new Response(JSON.stringify({ 
        success: true,
        updated: updatedCount,
        errors: errorCount,
        alerts_generated: alertsGenerated,
        total: aoisToUpdate.length,
        message: `Updated weather for ${updatedCount} AOIs, generated ${alertsGenerated} alerts`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in cecil-weather-update:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});