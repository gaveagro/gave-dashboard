import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Leaf, Clock, TrendingUp } from 'lucide-react';
import { InvestmentChart } from '@/components/InvestmentChart';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

const Investments = () => {
  const { t } = useLanguage();
  const [userInvestments, setUserInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchUserInvestments();
  }, []);

  const fetchUserInvestments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: investments, error } = await supabase
        .from('investments')
        .select(`
          *,
          plant_species:species_id (name, scientific_name, carbon_capture_per_plant)
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      setUserInvestments(investments || []);
    } catch (error) {
      console.error('Error fetching investments:', error);
    } finally {
      setLoading(false);
    }
  };
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number, decimals: number = 0) => {
    return new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-profit/10 text-profit border-profit/20';
      case 'pending':
        return 'bg-accent/10 text-accent border-accent/20';
      case 'completed':
        return 'bg-primary/10 text-primary border-primary/20';
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  if (loading) {
    return <div className="container mx-auto p-6">Cargando inversiones...</div>;
  }

  const chartData = userInvestments.map(inv => ({
    species: inv.plant_species?.name || 'Desconocida',
    amount: inv.total_amount,
    count: inv.plant_count,
    year: inv.plantation_year
  }));

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold bg-gradient-agave bg-clip-text text-transparent">
          {t('investments.title')}
        </h1>
        <p className="text-muted-foreground text-lg">
          {t('investments.description')}
        </p>
      </div>

      {/* Resumen General */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="animate-fade-in">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-primary" />
              <div className="text-sm text-muted-foreground">Total Plantas</div>
            </div>
            <div className="text-2xl font-bold text-primary mt-1">
              {userInvestments.reduce((acc, inv) => acc + inv.plant_count, 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-investment" />
              <div className="text-sm text-muted-foreground">Inversión Total</div>
            </div>
            <div className="text-2xl font-bold text-investment mt-1">
              {formatCurrency(userInvestments.reduce((acc, inv) => acc + inv.total_amount, 0))}
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-profit" />
              <div className="text-sm text-muted-foreground">Valor Actual</div>
            </div>
            <div className="text-2xl font-bold text-profit mt-1">
              Usar simulador
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-contrast" />
              <div className="text-sm text-muted-foreground">CO₂ Capturado</div>
            </div>
            <div className="text-2xl font-bold text-contrast mt-1">
              {formatNumber(userInvestments.reduce((acc, inv) => acc + (inv.plant_species?.carbon_capture_per_plant || 0.5) * inv.plant_count, 0), 1)} t
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pie Chart para múltiples inversiones */}
      {userInvestments.length > 1 && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Análisis de Inversiones</CardTitle>
            <CardDescription>
              Distribución detallada de tus inversiones por especies y años de establecimiento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InvestmentChart investments={chartData} />
          </CardContent>
        </Card>
      )}

      {/* Lista de Inversiones */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Inversiones Detalladas</h2>
        
        {userInvestments.map((investment) => (
          <Card key={investment.id} className="animate-fade-in border-l-4 border-l-primary">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-primary" />
                    {investment.plant_species?.name || 'Especie desconocida'} - {investment.plant_count} plantas
                  </CardTitle>
                  <CardDescription>
                    {investment.plant_species?.scientific_name || 'Nombre científico no disponible'}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(investment.status)}>
                  {investment.status === 'active' ? 'Activa' : investment.status === 'pending' ? 'Pendiente' : 'Completada'}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Métricas Financieras */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Inversión Inicial</div>
                  <div className="text-lg font-bold text-investment">
                    {formatCurrency(investment.total_amount)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatCurrency(investment.price_per_plant)} por planta
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Valor Estimado</div>
                  <div className="text-lg font-bold text-profit">
                    Usar simulador
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Simula diferentes escenarios de precio
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">ROI Proyectado</div>
                  <div className="text-lg font-bold text-roi">
                    Usar simulador
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Para calcular escenarios
                  </div>
                </div>
              </div>

              {/* Información de Cultivo */}
              <div className="border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Año de Plantación</div>
                      <div className="text-muted-foreground">{investment.plantation_year}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Cosecha Estimada</div>
                      <div className="text-muted-foreground">{investment.expected_harvest_year}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Leaf className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Peso Estimado</div>
                      <div className="text-muted-foreground">
                        Usar simulador para estimar
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Leaf className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Captura CO₂</div>
                      <div className="text-muted-foreground">
                        {formatNumber((investment.plant_species?.carbon_capture_per_plant || 0.5) * investment.plant_count, 1)} tons
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progreso de Maduración */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">Progreso de Maduración</div>
                  <div className="text-sm text-muted-foreground">
                    {investment.expected_harvest_year - new Date().getFullYear()} años restantes
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-gradient-agave h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.max(0, Math.min(100, ((new Date().getFullYear() - investment.plantation_year) / (investment.expected_harvest_year - investment.plantation_year)) * 100))}%` 
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Investments;