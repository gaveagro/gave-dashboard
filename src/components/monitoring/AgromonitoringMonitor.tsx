import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Satellite, RefreshCw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { 
  getPolygonByPlotId, 
  createPolygon, 
  fetchSatelliteData, 
  fetchCurrentWeather,
  fetchSoilData,
  getLatestSatelliteData,
  getLatestWeatherData
} from '@/lib/agromonitoring';
import AgromonitoringIndicators from './AgromonitoringIndicators';
import AgromonitoringWeather from './AgromonitoringWeather';

interface AgromonitoringMonitorProps {
  plotId: string;
  plotName: string;
}

const AgromonitoringMonitor: React.FC<AgromonitoringMonitorProps> = ({ plotId, plotName }) => {
  const queryClient = useQueryClient();

  // Check if polygon exists for this plot
  const { data: polygon, isLoading: isLoadingPolygon } = useQuery({
    queryKey: ['agromonitoring-polygon', plotId],
    queryFn: () => getPolygonByPlotId(plotId),
    enabled: !!plotId
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

  // Create polygon mutation
  const createPolygonMutation = useMutation({
    mutationFn: () => createPolygon(plotId),
    onSuccess: (data) => {
      toast.success('Polígono creado en Agromonitoring');
      queryClient.invalidateQueries({ queryKey: ['agromonitoring-polygon', plotId] });
      // Trigger initial data fetch
      if (data?.polygon?.polygon_id) {
        refreshDataMutation.mutate(data.polygon.polygon_id);
      }
    },
    onError: (error: any) => {
      toast.error(`Error al crear polígono: ${error.message}`);
    }
  });

  // Refresh data mutation
  const refreshDataMutation = useMutation({
    mutationFn: async (polygonId: string) => {
      const results = await Promise.all([
        fetchSatelliteData(polygonId),
        fetchCurrentWeather(polygonId),
        fetchSoilData(polygonId)
      ]);
      return results;
    },
    onSuccess: () => {
      toast.success('Datos actualizados desde Agromonitoring');
      queryClient.invalidateQueries({ queryKey: ['agromonitoring-satellite-data'] });
      queryClient.invalidateQueries({ queryKey: ['agromonitoring-weather-data'] });
    },
    onError: (error: any) => {
      toast.error(`Error al actualizar datos: ${error.message}`);
    }
  });

  if (isLoadingPolygon) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // If no polygon, show setup button
  if (!polygon) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Satellite className="h-4 w-4" />
            Monitoreo Satelital - {plotName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Esta parcela no está configurada para monitoreo satelital.
              Conecta la parcela para recibir datos de NDVI, clima y suelo.
            </p>
            <Button 
              onClick={() => createPolygonMutation.mutate()}
              disabled={createPolygonMutation.isPending}
            >
              {createPolygonMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Satellite className="h-4 w-4 mr-2" />
                  Conectar Monitoreo Satelital
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isRefreshing = refreshDataMutation.isPending;
  const hasData = satelliteData || weatherData;

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Satellite className="h-4 w-4" />
              Monitoreo Satelital - {plotName}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Conectado
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshDataMutation.mutate(polygon.polygon_id)}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Área: {polygon.area_hectares?.toFixed(2) || 'N/A'} hectáreas • 
            ID: {polygon.polygon_id.slice(0, 8)}...
          </p>
        </CardHeader>
      </Card>

      {/* Satellite Indicators */}
      <AgromonitoringIndicators 
        polygonId={polygon.polygon_id}
        satelliteData={satelliteData}
        isLoading={isLoadingSatellite}
      />

      {/* Weather Data */}
      <AgromonitoringWeather 
        polygonId={polygon.polygon_id}
        weatherData={weatherData}
        isLoading={isLoadingWeather}
      />

      {/* No data message */}
      {!hasData && !isLoadingSatellite && !isLoadingWeather && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                No hay datos disponibles aún. Haz clic en actualizar para obtener los primeros datos.
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AgromonitoringMonitor;
