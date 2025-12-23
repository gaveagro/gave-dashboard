import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Thermometer, Droplets, Wind, Gauge, Cloud, CloudRain } from 'lucide-react';
import { AgromonitoringData } from '@/lib/agromonitoring';
import { Skeleton } from '@/components/ui/skeleton';

interface AgromonitoringWeatherProps {
  polygonId: string;
  weatherData: AgromonitoringData | null;
  isLoading: boolean;
}

const AgromonitoringWeather: React.FC<AgromonitoringWeatherProps> = ({
  polygonId,
  weatherData,
  isLoading
}) => {
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Datos Meteorológicos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Generate demo data if no real data
  const now = new Date();
  const seasonalFactor = Math.sin((now.getMonth() / 12) * 2 * Math.PI);
  const dailyFactor = Math.sin((now.getHours() / 24) * 2 * Math.PI);

  const demoData = !weatherData ? {
    temperature_celsius: 24 + 8 * seasonalFactor + 4 * dailyFactor + (Math.random() - 0.5) * 3,
    humidity_percent: 65 + 15 * Math.sin(seasonalFactor + Math.PI/2) + (Math.random() - 0.5) * 10,
    wind_speed_kmh: 8 + Math.random() * 12,
    pressure_hpa: 1013 + (Math.random() - 0.5) * 20,
    precipitation_mm: Math.random() > 0.8 ? Math.random() * 5 : 0,
    soil_temperature: 22 + 6 * seasonalFactor + 2 * dailyFactor + (Math.random() - 0.5) * 2,
    soil_moisture: 45 + 20 * Math.sin(seasonalFactor + Math.PI/4) + (Math.random() - 0.5) * 8,
    cloud_coverage: Math.random() * 50,
    weather_description: 'Parcialmente nublado',
    measurement_date: new Date().toISOString().split('T')[0]
  } : null;

  const data = weatherData || demoData;
  const isDemo = !weatherData;

  const metrics = [
    {
      label: 'Temperatura',
      value: data?.temperature_celsius?.toFixed(1),
      unit: '°C',
      icon: Thermometer,
      color: getTemperatureColor(data?.temperature_celsius || 0)
    },
    {
      label: 'Humedad',
      value: data?.humidity_percent?.toFixed(0),
      unit: '%',
      icon: Droplets,
      color: getHumidityColor(data?.humidity_percent || 0)
    },
    {
      label: 'Viento',
      value: data?.wind_speed_kmh?.toFixed(1),
      unit: 'km/h',
      icon: Wind,
      color: 'text-gray-600'
    },
    {
      label: 'Presión',
      value: data?.pressure_hpa?.toFixed(0),
      unit: 'hPa',
      icon: Gauge,
      color: 'text-purple-600'
    },
    {
      label: 'Precipitación',
      value: data?.precipitation_mm?.toFixed(1),
      unit: 'mm',
      icon: CloudRain,
      color: 'text-blue-600'
    },
    {
      label: 'Nubes',
      value: data?.cloud_coverage?.toFixed(0),
      unit: '%',
      icon: Cloud,
      color: 'text-gray-500'
    }
  ];

  const soilMetrics = [
    {
      label: 'Temp. Suelo',
      value: data?.soil_temperature?.toFixed(1),
      unit: '°C',
      icon: Thermometer,
      color: getTemperatureColor(data?.soil_temperature || 0)
    },
    {
      label: 'Humedad Suelo',
      value: data?.soil_moisture?.toFixed(0),
      unit: '%',
      icon: Droplets,
      color: getHumidityColor(data?.soil_moisture || 0)
    }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Datos Meteorológicos Agromonitoring</CardTitle>
          <div className="flex items-center gap-2">
            {isDemo && (
              <Badge variant="secondary" className="text-xs">
                Demo
              </Badge>
            )}
            {!isDemo && (
              <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                API Activa
              </Badge>
            )}
          </div>
        </div>
        {data?.measurement_date && (
          <p className="text-xs text-muted-foreground">
            Última actualización: {new Date(data.measurement_date).toLocaleDateString('es-ES')}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {/* Weather description */}
        {data?.weather_description && (
          <div className="mb-4 p-2 bg-muted/50 rounded-lg">
            <p className="text-sm text-center capitalize">{data.weather_description}</p>
          </div>
        )}

        {/* Main weather metrics */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
          {metrics.map((metric) => {
            const IconComponent = metric.icon;
            return (
              <div key={metric.label} className="text-center space-y-1">
                <IconComponent className={`h-5 w-5 mx-auto ${metric.color}`} />
                <div className={`text-lg font-bold ${metric.color}`}>
                  {metric.value || 'N/A'}
                  <span className="text-xs font-normal">{metric.unit}</span>
                </div>
                <p className="text-xs text-muted-foreground">{metric.label}</p>
              </div>
            );
          })}
        </div>

        {/* Soil metrics */}
        <div className="pt-4 border-t">
          <p className="text-xs font-medium mb-3">Datos del Suelo</p>
          <div className="grid grid-cols-2 gap-4">
            {soilMetrics.map((metric) => {
              const IconComponent = metric.icon;
              return (
                <div key={metric.label} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                  <IconComponent className={`h-5 w-5 ${metric.color}`} />
                  <div>
                    <div className={`text-lg font-bold ${metric.color}`}>
                      {metric.value || 'N/A'}
                      <span className="text-xs font-normal">{metric.unit}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{metric.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AgromonitoringWeather;
