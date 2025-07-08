import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Leaf, Calculator, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const { user } = useAuth();
  const [userInvestments, setUserInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserInvestments();
    }
  }, [user]);

  const fetchUserInvestments = async () => {
    try {
      const { data: investments, error } = await supabase
        .from('investments')
        .select(`
          *,
          plant_species:species_id (name, scientific_name, carbon_capture_per_plant)
        `)
        .eq('user_id', user?.id);

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

  // Calcular métricas basadas en inversiones reales
  const totalPlants = userInvestments.reduce((acc, inv) => acc + inv.plant_count, 0);
  const totalInvested = userInvestments.reduce((acc, inv) => acc + inv.total_amount, 0);
  
  // Calcular CO2 capturado basado en la edad de cada planta
  const totalCO2Captured = userInvestments.reduce((acc, inv) => {
    const currentYear = new Date().getFullYear();
    const plantAge = Math.max(0, currentYear - inv.plantation_year);
    const co2PerPlantPerYear = inv.plant_species?.carbon_capture_per_plant || 0.5;
    return acc + (inv.plant_count * co2PerPlantPerYear * plantAge);
  }, 0);

  // Determinar cosecha estimada (más próxima)
  const nextHarvest = userInvestments.reduce((earliest, inv) => {
    return !earliest || inv.expected_harvest_year < earliest ? inv.expected_harvest_year : earliest;
  }, null);

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Welcome Section */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold bg-gradient-agave bg-clip-text text-transparent">
          Bienvenido a tu Dashboard
        </h1>
        <p className="text-muted-foreground text-lg">
          Gestiona tus inversiones en agricultura regenerativa con agave
        </p>
      </div>

      {/* Métricas Principales */}
      {loading ? (
        <div className="text-center py-8">Cargando datos...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="animate-fade-in border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-primary flex items-center gap-2">
                <Leaf className="h-4 w-4" />
                Total Plantas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {totalPlants.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                En {userInvestments.length} inversión{userInvestments.length !== 1 ? 'es' : ''}
              </p>
            </CardContent>
          </Card>

          <Card className="animate-fade-in border-investment/20 bg-gradient-to-br from-investment/5 to-investment/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-investment flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Inversión Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-investment">
                {formatCurrency(totalInvested)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Capital invertido en agave
              </p>
            </CardContent>
          </Card>

          <Card className="animate-fade-in border-contrast/20 bg-gradient-to-br from-contrast/5 to-contrast/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-contrast flex items-center gap-2">
                <Leaf className="h-4 w-4" />
                CO₂ Capturado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-contrast">
                {totalCO2Captured.toFixed(1)} t
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Impacto ambiental acumulado
              </p>
            </CardContent>
          </Card>

          <Card className="animate-fade-in border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-accent flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Próxima Cosecha
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">
                {nextHarvest || 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {userInvestments.length > 1 ? 'Cosecha más próxima' : 'Año de maduración'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Acciones Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Simular Nueva Inversión
            </CardTitle>
            <CardDescription>
              Calcula el retorno potencial de una nueva inversión en agave
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full bg-gradient-agave hover:opacity-90">
              <Link to="/simulator">
                Abrir Simulador
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-secondary" />
              Ver Mis Inversiones
            </CardTitle>
            <CardDescription>
              Revisa el estado de tus plantaciones y proyecciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/investments">
                Ver Inversiones
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Información de la Empresa */}
      <Card className="animate-fade-in bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-primary">
            Sobre Gavé Agrotecnología
          </CardTitle>
          <CardDescription>
            Tu socio en agricultura regenerativa y producción sostenible de mezcal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Gavé Agrotecnología es una empresa líder en agricultura regenerativa especializada en el cultivo 
            sostenible de agave. Nuestro enfoque integral abarca desde la producción para mezcal hasta 
            aplicaciones innovadoras en biocombustibles, forraje ganadero, bioplásticos y edulcorantes naturales. 
            
            Como inversionista, participas en un modelo sostenible que no solo genera retornos financieros 
            atractivos, sino que también contribuye activamente a la regeneración del suelo, la captura de 
            carbono y el desarrollo de comunidades rurales. Cada planta que cultivas representa un compromiso 
            con el futuro de la agricultura mexicana y el medio ambiente.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-primary">5-7</div>
              <div className="text-xs text-muted-foreground">Años de maduración</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-secondary">65%</div>
              <div className="text-xs text-muted-foreground">Utilidades para inversionista</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-contrast">0.5+</div>
              <div className="text-xs text-muted-foreground">Tons CO₂ por planta</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;