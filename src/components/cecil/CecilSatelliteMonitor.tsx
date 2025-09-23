import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Satellite, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import VegetationIndicators from './VegetationIndicators';
import NDVITimelineChart from './NDVITimelineChart';
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
  const { data: aoi, isLoading: aoiLoading } = useQuery({
    queryKey: ['cecil-aoi', plotId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cecil_aois')
        .select('*')
        .eq('plot_id', plotId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }
  });

  // Get latest satellite data
  const { data: latestSatelliteData } = useQuery({
    queryKey: ['cecil-satellite-data', aoi?.id],
    queryFn: async () => {
      if (!aoi?.id) return null;
      
      const { data, error } = await supabase
        .from('cecil_satellite_data')
        .select('*')
        .eq('cecil_aoi_id', aoi.id)
        .order('measurement_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!aoi?.id
  });

  // Create AOI mutation
  const createAOIMutation = useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke('cecil-integration', {
        body: {
          action: 'create_aoi_for_plot',
          plotId,
          datasets: ['KANOP'] // Free dataset with NDVI, EVI, SAVI, NDWI
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Error creating AOI');
      }

      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "AOI Creado",
        description: "Se ha creado el AOI para monitoreo satelital de esta parcela."
      });
      queryClient.invalidateQueries({ queryKey: ['cecil-aoi', plotId] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo crear el AOI: ${error.message}`,
        variant: "destructive"
      });
    }
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
              Esta parcela no está conectada al sistema de monitoreo satelital Cecil.
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Satellite className="h-5 w-5 text-primary" />
              Monitoreo Satelital
            </CardTitle>
            <Badge variant="outline" className="text-green-600 border-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              Conectado
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Vegetation Indicators */}
      <VegetationIndicators 
        aoiId={aoi.id} 
        latestData={latestSatelliteData}
      />

      {/* Timeline Chart */}
      <NDVITimelineChart aoiId={aoi.id} />

      {/* Weather Widget */}
      <WeatherWidget aoiId={aoi.id} />
    </div>
  );
};

export default CecilSatelliteMonitor;