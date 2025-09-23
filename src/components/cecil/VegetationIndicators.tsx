import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Leaf, Droplets, Eye, TreePine } from 'lucide-react';

interface VegetationIndicatorsProps {
  aoiId: string;
  latestData: any;
}

const VegetationIndicators: React.FC<VegetationIndicatorsProps> = ({
  aoiId,
  latestData
}) => {
  // Get previous month data for trend comparison
  const { data: previousData } = useQuery({
    queryKey: ['cecil-satellite-previous', aoiId],
    queryFn: async () => {
      if (!latestData?.measurement_date) return null;
      
      const previousMonth = new Date(latestData.measurement_date);
      previousMonth.setMonth(previousMonth.getMonth() - 1);
      
      const { data, error } = await supabase
        .from('cecil_satellite_data')
        .select('*')
        .eq('cecil_aoi_id', aoiId)
        .lte('measurement_date', previousMonth.toISOString().split('T')[0])
        .order('measurement_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!latestData?.measurement_date
  });

  const getIndicatorColor = (value: number) => {
    if (value >= 0.6) return 'text-green-600';
    if (value >= 0.3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getIndicatorBadgeColor = (value: number) => {
    if (value >= 0.6) return 'bg-green-100 text-green-800 border-green-200';
    if (value >= 0.3) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (!previous) return <Minus className="h-3 w-3" />;
    if (current > previous) return <TrendingUp className="h-3 w-3 text-green-600" />;
    if (current < previous) return <TrendingDown className="h-3 w-3 text-red-600" />;
    return <Minus className="h-3 w-3 text-gray-400" />;
  };

  const formatValue = (value: number | null) => {
    if (value === null || value === undefined) return 'N/A';
    return value.toFixed(3);
  };

  const indicators = [
    {
      name: 'NDVI',
      description: 'Índice de Vegetación',
      value: latestData?.ndvi,
      previous: previousData?.ndvi,
      icon: Leaf,
      explanation: 'Mide la densidad y salud de la vegetación'
    },
    {
      name: 'EVI',
      description: 'Índice Mejorado de Vegetación',
      value: latestData?.evi,
      previous: previousData?.evi,
      icon: TreePine,
      explanation: 'Versión mejorada del NDVI, menos sensible a la atmósfera'
    },
    {
      name: 'SAVI',
      description: 'Índice Ajustado del Suelo',
      value: latestData?.savi,
      previous: previousData?.savi,
      icon: Eye,
      explanation: 'Corrige la influencia del suelo en zonas de poca vegetación'
    },
    {
      name: 'NDWI',
      description: 'Índice de Agua',
      value: latestData?.ndwi,
      previous: previousData?.ndwi,
      icon: Droplets,
      explanation: 'Mide el contenido de humedad en la vegetación'
    }
  ];

  if (!latestData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Indicadores de Vegetación</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No hay datos satelitales disponibles aún. Los datos se actualizan semanalmente.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Indicadores de Vegetación</CardTitle>
        {latestData.measurement_date && (
          <p className="text-xs text-muted-foreground">
            Última actualización: {new Date(latestData.measurement_date).toLocaleDateString('es-ES')}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {indicators.map((indicator) => {
            const IconComponent = indicator.icon;
            return (
              <div key={indicator.name} className="space-y-2">
                <div className="flex items-center gap-2">
                  <IconComponent className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{indicator.name}</span>
                  {getTrendIcon(indicator.value, indicator.previous)}
                </div>
                
                <div className="space-y-1">
                  <Badge 
                    variant="outline" 
                    className={`${getIndicatorBadgeColor(indicator.value || 0)} text-xs`}
                  >
                    {formatValue(indicator.value)}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {indicator.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="text-xs text-muted-foreground space-y-1">
            <p><span className="text-green-600">●</span> Excelente: ≥0.6</p>
            <p><span className="text-yellow-600">●</span> Moderado: 0.3-0.6</p>
            <p><span className="text-red-600">●</span> Bajo: &lt;0.3</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VegetationIndicators;