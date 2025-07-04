import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Leaf, Calculator, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

// Datos de ejemplo basados en las especificaciones
const userInvestments = {
  totalInvested: 50000,
  currentValue: 67500,
  totalPlants: 200,
  species: 'Espadín',
  plantationYear: 2025,
  expectedHarvest: '2030',
  roi: 35.0
};

const Dashboard = () => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="animate-fade-in border-investment/20 bg-gradient-to-br from-investment/5 to-investment/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-investment flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Inversión Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-investment">
              {formatCurrency(userInvestments.totalInvested)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {userInvestments.totalPlants} plantas de {userInvestments.species}
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in border-profit/20 bg-gradient-to-br from-profit/5 to-profit/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-profit flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Valor Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-profit">
              {formatCurrency(userInvestments.currentValue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Proyección actual de mercado
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in border-roi/20 bg-gradient-to-br from-roi/5 to-roi/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-roi flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              ROI Proyectado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-roi">
              {userInvestments.roi}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Retorno estimado al vencimiento
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-accent flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Cosecha Estimada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {userInvestments.expectedHarvest}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Año de maduración del {userInvestments.species}
            </p>
          </CardContent>
        </Card>
      </div>

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
            Gavé Agrotecnología, S.P.R. de R.L. de C.V. es una empresa pionera en agricultura regenerativa 
            especializada en el cultivo sostenible de Agave para los sectores que demandan estas plantas 
            como materia prima: Mezcal, Biocombustibles, Forraje Ganadero, Bioplásticos, Edulcorantes, 
            Prebióticos, entre otros. Nuestro modelo de inversión permite a los socios participar en el 
            crecimiento de plantaciones de agave mientras contribuyen a la regeneración del suelo y la 
            captura de carbono.
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