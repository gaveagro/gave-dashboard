import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Leaf, Clock, TrendingUp } from 'lucide-react';

// Datos de ejemplo de inversiones del usuario
const userInvestments = [
  {
    id: 1,
    species: 'Espadín',
    scientificName: 'Agave angustifolia Haw',
    plantCount: 200,
    investmentAmount: 50000,
    currentValue: 67500,
    plantationYear: 2025,
    maturationYear: 2030,
    pricePerPlant: 250,
    expectedWeight: 55, // kg promedio por planta
    roi: 35.0,
    carbonCapture: 170, // total tons CO₂
    status: 'Activa',
    plotLocation: 'Parcela Norte - Oaxaca'
  }
];

const Investments = () => {
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
      case 'Activa':
        return 'bg-profit/10 text-profit border-profit/20';
      case 'Pendiente':
        return 'bg-accent/10 text-accent border-accent/20';
      case 'Completada':
        return 'bg-primary/10 text-primary border-primary/20';
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold bg-gradient-agave bg-clip-text text-transparent">
          Mis Inversiones
        </h1>
        <p className="text-muted-foreground text-lg">
          Gestiona y monitorea tus inversiones en plantaciones de agave
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
              {userInvestments.reduce((acc, inv) => acc + inv.plantCount, 0)}
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
              {formatCurrency(userInvestments.reduce((acc, inv) => acc + inv.investmentAmount, 0))}
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
              {formatCurrency(userInvestments.reduce((acc, inv) => acc + inv.currentValue, 0))}
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
              {formatNumber(userInvestments.reduce((acc, inv) => acc + inv.carbonCapture, 0), 1)} t
            </div>
          </CardContent>
        </Card>
      </div>

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
                    {investment.species} - {investment.plantCount} plantas
                  </CardTitle>
                  <CardDescription>
                    {investment.scientificName} • {investment.plotLocation}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(investment.status)}>
                  {investment.status}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Métricas Financieras */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Inversión Inicial</div>
                  <div className="text-lg font-bold text-investment">
                    {formatCurrency(investment.investmentAmount)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatCurrency(investment.pricePerPlant)} por planta
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Valor Actual</div>
                  <div className="text-lg font-bold text-profit">
                    {formatCurrency(investment.currentValue)}
                  </div>
                  <div className="text-xs text-profit">
                    +{formatCurrency(investment.currentValue - investment.investmentAmount)} ganancia
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">ROI Proyectado</div>
                  <div className="text-lg font-bold text-roi">
                    {formatNumber(investment.roi, 1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Al vencimiento
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
                      <div className="text-muted-foreground">{investment.plantationYear}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Cosecha Estimada</div>
                      <div className="text-muted-foreground">{investment.maturationYear}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Leaf className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Peso Esperado</div>
                      <div className="text-muted-foreground">
                        {formatNumber(investment.expectedWeight * investment.plantCount)} kg total
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Leaf className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Captura CO₂</div>
                      <div className="text-muted-foreground">
                        {formatNumber(investment.carbonCapture, 1)} tons
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
                    {investment.maturationYear - new Date().getFullYear()} años restantes
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-gradient-agave h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${((new Date().getFullYear() - investment.plantationYear) / (investment.maturationYear - investment.plantationYear)) * 100}%` 
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