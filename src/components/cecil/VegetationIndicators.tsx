import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Trees, Shield, Leaf, BarChart3 } from 'lucide-react';

interface ForestIndicatorsProps {
  aoiId: string;
  latestData: any;
}

const ForestIndicators: React.FC<ForestIndicatorsProps> = ({
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

  const getBiomassColor = (value: number) => {
    if (value >= 80) return 'text-green-600';
    if (value >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBiomassBadgeColor = (value: number) => {
    if (value >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (value >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (!previous) return <Minus className="h-3 w-3" />;
    if (current > previous) return <TrendingUp className="h-3 w-3 text-green-600" />;
    if (current < previous) return <TrendingDown className="h-3 w-3 text-red-600" />;
    return <Minus className="h-3 w-3 text-gray-400" />;
  };

  const formatBiomassValue = (value: number | null) => {
    if (value === null || value === undefined) return 'N/A';
    return value.toFixed(1) + ' t/ha';
  };

  const formatCoverValue = (value: number | null) => {
    if (value === null || value === undefined) return 'N/A';
    return value.toFixed(1) + '%';
  };

  const indicators = [
    {
      name: 'Biomasa Forestal',
      description: 'Biomasa sobre el suelo',
      value: latestData?.biomass,
      previous: previousData?.biomass,
      icon: Trees,
      explanation: 'Cantidad de biomasa vegetal por hectárea',
      formatter: formatBiomassValue,
      colorFn: getBiomassColor,
      badgeColorFn: getBiomassBadgeColor
    },
    {
      name: 'Cobertura Forestal',
      description: 'Porcentaje de cobertura',
      value: latestData?.canopy_cover,
      previous: previousData?.canopy_cover,
      icon: Shield,
      explanation: 'Porcentaje del área cubierta por dosel forestal',
      formatter: formatCoverValue,
      colorFn: getBiomassColor,
      badgeColorFn: getBiomassBadgeColor
    },
    {
      name: 'Carbono Capturado',
      description: 'Captura de carbono',
      value: latestData?.carbon_capture,
      previous: previousData?.carbon_capture,
      icon: Leaf,
      explanation: 'Cantidad de carbono capturado por la vegetación',
      formatter: formatBiomassValue,
      colorFn: getBiomassColor,
      badgeColorFn: getBiomassBadgeColor
    },
    {
      name: 'Cambio Forestal',
      description: 'Cambio en cobertura',
      value: (latestData as any)?.forest_change,
      previous: (previousData as any)?.forest_change,
      icon: BarChart3,
      explanation: 'Cambios en la cobertura forestal detectados',
      formatter: formatCoverValue,
      colorFn: getBiomassColor,
      badgeColorFn: getBiomassBadgeColor
    }
  ];

  if (!latestData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Indicadores Forestales</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No hay datos de biomasa forestal disponibles aún. Los datos se actualizan semanalmente.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Indicadores Forestales</CardTitle>
        {latestData.measurement_date && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Última actualización: {new Date(latestData.measurement_date).toLocaleDateString('es-ES')}
            </p>
            {latestData.id === 'demo-data' && (
              <Badge variant="secondary" className="text-xs">
                Datos de Demostración
              </Badge>
            )}
          </div>
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
                    className={`${indicator.badgeColorFn(indicator.value || 0)} text-xs`}
                  >
                    {indicator.formatter(indicator.value)}
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
            <p><span className="text-green-600">●</span> Alto: ≥80 t/ha biomasa</p>
            <p><span className="text-yellow-600">●</span> Moderado: 50-80 t/ha</p>
            <p><span className="text-red-600">●</span> Bajo: &lt;50 t/ha</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ForestIndicators;