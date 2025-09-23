import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp } from 'lucide-react';

interface NDVITimelineChartProps {
  aoiId: string;
}

const NDVITimelineChart: React.FC<NDVITimelineChartProps> = ({ aoiId }) => {
  const [timeRange, setTimeRange] = useState<string>('12'); // months
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['ndvi', 'evi']);

  // Get historical satellite data (last 3 years)
  const { data: historicalData, isLoading } = useQuery({
    queryKey: ['cecil-historical-data', aoiId, timeRange],
    queryFn: async () => {
      const monthsBack = parseInt(timeRange);
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsBack);
      
      const { data, error } = await supabase
        .from('cecil_satellite_data')
        .select('*')
        .eq('cecil_aoi_id', aoiId)
        .gte('measurement_date', startDate.toISOString().split('T')[0])
        .order('measurement_date', { ascending: true });
      
      if (error) throw error;
      
      // Group by month to reduce noise
      const monthlyData = data.reduce((acc: any[], item) => {
        const monthKey = `${item.year}-${String(item.month).padStart(2, '0')}`;
        const existing = acc.find(d => d.month === monthKey);
        
        if (existing) {
          // Average the values for the month
          existing.ndvi = ((existing.ndvi || 0) + (item.ndvi || 0)) / 2;
          existing.evi = ((existing.evi || 0) + (item.evi || 0)) / 2;
          existing.savi = ((existing.savi || 0) + (item.savi || 0)) / 2;
          existing.ndwi = ((existing.ndwi || 0) + (item.ndwi || 0)) / 2;
          existing.count++;
        } else {
          acc.push({
            month: monthKey,
            ndvi: item.ndvi,
            evi: item.evi,
            savi: item.savi,
            ndwi: item.ndwi,
            measurement_date: item.measurement_date,
            count: 1
          });
        }
        
        return acc;
      }, []);

      return monthlyData.map(item => ({
        ...item,
        displayMonth: new Date(`${item.month}-01`).toLocaleDateString('es-ES', { 
          month: 'short', 
          year: '2-digit' 
        })
      }));
    },
    enabled: !!aoiId
  });

  const metrics = [
    { key: 'ndvi', name: 'NDVI', color: '#22c55e' },
    { key: 'evi', name: 'EVI', color: '#3b82f6' },
    { key: 'savi', name: 'SAVI', color: '#f59e0b' },
    { key: 'ndwi', name: 'NDWI', color: '#06b6d4' }
  ];

  const toggleMetric = (metricKey: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricKey)
        ? prev.filter(m => m !== metricKey)
        : [...prev, metricKey]
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Cargando datos históricos...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!historicalData || historicalData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4" />
            Línea de Tiempo - Índices de Vegetación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No hay datos históricos disponibles aún.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Los datos se recopilan automáticamente cada semana.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4" />
            Línea de Tiempo - Índices de Vegetación
          </CardTitle>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">1 año</SelectItem>
              <SelectItem value="24">2 años</SelectItem>
              <SelectItem value="36">3 años</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Metric toggles */}
        <div className="flex flex-wrap gap-2 mb-4">
          {metrics.map(metric => (
            <Button
              key={metric.key}
              variant={selectedMetrics.includes(metric.key) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleMetric(metric.key)}
              className="text-xs"
              style={{
                backgroundColor: selectedMetrics.includes(metric.key) ? metric.color : undefined,
                borderColor: metric.color,
                color: selectedMetrics.includes(metric.key) ? 'white' : metric.color
              }}
            >
              {metric.name}
            </Button>
          ))}
        </div>

        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historicalData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="displayMonth" 
                fontSize={10}
                stroke="#64748b"
              />
              <YAxis 
                domain={[-1, 1]}
                fontSize={10}
                stroke="#64748b"
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
                formatter={(value: any, name: string) => [
                  value?.toFixed(3) || 'N/A',
                  metrics.find(m => m.key === name)?.name || name
                ]}
              />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
              />
              
              {selectedMetrics.map(metricKey => {
                const metric = metrics.find(m => m.key === metricKey);
                if (!metric) return null;
                
                return (
                  <Line
                    key={metricKey}
                    type="monotone"
                    dataKey={metricKey}
                    stroke={metric.color}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name={metric.name}
                    connectNulls={false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          <p>💡 Los datos se agrupan por mes para mostrar tendencias más claras.</p>
          <p>Haz clic en las métricas para mostrar/ocultar las líneas del gráfico.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default NDVITimelineChart;