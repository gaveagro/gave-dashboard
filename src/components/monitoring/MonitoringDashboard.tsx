import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Map, BarChart3, AlertTriangle, Cloud, Satellite } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
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
  const { t, language } = useLanguage();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch plots data for the map
  const { data: plots } = useQuery({
    queryKey: ['plots-for-monitoring'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plots')
        .select('id, name, location, latitude, longitude, area, status')
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 1000
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
      await supabase.functions.invoke('agromonitoring-weather', {
        body: { action: 'sync-all' }
      });
      window.location.reload();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const overviewMetrics = [
    {
      title: t('monitoring.monitoredPlots'),
      value: plots?.length || 0,
      subtitle: t('monitoring.realTime'),
      icon: Map,
      color: 'text-blue-600'
    },
    {
      title: t('monitoring.activeAlerts'),
      value: 2,
      subtitle: t('monitoring.needAttention'),
      icon: AlertTriangle,
      color: 'text-orange-600'
    },
    {
      title: t('monitoring.lastUpdateLabel'),
      value: language === 'en' ? '2 min ago' : 'Hace 2 min',
      subtitle: t('monitoring.satelliteData'),
      icon: RefreshCw,
      color: 'text-green-600'
    },
    {
      title: t('monitoring.conditions'),
      value: t('monitoring.optimal'),
      subtitle: t('monitoring.favorableWeather'),
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
                🛰️ {t('monitoring.monitoringCenter')}
                <Badge variant="default" className="bg-green-600">
                  {t('monitoring.systemActive')}
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {t('monitoring.integratedDescription')}
              </p>
            </div>
            <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {t('monitoring.updateData')}
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
            {t('monitoring.satellite')}
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {t('monitoring.summary')}
          </TabsTrigger>
          <TabsTrigger value="map" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            {t('monitoring.map')}
          </TabsTrigger>
          <TabsTrigger value="weather" className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            {t('monitoring.weather')}
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {t('monitoring.alerts')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="satellite" className="space-y-4">
          <AgromonitoringMonitor plotName={plotName} />
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {aoi && (
              <ForestIndicators 
                aoiId={aoi.id} 
                latestData={null}
              />
            )}
            {aoi && (
              <WeatherMetrics 
                aoiId={aoi.id}
                plotName={plotName}
              />
            )}
          </div>
          {aoi && (
            <ForestTimelineChart aoiId={aoi.id} />
          )}
        </TabsContent>

        <TabsContent value="map" className="space-y-4">
          <MonitoringMap plots={plots} />
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
                <CardTitle className="text-sm">{t('monitoring.forecast7Days')}</CardTitle>
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
                          {date.toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', { weekday: 'short', day: 'numeric' })}
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
                <CardTitle className="text-sm">{t('monitoring.monthHistory')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('monitoring.avgTemperature')}:</span>
                    <span className="font-medium">24.5°C</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('monitoring.avgHumidity')}:</span>
                    <span className="font-medium">67%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('monitoring.totalPrecipitation')}:</span>
                    <span className="font-medium">45.2 mm</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('monitoring.rainyDays')}:</span>
                    <span className="font-medium">8 {t('monitoring.days')}</span>
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
              <CardTitle className="text-sm">{t('monitoring.alertConfig')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{t('monitoring.highTemperature')}</div>
                    <div className="text-xs text-muted-foreground">{t('monitoring.threshold')}: &gt;35°C</div>
                  </div>
                  <Badge variant="outline" className="text-green-600">{t('monitoring.active')}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{t('monitoring.lowSoilHumidity')}</div>
                    <div className="text-xs text-muted-foreground">{t('monitoring.threshold')}: &lt;25%</div>
                  </div>
                  <Badge variant="outline" className="text-green-600">{t('monitoring.active')}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{t('monitoring.strongWinds')}</div>
                    <div className="text-xs text-muted-foreground">{t('monitoring.threshold')}: &gt;40 km/h</div>
                  </div>
                  <Badge variant="outline" className="text-green-600">{t('monitoring.active')}</Badge>
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
