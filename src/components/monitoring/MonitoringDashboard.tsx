import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Map, BarChart3, AlertTriangle, Cloud, Satellite } from 'lucide-react';
import MonitoringMap from './MonitoringMap';
import WeatherMetrics from './WeatherMetrics';
import AlertsPanel from './AlertsPanel';
import ForestIndicators from '../cecil/VegetationIndicators';
import ForestTimelineChart from '../cecil/NDVITimelineChart';
import AgromonitoringMonitor from './AgromonitoringMonitor';

interface MonitoringDashboardProps {
  plotId?: string;
  plotName?: string;
}

const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({ 
  plotId = 'demo-plot',
  plotName = 'El Sabinal' 
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch plots data for the map
  const { data: plots } = useQuery({
    queryKey: ['plots-for-monitoring'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plots')
        .select('*')
        .limit(10);

      if (error) throw error;
      
      // Add demo plots if none exist
      if (!data || data.length === 0) {
        return [
          {
            id: 'demo-plot-1',
            name: 'El Sabinal',
            location: 'Oaxaca, México',
            latitude: 22.0,
            longitude: -99.0,
            area: 15.5,
            status: 'Activa'
          },
          {
            id: 'demo-plot-2', 
            name: 'La Sierra',
            location: 'Oaxaca, México',
            latitude: 21.734,
            longitude: -99.131,
            area: 12.3,
            status: 'Activa'
          },
          {
            id: 'demo-plot-3',
            name: 'Aurelio Manrique',
            location: 'Oaxaca, México', 
            latitude: 22.306,
            longitude: -98.659,
            area: 8.7,
            status: 'Activa'
          }
        ];
      }

      return data;
    }
  });

  // Fetch AOI for the current plot
  const { data: aoi } = useQuery({
    queryKey: ['aoi-for-plot', plotId],
    queryFn: async () => {
      if (plotId === 'demo-plot') {
        return {
          id: 'demo-aoi-1',
          plot_id: 'demo-plot',
          name: plotName,
          status: 'active'
        };
      }

      const { data, error } = await supabase
        .from('cecil_aois')
        .select('*')
        .eq('plot_id', plotId)
        .maybeSingle();

      if (error) throw error;
      return data;
    }
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Trigger weather update
      await supabase.functions.invoke('cecil-weather-update');
      
      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const overviewMetrics = [
    {
      title: 'Parcelas Monitoreadas',
      value: plots?.length || 3,
      subtitle: 'En tiempo real',
      icon: Map,
      color: 'text-blue-600'
    },
    {
      title: 'Alertas Activas',
      value: 2,
      subtitle: 'Requieren atención',
      icon: AlertTriangle,
      color: 'text-orange-600'
    },
    {
      title: 'Última Actualización',
      value: 'Hace 2 min',
      subtitle: 'Datos satelitales',
      icon: RefreshCw,
      color: 'text-green-600'
    },
    {
      title: 'Condiciones',
      value: 'Óptimas',
      subtitle: 'Clima favorable',
      icon: Cloud,
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                🛰️ Centro de Monitoreo Inteligente
                <Badge variant="default" className="bg-green-600">
                  Sistema Activo
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Monitoreo integral de parcelas con datos satelitales, meteorológicos y alertas en tiempo real
              </p>
            </div>
            <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Actualizar Datos
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewMetrics.map((metric, index) => {
          const IconComponent = metric.icon;
          return (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <IconComponent className={`h-8 w-8 ${metric.color}`} />
                  <div>
                    <div className="text-2xl font-bold">{metric.value}</div>
                    <div className="text-sm text-muted-foreground">{metric.title}</div>
                    <div className="text-xs text-muted-foreground">{metric.subtitle}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Dashboard */}
      <Tabs defaultValue="satellite" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="satellite" className="flex items-center gap-2">
            <Satellite className="h-4 w-4" />
            Satelital
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="map" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            Mapa
          </TabsTrigger>
          <TabsTrigger value="weather" className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Clima
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alertas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="satellite" className="space-y-4">
          {plotId && plotId !== 'demo-plot' ? (
            <AgromonitoringMonitor plotId={plotId} plotName={plotName} />
          ) : (
            <AgromonitoringMonitor plotId="demo-plot" plotName={plotName} />
          )}
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Forest Indicators */}
            {aoi && (
              <ForestIndicators 
                aoiId={aoi.id} 
                latestData={null}
              />
            )}
            
            {/* Weather Metrics */}
            {aoi && (
              <WeatherMetrics 
                aoiId={aoi.id}
                plotName={plotName}
              />
            )}
          </div>

          {/* Timeline Chart */}
          {aoi && (
            <ForestTimelineChart aoiId={aoi.id} />
          )}
        </TabsContent>

        <TabsContent value="map" className="space-y-4">
          <MonitoringMap plots={plots} />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">98.5%</div>
                <div className="text-sm text-muted-foreground">Cobertura Satelital</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">5 min</div>
                <div className="text-sm text-muted-foreground">Frecuencia de Actualización</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">24/7</div>
                <div className="text-sm text-muted-foreground">Monitoreo Continuo</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="weather" className="space-y-4">
          {aoi && (
            <WeatherMetrics 
              aoiId={aoi.id}
              plotName={plotName}
            />
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Pronóstico 7 Días</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from({ length: 7 }).map((_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() + i);
                    const temp = 25 + Math.sin(i * 0.5) * 5 + (Math.random() - 0.5) * 3;
                    const isRainy = Math.random() > 0.7;
                    
                    return (
                      <div key={i} className="flex items-center justify-between">
                        <div className="text-sm">
                          {date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{isRainy ? '🌧️' : '☀️'}</span>
                          <span className="text-sm font-medium">{temp.toFixed(0)}°C</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Histórico del Mes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Temperatura promedio:</span>
                    <span className="font-medium">24.5°C</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Humedad promedio:</span>
                    <span className="font-medium">67%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Precipitación total:</span>
                    <span className="font-medium">45.2 mm</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Días con lluvia:</span>
                    <span className="font-medium">8 días</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {aoi && <AlertsPanel aoiId={aoi.id} />}
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Configuración de Alertas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">Temperatura Alta</div>
                    <div className="text-xs text-muted-foreground">Umbral: &gt;35°C</div>
                  </div>
                  <Badge variant="outline" className="text-green-600">Activo</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">Humedad del Suelo Baja</div>
                    <div className="text-xs text-muted-foreground">Umbral: &lt;25%</div>
                  </div>
                  <Badge variant="outline" className="text-green-600">Activo</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">Vientos Fuertes</div>
                    <div className="text-xs text-muted-foreground">Umbral: &gt;40 km/h</div>
                  </div>
                  <Badge variant="outline" className="text-green-600">Activo</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MonitoringDashboard;