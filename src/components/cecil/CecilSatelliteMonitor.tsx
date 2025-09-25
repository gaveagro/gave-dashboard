import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Satellite, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ForestIndicators from './VegetationIndicators';
import ForestTimelineChart from './NDVITimelineChart';
import WeatherWidget from './WeatherWidget';

interface CecilSatelliteMonitorProps {
  plotId: string;
  plotName: string;
  plotCoordinates: string;
  plotArea: number;
}

const CecilSatelliteMonitor: React.FC<CecilSatelliteMonitorProps> = ({
  plotId,
  plotName,
  plotCoordinates,
  plotArea,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if AOI exists for this plot
  const { data: aoi, isLoading: aoiLoading, refetch: refetchAoi } = useQuery({
    queryKey: ['cecil-aoi', plotId],
    queryFn: async () => {
      console.log('CecilSatelliteMonitor: Fetching AOI for plot:', plotId);
      const { data, error } = await supabase
        .from('cecil_aois')
        .select('*')
        .eq('plot_id', plotId)
        .maybeSingle();
      
      if (error) {
        console.error('CecilSatelliteMonitor: AOI fetch error:', error);
        throw error;
      }
      console.log('CecilSatelliteMonitor: AOI found:', data);
      return data;
    },
    retry: 1,
    staleTime: 10 * 1000, // Reduced cache time to 10 seconds for faster updates
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // Get latest satellite data
  const { data: latestSatelliteData, refetch: refetchSatelliteData } = useQuery({
    queryKey: ['cecil-satellite-data', aoi?.id],
    queryFn: async () => {
      if (!aoi?.id) {
        console.log('CecilSatelliteMonitor: No AOI ID available for satellite data fetch');
        return null;
      }
      
      console.log('CecilSatelliteMonitor: Fetching satellite data for AOI:', aoi.id);
      const { data, error } = await supabase
        .from('cecil_satellite_data')
        .select('*')
        .eq('cecil_aoi_id', aoi.id)
        .order('measurement_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('CecilSatelliteMonitor: Satellite data fetch error:', error);
        throw error;
      }
      
      console.log('CecilSatelliteMonitor: Satellite data found:', data);
      
      // Return real data only - no demo data fallback
      console.log('CecilSatelliteMonitor: Real satellite data result:', data);
      
      return data;
    },
    enabled: !!aoi?.id,
    staleTime: 10 * 1000, // Reduced cache time to 10 seconds for faster updates
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // Create AOI mutation
  const createAOIMutation = useMutation({
    mutationFn: async () => {
      console.log('Creating AOI for plot:', plotId);
      
      // First test Cecil connection
      console.log('Testing Cecil API connection...');
      const testResult = await supabase.functions.invoke('cecil-test-connection');
      
      if (testResult.error || !testResult.data?.success) {
        console.error('Cecil connection test failed:', testResult);
        throw new Error('No se pudo conectar con Cecil API. Verificar configuración.');
      }

      console.log('Cecil connection successful, available datasets:', testResult.data.data.datasets?.length || 0);

      // Create AOI with available datasets
      const availableDatasets = testResult.data.data.datasets || [];
      const datasetsToUse = availableDatasets.slice(0, 2).map((d: any) => d.id); // Use first 2 datasets

      const { data, error } = await supabase.functions.invoke('cecil-integration', {
        body: { 
          action: 'create_aoi_for_plot', 
          plotId: plotId,
          datasets: datasetsToUse
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to create AOI');
      }

      if (!data?.success) {
        console.error('AOI creation failed:', data);
        throw new Error(data?.error || 'Failed to create AOI in Cecil');
      }

      console.log('AOI created successfully:', data);
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Monitoreo Conectado",
        description: "El monitoreo satelital ha sido configurado exitosamente para esta parcela.",
      });
      // Invalidate all related caches with unified keys
      queryClient.invalidateQueries({ queryKey: ['cecil-aoi'] });
      queryClient.invalidateQueries({ queryKey: ['cecil-satellite-data'] });
      queryClient.invalidateQueries({ queryKey: ['cecil-satellite-previous'] });
      queryClient.invalidateQueries({ queryKey: ['cecil-weather-data'] });
      queryClient.invalidateQueries({ queryKey: ['cecil-alerts'] });
    },
    onError: (error) => {
      console.error('Mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo configurar el monitoreo satelital.",
        variant: "destructive",
      });
    },
  });

  if (aoiLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Verificando conexión satelital...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!aoi) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Satellite className="h-5 w-5 text-muted-foreground" />
            Monitoreo Satelital
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-amber-500 mb-2" />
            <p className="text-sm text-muted-foreground mb-4">
              Esta parcela no está conectada al sistema de monitoreo satelital.
            </p>
            <Button 
              onClick={() => createAOIMutation.mutate()}
              disabled={createAOIMutation.isPending}
              className="w-full"
            >
              {createAOIMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creando conexión...
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

  const handleRefresh = async () => {
    console.log('CecilSatelliteMonitor: Refreshing all Cecil data...');
    // Force refetch of current data
    await Promise.all([refetchAoi(), refetchSatelliteData()]);
    
    // Invalidate all related caches to ensure fresh data across all components
    queryClient.invalidateQueries({ queryKey: ['cecil-aoi'] });
    queryClient.invalidateQueries({ queryKey: ['cecil-satellite-data'] });
    queryClient.invalidateQueries({ queryKey: ['cecil-satellite-previous'] });
    queryClient.invalidateQueries({ queryKey: ['cecil-weather-data'] });
    queryClient.invalidateQueries({ queryKey: ['cecil-alerts'] });
    
    toast({
      title: "Datos Actualizados",
      description: "Los datos satelitales han sido actualizados.",
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Satellite className="h-5 w-5 text-primary" />
              Monitoreo Satelital
              {latestSatelliteData && (
                <Badge variant="default" className="ml-2 text-xs bg-green-600">
                  Datos disponibles
                </Badge>
              )}
              {!latestSatelliteData && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  Sincronizando...
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-600 border-green-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                Conectado
              </Badge>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                Actualizar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Forest Indicators */}
      <ForestIndicators 
        aoiId={aoi.id} 
        latestData={latestSatelliteData}
      />

      {/* Forest Timeline Chart */}
      <ForestTimelineChart aoiId={aoi.id} />

      {/* Weather Widget */}
      <WeatherWidget aoiId={aoi.id} />
    </div>
  );
};

export default CecilSatelliteMonitor;