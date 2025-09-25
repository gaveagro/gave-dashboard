import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Thermometer, Droplets, Wind, Gauge, Sun, Cloud, CloudRain } from 'lucide-react';

interface WeatherMetricsProps {
  aoiId?: string;
  plotName?: string;
}

const WeatherMetrics: React.FC<WeatherMetricsProps> = ({ aoiId, plotName = "Parcela" }) => {
  // Fetch latest weather data (with demo fallback)
  const { data: weatherData, isLoading } = useQuery({
    queryKey: ['weather-data', aoiId],
    queryFn: async () => {
      if (!aoiId) {
        // Return demo data for mockup
        return generateDemoWeatherData();
      }

      const { data, error } = await supabase
        .from('cecil_weather_data')
        .select('*')
        .eq('cecil_aoi_id', aoiId)
        .order('measurement_timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data || generateDemoWeatherData();
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const generateDemoWeatherData = () => {
    const now = new Date();
    const seasonalFactor = Math.sin((now.getMonth() / 12) * 2 * Math.PI);
    const dailyFactor = Math.sin((now.getHours() / 24) * 2 * Math.PI);
    
    return {
      id: 'demo-weather',
      measurement_timestamp: now.toISOString(),
      temperature_celsius: 24 + 8 * seasonalFactor + 4 * dailyFactor + (Math.random() - 0.5) * 3,
      humidity_percent: 65 + 15 * Math.sin(seasonalFactor + Math.PI/2) + (Math.random() - 0.5) * 10,
      soil_temperature_celsius: 22 + 6 * seasonalFactor + 2 * dailyFactor + (Math.random() - 0.5) * 2,
      soil_moisture_percent: 45 + 20 * Math.sin(seasonalFactor + Math.PI/4) + (Math.random() - 0.5) * 8,
      wind_speed_kmh: 8 + Math.random() * 12,
      wind_direction_degrees: Math.random() * 360,
      pressure_hpa: 1013 + (Math.random() - 0.5) * 20,
      solar_radiation_wm2: Math.max(0, 800 * Math.max(0, dailyFactor) + (Math.random() - 0.5) * 100),
      precipitation_mm: Math.random() > 0.8 ? Math.random() * 5 : 0,
      data_source: 'demo_station'
    };
  };

  const getTemperatureColor = (temp: number) => {
    if (temp < 10) return 'text-blue-600';
    if (temp < 20) return 'text-blue-400';
    if (temp < 30) return 'text-orange-500';
    return 'text-red-500';
  };

  const getHumidityColor = (humidity: number) => {
    if (humidity < 40) return 'text-red-500';
    if (humidity < 70) return 'text-yellow-500';
    return 'text-blue-500';
  };

  const getSoilMoistureColor = (moisture: number) => {
    if (moisture < 30) return 'text-red-500';
    if (moisture < 60) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getWindDirection = (degrees: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Métricas Meteorológicas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-6 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!weatherData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Métricas Meteorológicas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No hay datos meteorológicos disponibles.
          </p>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      label: 'Temperatura',
      value: `${weatherData.temperature_celsius?.toFixed(1)}°C`,
      icon: Thermometer,
      color: getTemperatureColor(weatherData.temperature_celsius || 0),
      description: 'Temperatura del aire'
    },
    {
      label: 'Humedad',
      value: `${weatherData.humidity_percent?.toFixed(0)}%`,
      icon: Droplets,
      color: getHumidityColor(weatherData.humidity_percent || 0),
      description: 'Humedad relativa'
    },
    {
      label: 'Temp. Suelo',
      value: `${weatherData.soil_temperature_celsius?.toFixed(1)}°C`,
      icon: Thermometer,
      color: getTemperatureColor(weatherData.soil_temperature_celsius || 0),
      description: 'Temperatura del suelo'
    },
    {
      label: 'Humedad Suelo',
      value: `${weatherData.soil_moisture_percent?.toFixed(0)}%`,
      icon: Droplets,
      color: getSoilMoistureColor(weatherData.soil_moisture_percent || 0),
      description: 'Humedad del suelo'
    },
    {
      label: 'Viento',
      value: `${weatherData.wind_speed_kmh?.toFixed(1)} km/h`,
      subtitle: getWindDirection(weatherData.wind_direction_degrees || 0),
      icon: Wind,
      color: 'text-gray-600',
      description: 'Velocidad y dirección'
    },
    {
      label: 'Presión',
      value: `${weatherData.pressure_hpa?.toFixed(0)} hPa`,
      icon: Gauge,
      color: 'text-purple-600',
      description: 'Presión atmosférica'
    },
    {
      label: 'Radiación Solar',
      value: `${weatherData.solar_radiation_wm2?.toFixed(0)} W/m²`,
      icon: Sun,
      color: 'text-yellow-500',
      description: 'Radiación solar'
    },
    {
      label: 'Precipitación',
      value: `${weatherData.precipitation_mm?.toFixed(1)} mm`,
      icon: CloudRain,
      color: 'text-blue-600',
      description: 'Lluvia última hora'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Métricas Meteorológicas - {plotName}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-green-600 border-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
              En Tiempo Real
            </Badge>
          </div>
        </div>
        {weatherData.measurement_timestamp && (
          <p className="text-xs text-muted-foreground">
            Última actualización: {new Date(weatherData.measurement_timestamp).toLocaleString('es-ES')}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric, index) => {
            const IconComponent = metric.icon;
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center gap-2">
                  <IconComponent className={`h-4 w-4 ${metric.color}`} />
                  <span className="text-sm font-medium">{metric.label}</span>
                </div>
                <div className="space-y-1">
                  <div className={`text-lg font-bold ${metric.color}`}>
                    {metric.value}
                  </div>
                  {metric.subtitle && (
                    <div className="text-xs text-muted-foreground">
                      {metric.subtitle}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {metric.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Weather summary */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm">
            <Cloud className="h-4 w-4 text-gray-500" />
            <span className="font-medium">Condiciones actuales:</span>
            <span className="text-muted-foreground">
              {weatherData.temperature_celsius && weatherData.temperature_celsius > 25 ? 'Cálido' : 'Templado'} • 
              {weatherData.humidity_percent && weatherData.humidity_percent > 70 ? ' Húmedo' : ' Seco'} • 
              {weatherData.wind_speed_kmh && weatherData.wind_speed_kmh > 15 ? ' Ventoso' : ' Viento ligero'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeatherMetrics;