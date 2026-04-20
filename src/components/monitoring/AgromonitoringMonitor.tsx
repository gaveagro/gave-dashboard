import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Satellite, Loader2, Settings, ChevronDown, Cloud } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { createPolygon, AgromonitoringPolygon, AgromonitoringData } from '@/lib/agromonitoring';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import AgromonitoringIndicators from './AgromonitoringIndicators';
import AgromonitoringWeather from './AgromonitoringWeather';

interface AgromonitoringMonitorProps {
  plotId?: string;
  plotName: string;
  polygon: AgromonitoringPolygon | null;
  satelliteData: AgromonitoringData | null;
  weatherData: AgromonitoringData | null;
  isLoading?: boolean;
}

const AgromonitoringMonitor: React.FC<AgromonitoringMonitorProps> = ({
  plotId,
  plotName,
  polygon,
  satelliteData,
  weatherData,
  isLoading = false,
}) => {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const isValidUUID = !!plotId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(plotId);

  const createPolygonMutation = useMutation({
    mutationFn: () => createPolygon(plotId!),
    onSuccess: () => {
      toast.success(t('monitoring.connected'));
      queryClient.invalidateQueries({ queryKey: ['plots-monitoring'] });
    },
    onError: (error: Error & { context?: { error?: string } }) => {
      // Surface the real edge-function error message
      const ctxErr = (error as any)?.context?.error;
      toast.error(ctxErr || error.message || t('monitoring.connectError'));
    },
  });

  const isAdmin = profile?.role === 'admin';
  const canConnect = isAdmin && isValidUUID && !polygon;

  const lastDate = satelliteData?.measurement_date
    ? new Date(satelliteData.measurement_date).toLocaleDateString('es-MX', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Satellite className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{t('monitoring.satelliteAndWeather')}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {polygon
                    ? lastDate
                      ? `${t('monitoring.lastSatellitePass')}: ${lastDate}`
                      : t('monitoring.connected')
                    : t('monitoring.tapToView')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {typeof satelliteData?.cloud_coverage === 'number' && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Cloud className="h-3 w-3" />
                  {satelliteData.cloud_coverage.toFixed(0)}%
                </Badge>
              )}
              <Badge variant={polygon ? 'default' : 'secondary'} className="text-[10px]">
                {polygon ? t('monitoring.connected') : t('monitoring.demo')}
              </Badge>
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="border-t pt-4 space-y-4">
            {canConnect && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40">
                <div className="text-xs">
                  <p className="font-medium">{t('monitoring.notConnected')}</p>
                  <p className="text-muted-foreground">{t('monitoring.connectHint')}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => createPolygonMutation.mutate()}
                  disabled={createPolygonMutation.isPending}
                >
                  {createPolygonMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Settings className="h-4 w-4 mr-1" />
                      {t('monitoring.connectMonitoring')}
                    </>
                  )}
                </Button>
              </div>
            )}

            {!polygon && !canConnect && (
              <p className="text-xs text-muted-foreground text-center py-2">
                {t('monitoring.satelliteUnavailable')}
              </p>
            )}

            <Tabs defaultValue="vegetation" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="vegetation">{t('monitoring.tabVegetation')}</TabsTrigger>
                <TabsTrigger value="weather">{t('monitoring.tabWeather')}</TabsTrigger>
                <TabsTrigger value="soil">{t('monitoring.tabSoil')}</TabsTrigger>
              </TabsList>

              <TabsContent value="vegetation" className="mt-4">
                <AgromonitoringIndicators
                  polygonId={polygon?.polygon_id || 'demo'}
                  satelliteData={satelliteData}
                  isLoading={isLoading}
                />
              </TabsContent>

              <TabsContent value="weather" className="mt-4">
                <AgromonitoringWeather
                  polygonId={polygon?.polygon_id || 'demo'}
                  weatherData={weatherData}
                  isLoading={isLoading}
                />
              </TabsContent>

              <TabsContent value="soil" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border bg-muted/20 p-4 text-center">
                        <p className="text-xs text-muted-foreground">{t('monitoring.soilTemp')}</p>
                        <p className="text-2xl font-bold">
                          {weatherData?.soil_temperature?.toFixed(1) ?? '22.4'}
                          <span className="text-sm font-normal ml-1">°C</span>
                        </p>
                      </div>
                      <div className="rounded-lg border bg-muted/20 p-4 text-center">
                        <p className="text-xs text-muted-foreground">{t('monitoring.soilHumidity')}</p>
                        <p className="text-2xl font-bold">
                          {weatherData?.soil_moisture?.toFixed(0) ?? '48'}
                          <span className="text-sm font-normal ml-1">%</span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default AgromonitoringMonitor;
