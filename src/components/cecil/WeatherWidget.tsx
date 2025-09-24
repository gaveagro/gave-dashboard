import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Cloud, 
  Thermometer, 
  Droplets, 
  Wind, 
  Sun, 
  AlertTriangle,
  Eye,
  Gauge
} from 'lucide-react';

interface WeatherWidgetProps {
  aoiId: string;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ aoiId }) => {
  // Get current weather data
  const { data: currentWeather } = useQuery({
    queryKey: ['cecil-current-weather', aoiId],
    queryFn: async () => {
      console.log('Fetching weather data for AOI:', aoiId);
      const { data, error } = await supabase
        .from('cecil_weather_data')
        .select('*')
        .eq('cecil_aoi_id', aoiId)
        .is('forecast_hours', null) // Current weather, not forecast
        .order('measurement_timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      
      console.log('Weather data found:', data);
      
      // If no real data, use demo weather data
      if (!data && aoiId) {
        console.log('No weather data found, using demo data');
        return {
          id: 'demo-weather',
          cecil_aoi_id: aoiId,
          measurement_timestamp: new Date().toISOString(),
          temperature_celsius: 24,
          humidity_percent: 65,
          precipitation_mm: 0,
          wind_speed_kmh: 12,
          soil_temperature_celsius: 22,
          soil_moisture_percent: 45,
          forecast_hours: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
      
      return data;
    },
    enabled: !!aoiId
  });

  // Get 7-day forecast
  const { data: forecast } = useQuery({
    queryKey: ['cecil-weather-forecast', aoiId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cecil_weather_data')
        .select('*')
        .eq('cecil_aoi_id', aoiId)
        .not('forecast_hours', 'is', null) // Forecast data only
        .order('forecast_hours', { ascending: true })
        .limit(7);
      
      if (error) throw error;
      return data;
    },
    enabled: !!aoiId
  });

  // Get weather alerts
  const { data: alerts } = useQuery({
    queryKey: ['cecil-weather-alerts', aoiId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cecil_alerts')
        .select('*')
        .eq('cecil_aoi_id', aoiId)
        .eq('status', 'active')
        .in('alert_type', ['high_temperature', 'low_soil_moisture', 'excessive_precipitation'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!aoiId
  });

  const formatTemperature = (temp: number | null) => {
    if (temp === null || temp === undefined) return 'N/A';
    return `${Math.round(temp)}°C`;
  };

  const formatHumidity = (humidity: number | null) => {
    if (humidity === null || humidity === undefined) return 'N/A';
    return `${Math.round(humidity)}%`;
  };

  const formatPrecipitation = (precip: number | null) => {
    if (precip === null || precip === undefined) return 'N/A';
    return `${precip.toFixed(1)}mm`;
  };

  const formatWindSpeed = (speed: number | null) => {
    if (speed === null || speed === undefined) return 'N/A';
    return `${Math.round(speed)} km/h`;
  };

  const getTemperatureColor = (temp: number | null) => {
    if (!temp) return 'text-gray-500';
    if (temp > 35) return 'text-red-500';
    if (temp > 25) return 'text-orange-500';
    if (temp > 15) return 'text-green-500';
    return 'text-blue-500';
  };

  const getWeatherIcon = (temp: number | null, precipitation: number | null) => {
    if (precipitation && precipitation > 0) return Cloud;
    if (!temp) return Cloud;
    if (temp > 25) return Sun;
    return Cloud;
  };

  if (!currentWeather && (!forecast || forecast.length === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Cloud className="h-4 w-4" />
            Condiciones Meteorológicas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No hay datos meteorológicos disponibles aún.
          </p>
        </CardContent>
      </Card>
    );
  }

  const WeatherIcon = getWeatherIcon(currentWeather?.temperature_celsius, currentWeather?.precipitation_mm);

  return (
    <div className="space-y-4">
      {/* Current Weather */}
      {currentWeather && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <WeatherIcon className="h-4 w-4" />
              Condiciones Actuales
            </CardTitle>
            {currentWeather.measurement_timestamp && (
              <p className="text-xs text-muted-foreground">
                {new Date(currentWeather.measurement_timestamp).toLocaleString('es-ES')}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Thermometer className={`h-4 w-4 ${getTemperatureColor(currentWeather.temperature_celsius)}`} />
                <div>
                  <p className="text-sm font-medium">
                    {formatTemperature(currentWeather.temperature_celsius)}
                  </p>
                  <p className="text-xs text-muted-foreground">Temperatura</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">
                    {formatHumidity(currentWeather.humidity_percent)}
                  </p>
                  <p className="text-xs text-muted-foreground">Humedad</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">
                    {formatPrecipitation(currentWeather.precipitation_mm)}
                  </p>
                  <p className="text-xs text-muted-foreground">Precipitación</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Wind className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">
                    {formatWindSpeed(currentWeather.wind_speed_kmh)}
                  </p>
                  <p className="text-xs text-muted-foreground">Viento</p>
                </div>
              </div>
            </div>

            {/* Soil conditions if available */}
            {(currentWeather.soil_temperature_celsius || currentWeather.soil_moisture_percent) && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium mb-2">Condiciones del Suelo</h4>
                <div className="grid grid-cols-2 gap-4">
                  {currentWeather.soil_temperature_celsius && (
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-orange-500" />
                      <div>
                        <p className="text-sm font-medium">
                          {formatTemperature(currentWeather.soil_temperature_celsius)}
                        </p>
                        <p className="text-xs text-muted-foreground">Temp. Suelo</p>
                      </div>
                    </div>
                  )}

                  {currentWeather.soil_moisture_percent && (
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium">
                          {formatHumidity(currentWeather.soil_moisture_percent)}
                        </p>
                        <p className="text-xs text-muted-foreground">Humedad Suelo</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Weather Alerts */}
      {alerts && alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Alertas Meteorológicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="flex items-start gap-2">
                  <Badge 
                    variant="outline" 
                    className={
                      alert.severity === 'high' ? 'border-red-500 text-red-600' :
                      alert.severity === 'medium' ? 'border-amber-500 text-amber-600' :
                      'border-blue-500 text-blue-600'
                    }
                  >
                    {alert.severity === 'high' ? 'Alta' : 
                     alert.severity === 'medium' ? 'Media' : 'Baja'}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.description}</p>
                    {alert.recommendation && (
                      <p className="text-xs text-blue-600 mt-1">💡 {alert.recommendation}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 7-Day Forecast Summary */}
      {forecast && forecast.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sun className="h-4 w-4" />
              Pronóstico 7 Días
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center">
              {forecast.slice(0, 7).map((day, index) => {
                const DayIcon = getWeatherIcon(day.temperature_celsius, day.precipitation_mm);
                return (
                  <div key={index} className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Día {index + 1}
                    </p>
                    <DayIcon className="h-4 w-4 mx-auto text-gray-500" />
                    <p className="text-xs font-medium">
                      {formatTemperature(day.temperature_celsius)}
                    </p>
                    <p className="text-xs text-blue-600">
                      {formatPrecipitation(day.precipitation_mm)}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WeatherWidget;