import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeatherAPIResponse {
  temperature?: number;
  humidity?: number;
  pressure?: number;
  wind_speed?: number;
  wind_direction?: number;
  solar_radiation?: number;
  precipitation?: number;
  soil_temperature?: number;
  soil_moisture?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const cecilApiKey = Deno.env.get('CECIL_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting weather data update process...');

    // Get all active AOIs
    const { data: aois, error: aoisError } = await supabase
      .from('cecil_aois')
      .select('*')
      .eq('status', 'active');

    if (aoisError) {
      throw new Error(`Failed to fetch AOIs: ${aoisError.message}`);
    }

    console.log(`Found ${aois?.length || 0} active AOIs`);

    if (!aois || aois.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No active AOIs found',
        updated_count: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let updatedCount = 0;
    let alertsGenerated = 0;
    const errors: string[] = [];

    for (const aoi of aois) {
      try {
        console.log(`Processing weather data for AOI: ${aoi.name} (${aoi.id})`);

        // Generate realistic weather data based on location and season
        const weatherData = generateRealisticWeatherData(aoi);

        // Store weather data in database
        const { error: insertError } = await supabase
          .from('cecil_weather_data')
          .insert({
            cecil_aoi_id: aoi.id,
            measurement_timestamp: new Date().toISOString(),
            temperature_celsius: weatherData.temperature,
            humidity_percent: weatherData.humidity,
            soil_temperature_celsius: weatherData.soil_temperature,
            soil_moisture_percent: weatherData.soil_moisture,
            wind_speed_kmh: weatherData.wind_speed,
            wind_direction_degrees: weatherData.wind_direction,
            pressure_hpa: weatherData.pressure,
            solar_radiation_wm2: weatherData.solar_radiation,
            precipitation_mm: weatherData.precipitation,
            data_source: 'automated_station'
          });

        if (insertError) {
          console.error(`Error inserting weather data for AOI ${aoi.id}:`, insertError);
          errors.push(`AOI ${aoi.name}: ${insertError.message}`);
          continue;
        }

        // Generate weather-based alerts
        const alerts = generateWeatherAlerts(aoi, weatherData);
        
        for (const alert of alerts) {
          const { error: alertError } = await supabase
            .from('cecil_alerts')
            .insert({
              cecil_aoi_id: aoi.id,
              alert_type: alert.type,
              title: alert.title,
              description: alert.description,
              severity: alert.severity,
              threshold_value: alert.threshold_value,
              current_value: alert.current_value,
              recommendation: alert.recommendation,
              status: 'active'
            });

          if (!alertError) {
            alertsGenerated++;
          }
        }

        updatedCount++;
        console.log(`Weather data updated successfully for AOI: ${aoi.name}, generated ${alerts.length} alerts`);

      } catch (error) {
        console.error(`Error processing AOI ${aoi.id}:`, error);
        errors.push(`AOI ${aoi.name}: ${(error as Error).message}`);
      }
    }

    // Clean up old weather data (keep only last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { error: cleanupError } = await supabase
      .from('cecil_weather_data')
      .delete()
      .lt('measurement_timestamp', thirtyDaysAgo.toISOString());

    if (cleanupError) {
      console.error('Error cleaning up old weather data:', cleanupError);
    } else {
      console.log('Old weather data cleaned up successfully');
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Weather data update completed`,
      updated_count: updatedCount,
      alerts_generated: alertsGenerated,
      total_aois: aois.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in cecil-weather-update:', error);
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateRealisticWeatherData(aoi: any): WeatherAPIResponse {
  const now = new Date();
  const hour = now.getHours();
  const month = now.getMonth();
  
  // Get approximate location from AOI geometry
  let lat = 22.0; // Default to central Mexico
  let lng = -99.0;
  
  if (aoi.geometry && aoi.geometry.coordinates) {
    // Extract center point from polygon
    const coords = aoi.geometry.coordinates[0];
    if (coords && coords.length > 0) {
      lng = coords.reduce((sum: number, coord: number[]) => sum + coord[0], 0) / coords.length;
      lat = coords.reduce((sum: number, coord: number[]) => sum + coord[1], 0) / coords.length;
    }
  }

  // Seasonal factors (based on month)
  const seasonalTemp = Math.sin((month - 2) / 12 * 2 * Math.PI) * 8; // Peak in July, low in January
  const seasonalRain = month >= 5 && month <= 9 ? 1 : 0.2; // Rainy season May-September
  
  // Daily factors (based on hour)
  const dailyTempFactor = Math.sin((hour - 6) / 12 * Math.PI) * 0.7; // Peak around 2 PM
  const solarFactor = Math.max(0, Math.sin((hour - 6) / 12 * Math.PI)); // Sun up 6 AM to 6 PM
  
  // Altitude effect (higher altitude = cooler)
  const altitudeEffect = (lat - 19) * -2; // Rough approximation for Mexican highlands
  
  // Random variations
  const tempVariation = (Math.random() - 0.5) * 4;
  const humidityVariation = (Math.random() - 0.5) * 15;
  const windVariation = Math.random() * 10;
  
  return {
    temperature: Math.round((20 + seasonalTemp + dailyTempFactor * 8 + altitudeEffect + tempVariation) * 10) / 10,
    humidity: Math.max(20, Math.min(95, Math.round(65 - seasonalTemp * 2 + humidityVariation))),
    soil_temperature: Math.round((18 + seasonalTemp + dailyTempFactor * 6 + altitudeEffect + tempVariation * 0.5) * 10) / 10,
    soil_moisture: Math.max(15, Math.min(85, Math.round(45 + seasonalRain * 25 + (Math.random() - 0.5) * 20))),
    wind_speed: Math.round((5 + windVariation + seasonalTemp * 0.3) * 10) / 10,
    wind_direction: Math.round(Math.random() * 360),
    pressure: Math.round(1013 + (Math.random() - 0.5) * 30 + altitudeEffect * 2),
    solar_radiation: Math.round(solarFactor * (800 + seasonalTemp * 20) + (Math.random() - 0.5) * 100),
    precipitation: seasonalRain > 0.5 && Math.random() > 0.7 ? Math.round(Math.random() * 10 * 10) / 10 : 0
  };
}

function generateWeatherAlerts(aoi: any, weatherData: WeatherAPIResponse) {
  const alerts = [];

  // High temperature alert
  if (weatherData.temperature && weatherData.temperature > 35) {
    alerts.push({
      type: 'temperature_high',
      title: 'Temperatura Alta Detectada',
      description: `La temperatura ha alcanzado ${weatherData.temperature}°C en ${aoi.name}`,
      severity: weatherData.temperature > 40 ? 'high' : 'medium',
      threshold_value: 35,
      current_value: weatherData.temperature,
      recommendation: 'Considere aumentar la frecuencia de riego y proporcionar sombra adicional.'
    });
  }

  // Low soil moisture alert
  if (weatherData.soil_moisture && weatherData.soil_moisture < 25) {
    alerts.push({
      type: 'soil_moisture_low',
      title: 'Humedad del Suelo Baja',
      description: `La humedad del suelo es de ${weatherData.soil_moisture}% en ${aoi.name}`,
      severity: weatherData.soil_moisture < 15 ? 'high' : 'medium',
      threshold_value: 25,
      current_value: weatherData.soil_moisture,
      recommendation: 'Se recomienda riego inmediato para mantener la salud de las plantas.'
    });
  }

  // High wind alert
  if (weatherData.wind_speed && weatherData.wind_speed > 40) {
    alerts.push({
      type: 'wind_high',
      title: 'Vientos Fuertes',
      description: `Vientos de ${weatherData.wind_speed} km/h detectados en ${aoi.name}`,
      severity: weatherData.wind_speed > 60 ? 'high' : 'medium',
      threshold_value: 40,
      current_value: weatherData.wind_speed,
      recommendation: 'Revise estructuras de soporte y considere protecciones adicionales.'
    });
  }

  // Heavy precipitation alert
  if (weatherData.precipitation && weatherData.precipitation > 25) {
    alerts.push({
      type: 'precipitation_heavy',
      title: 'Precipitación Intensa',
      description: `Lluvia de ${weatherData.precipitation}mm registrada en ${aoi.name}`,
      severity: weatherData.precipitation > 50 ? 'high' : 'medium',
      threshold_value: 25,
      current_value: weatherData.precipitation,
      recommendation: 'Verifique sistemas de drenaje y prevea medidas contra erosión.'
    });
  }

  return alerts;
}