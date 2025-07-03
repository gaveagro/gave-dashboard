import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Leaf, Info, TrendingUp } from 'lucide-react';

// Datos de ejemplo de parcelas
const plots = [
  {
    id: 1,
    name: 'Parcela Norte',
    location: 'Oaxaca, México',
    coordinates: '17.0732°N, 96.7266°W',
    area: 15.5, // hectáreas
    totalPlants: 3100,
    availablePlants: 2900,
    species: ['Espadín', 'Salmiana'],
    soilType: 'Franco-arenoso',
    elevation: 1580, // metros
    lastUpdate: '2024-12-15',
    status: 'Activa',
    rainfall: 650, // mm anuales
    temperature: '18-25°C'
  },
  {
    id: 2,
    name: 'Parcela Sur',
    location: 'Oaxaca, México',
    coordinates: '16.9252°N, 96.7266°W',
    area: 22.3, // hectáreas
    totalPlants: 4460,
    availablePlants: 4200,
    species: ['Salmiana', 'Atrovirens'],
    soilType: 'Arcillo-limoso',
    elevation: 1650, // metros
    lastUpdate: '2024-12-10',
    status: 'En desarrollo',
    rainfall: 780, // mm anuales
    temperature: '16-23°C'
  }
];

const Plots = () => {
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
      case 'En desarrollo':
        return 'bg-accent/10 text-accent border-accent/20';
      case 'Preparación':
        return 'bg-secondary/10 text-secondary border-secondary/20';
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const getAvailabilityPercentage = (available: number, total: number) => {
    return ((available / total) * 100).toFixed(1);
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold bg-gradient-agave bg-clip-text text-transparent">
          Parcelas de Cultivo
        </h1>
        <p className="text-muted-foreground text-lg">
          Información detallada sobre nuestras parcelas de agave en Oaxaca
        </p>
      </div>

      {/* Resumen General */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="animate-fade-in">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              <div className="text-sm text-muted-foreground">Total Parcelas</div>
            </div>
            <div className="text-2xl font-bold text-primary mt-1">
              {plots.length}
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-secondary" />
              <div className="text-sm text-muted-foreground">Área Total</div>
            </div>
            <div className="text-2xl font-bold text-secondary mt-1">
              {formatNumber(plots.reduce((acc, plot) => acc + plot.area, 0), 1)} ha
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-investment" />
              <div className="text-sm text-muted-foreground">Total Plantas</div>
            </div>
            <div className="text-2xl font-bold text-investment mt-1">
              {formatNumber(plots.reduce((acc, plot) => acc + plot.totalPlants, 0))}
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-profit" />
              <div className="text-sm text-muted-foreground">Disponibles</div>
            </div>
            <div className="text-2xl font-bold text-profit mt-1">
              {formatNumber(plots.reduce((acc, plot) => acc + plot.availablePlants, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Parcelas */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Información Detallada de Parcelas</h2>
        
        {plots.map((plot) => (
          <Card key={plot.id} className="animate-fade-in border-l-4 border-l-primary">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-primary" />
                    {plot.name}
                  </CardTitle>
                  <CardDescription>
                    {plot.location} • {plot.coordinates}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(plot.status)}>
                  {plot.status}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Información Básica */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Área Total</div>
                  <div className="text-lg font-bold text-primary">
                    {formatNumber(plot.area, 1)} hectáreas
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Elevación: {formatNumber(plot.elevation)} m
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Capacidad Total</div>
                  <div className="text-lg font-bold text-investment">
                    {formatNumber(plot.totalPlants)} plantas
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Densidad: {formatNumber(plot.totalPlants / plot.area)} plantas/ha
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Disponibles</div>
                  <div className="text-lg font-bold text-profit">
                    {formatNumber(plot.availablePlants)} plantas
                  </div>
                  <div className="text-xs text-profit">
                    {getAvailabilityPercentage(plot.availablePlants, plot.totalPlants)}% disponible
                  </div>
                </div>
              </div>

              {/* Especies Cultivadas */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Leaf className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Especies Cultivadas</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {plot.species.map((species, index) => (
                    <Badge key={index} variant="outline" className="bg-secondary/10">
                      {species}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Condiciones Ambientales */}
              <div className="border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-muted-foreground mb-1">Tipo de Suelo</div>
                    <div>{plot.soilType}</div>
                  </div>
                  
                  <div>
                    <div className="font-medium text-muted-foreground mb-1">Precipitación</div>
                    <div>{formatNumber(plot.rainfall)} mm/año</div>
                  </div>
                  
                  <div>
                    <div className="font-medium text-muted-foreground mb-1">Temperatura</div>
                    <div>{plot.temperature}</div>
                  </div>
                  
                  <div>
                    <div className="font-medium text-muted-foreground mb-1">Última Actualización</div>
                    <div>{new Date(plot.lastUpdate).toLocaleDateString('es-MX')}</div>
                  </div>
                </div>
              </div>

              {/* Progreso de Disponibilidad */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">Disponibilidad de Plantas</div>
                  <div className="text-sm text-muted-foreground">
                    {plot.availablePlants} de {plot.totalPlants} disponibles
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-gradient-agave h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${getAvailabilityPercentage(plot.availablePlants, plot.totalPlants)}%`
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Información Adicional */}
      <Card className="animate-fade-in bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-primary">
            Agricultura Regenerativa
          </CardTitle>
          <CardDescription>
            Nuestro compromiso con prácticas sostenibles y regeneración del suelo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Nuestras parcelas en Oaxaca están diseñadas siguiendo principios de agricultura regenerativa, 
            promoviendo la biodiversidad, mejorando la estructura del suelo y maximizando la captura de carbono. 
            Cada parcela es monitoreada constantemente para asegurar las mejores condiciones de crecimiento 
            para nuestras plantas de agave.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-primary">100%</div>
              <div className="text-xs text-muted-foreground">Agricultura orgánica</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-secondary">24/7</div>
              <div className="text-xs text-muted-foreground">Monitoreo climático</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-contrast">GPS</div>
              <div className="text-xs text-muted-foreground">Rastreo por planta</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Plots;