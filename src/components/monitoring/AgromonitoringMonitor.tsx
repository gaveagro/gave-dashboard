import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Satellite, Loader2 } from 'lucide-react';
import { 
  getPolygonByPlotId, 
  getLatestSatelliteData,
  getLatestWeatherData
} from '@/lib/agromonitoring';
import AgromonitoringIndicators from './AgromonitoringIndicators';
import AgromonitoringWeather from './AgromonitoringWeather';

interface AgromonitoringMonitorProps {
  plotId?: string;
  plotName: string;
}

const AgromonitoringMonitor: React.FC<AgromonitoringMonitorProps> = ({ plotId, plotName }) => {
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

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Satellite className="h-4 w-4" />
              Monitoreo Satelital - {plotName}
            </CardTitle>
            <Badge variant="outline" className="text-green-600 border-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
              {showDemoData ? 'Demo' : 'Conectado'}
            </Badge>
          </div>
          {polygon && (
            <p className="text-xs text-muted-foreground">
              Área: {polygon.area_hectares?.toFixed(2) || 'N/A'} hectáreas
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
