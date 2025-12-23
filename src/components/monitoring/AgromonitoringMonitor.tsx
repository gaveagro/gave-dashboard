import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Satellite, Loader2, Settings } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getPolygonByPlotId, 
  getLatestSatelliteData,
  getLatestWeatherData,
  createPolygon
} from '@/lib/agromonitoring';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import AgromonitoringIndicators from './AgromonitoringIndicators';
import AgromonitoringWeather from './AgromonitoringWeather';

interface AgromonitoringMonitorProps {
  plotId?: string;
  plotName: string;
}

const AgromonitoringMonitor: React.FC<AgromonitoringMonitorProps> = ({ plotId, plotName }) => {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  
  // Only query if we have a valid UUID plotId
  const isValidUUID = plotId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(plotId);

  // Check if polygon exists for this plot
  const { data: polygon, isLoading: isLoadingPolygon } = useQuery({
    queryKey: ['agromonitoring-polygon', plotId],
    queryFn: () => getPolygonByPlotId(plotId!),
    enabled: !!isValidUUID
  });

  // Get latest satellite data if polygon exists
  const { data: satelliteData, isLoading: isLoadingSatellite } = useQuery({
    queryKey: ['agromonitoring-satellite-data', polygon?.polygon_id],
    queryFn: () => getLatestSatelliteData(polygon!.polygon_id),
    enabled: !!polygon?.polygon_id
  });

  // Get latest weather data if polygon exists
  const { data: weatherData, isLoading: isLoadingWeather } = useQuery({
    queryKey: ['agromonitoring-weather-data', polygon?.polygon_id],
    queryFn: () => getLatestWeatherData(polygon!.polygon_id),
    enabled: !!polygon?.polygon_id
  });

  // Create polygon mutation - only for admins with valid plots
  const createPolygonMutation = useMutation({
    mutationFn: () => createPolygon(plotId!),
    onSuccess: () => {
      toast.success(t('monitoring.connected'));
      queryClient.invalidateQueries({ queryKey: ['agromonitoring-polygon', plotId] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  // Show loading only for valid UUIDs
  if (isValidUUID && isLoadingPolygon) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // For demo mode or no polygon, show demo data directly
  const showDemoData = !isValidUUID || !polygon;
  const isAdmin = profile?.role === 'admin';
  const canConnect = isAdmin && isValidUUID && !polygon;

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Satellite className="h-4 w-4" />
              {t('monitoring.satelliteMonitoring')} - {plotName}
            </CardTitle>
            <div className="flex items-center gap-2">
              {canConnect && (
                <Button
                  variant="outline"
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
              )}
              <Badge variant="outline" className="text-green-600 border-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                {showDemoData ? t('monitoring.demo') : t('monitoring.connected')}
              </Badge>
            </div>
          </div>
          {polygon && (
            <p className="text-xs text-muted-foreground">
              {t('monitoring.area')}: {polygon.area_hectares?.toFixed(2) || 'N/A'} {t('monitoring.hectares')}
            </p>
          )}
        </CardHeader>
      </Card>

      {/* Satellite Indicators - always show with demo fallback */}
      <AgromonitoringIndicators 
        polygonId={polygon?.polygon_id || 'demo'}
        satelliteData={satelliteData || null}
        isLoading={isValidUUID && isLoadingSatellite}
      />

      {/* Weather Data - always show with demo fallback */}
      <AgromonitoringWeather 
        polygonId={polygon?.polygon_id || 'demo'}
        weatherData={weatherData || null}
        isLoading={isValidUUID && isLoadingWeather}
      />
    </div>
  );
};

export default AgromonitoringMonitor;
