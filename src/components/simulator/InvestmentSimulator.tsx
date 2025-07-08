import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Calculator, TrendingUp, Clock, Leaf, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Datos exactos del simulador según especificaciones
const speciesData = {
  'Espadín': {
    scientificName: 'Agave angustifolia Haw',
    maturationYears: 5,
    weightRange: { min: 40, max: 60 }, // kg por planta configurable
    description: 'Especie principal de Gavé, ideal para mezcal'
  },
  'Salmiana': {
    scientificName: 'Agave Salmiana ssp. Crassispina',
    maturationYears: 7,
    weightRange: { min: 60, max: 90 }, // kg por planta configurable
    description: 'Especie de crecimiento lento pero alto rendimiento'
  },
  'Atrovirens': {
    scientificName: 'Agave Atrovirens',
    maturationYears: 7,
    weightRange: { min: 60, max: 90 }, // kg por planta configurable
    description: 'Especie robusta de alto rendimiento'
  }
};

// CO2 capturado: 30-60 toneladas por año por hectárea
// Densidad: 2,500 plantas por hectárea
const carbonCapturePerHectarePerYear = { min: 30, max: 60 }; // toneladas CO₂
const plantsPerHectare = 2500;

// Los precios ahora se cargan dinámicamente desde la base de datos

interface InvestmentResults {
  totalInvestment: number;
  finalReturn: number;
  investorProfit: number;
  gaveProfit: number;
  totalYield: number;
  grossRevenue: number;
  roi: number;
  totalCarbonCapture: number;
  maturationDate: Date;
  avgWeightPerPlant: number;
}

export const InvestmentSimulator: React.FC = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [selectedSpecies, setSelectedSpecies] = useState<string>('Espadín');
  const [selectedYear, setSelectedYear] = useState<string>('2025');
  const [numberOfPlants, setNumberOfPlants] = useState<number>(200);
  const [selectedPricePerKg, setSelectedPricePerKg] = useState<number[]>([12]);
  const [weightPerPlant, setWeightPerPlant] = useState<number[]>([50]);
  const [loading, setLoading] = useState(false);
  const [plantPrices, setPlantPrices] = useState<Record<string, number>>({});
  const [plantSpeciesMap, setPlantSpeciesMap] = useState<Record<string, string>>({});
  
  // Cargar precios desde la base de datos
  React.useEffect(() => {
    const fetchPrices = async () => {
      try {
        const { data: pricesData } = await supabase
          .from('plant_prices')
          .select(`
            *,
            plant_species (name, scientific_name)
          `);
        
        const { data: speciesData } = await supabase
          .from('plant_species')
          .select('*');

        // Crear mapas de precios por año y especie
        const priceMap: Record<string, number> = {};
        const speciesMap: Record<string, string> = {};
        
        pricesData?.forEach(price => {
          const key = `${price.plant_species.name}-${price.year}`;
          priceMap[key] = price.price_per_plant;
        });
        
        speciesData?.forEach(species => {
          speciesMap[species.name] = species.id;
        });

        setPlantPrices(priceMap);
        setPlantSpeciesMap(speciesMap);
      } catch (error) {
        console.error('Error fetching prices:', error);
      }
    };

    fetchPrices();
  }, []);

  // Efecto para ajustar el peso cuando cambia la especie
  React.useEffect(() => {
    const species = speciesData[selectedSpecies as keyof typeof speciesData];
    const defaultWeight = (species.weightRange.min + species.weightRange.max) / 2;
    setWeightPerPlant([defaultWeight]);
  }, [selectedSpecies]);

  const results: InvestmentResults = useMemo(() => {
    // 1. Datos base
    const species = speciesData[selectedSpecies as keyof typeof speciesData];
    const priceKey = `${selectedSpecies}-${selectedYear}`;
    const pricePerPlant = plantPrices[priceKey] || 250; // fallback price
    const totalInvestment = numberOfPlants * pricePerPlant;

    // 2. Cálculo de rendimiento
    const avgWeightPerPlant = weightPerPlant[0];
    const totalYield = numberOfPlants * avgWeightPerPlant;
    const grossRevenue = totalYield * selectedPricePerKg[0];

    // 3. División de ganancias
    const totalProfit = grossRevenue - totalInvestment;
    const investorProfit = totalProfit * 0.65; // 65% inversionista
    const gaveProfit = totalProfit * 0.35; // 35% Gavé

    // 4. Métricas finales
    const finalReturn = totalInvestment + investorProfit;
    const roi = totalInvestment > 0 ? (investorProfit / totalInvestment) * 100 : 0;
    
    // 5. Cálculo correcto de CO2: 30-60 ton/año/hectárea, 2500 plantas/hectárea
    const hectares = numberOfPlants / plantsPerHectare;
    const avgCO2PerHectarePerYear = (carbonCapturePerHectarePerYear.min + carbonCapturePerHectarePerYear.max) / 2;
    const totalCarbonCapture = hectares * avgCO2PerHectarePerYear * species.maturationYears;
    
    const maturationDate = new Date(Date.now() + species.maturationYears * 365 * 24 * 60 * 60 * 1000);

    return {
      totalInvestment,
      finalReturn,
      investorProfit,
      gaveProfit,
      totalYield,
      grossRevenue,
      roi,
      totalCarbonCapture,
      maturationDate,
      avgWeightPerPlant
    };
  }, [selectedSpecies, selectedYear, numberOfPlants, selectedPricePerKg, weightPerPlant, plantPrices]);

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

  const handleProceedWithInvestment = async () => {
    if (!user || !profile) {
      toast({
        title: "Acceso requerido",
        description: "Debes iniciar sesión para proceder con la inversión",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await supabase.functions.invoke('send-investment-notification', {
        body: {
          userEmail: profile.email,
          userName: profile.name || profile.email,
          userPhone: profile.phone,
          plantCount: numberOfPlants,
          speciesName: selectedSpecies,
          establishmentYear: parseInt(selectedYear),
          totalInvestment: results.totalInvestment,
          weightPerPlant: weightPerPlant[0],
          pricePerKg: selectedPricePerKg[0]
        }
      });

      if (response.error) {
        throw response.error;
      }

      toast({
        title: "Solicitud enviada",
        description: "Hemos recibido tu interés en esta inversión. Nos pondremos en contacto contigo pronto.",
      });
    } catch (error) {
      console.error('Error sending investment notification:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar la solicitud. Intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-agave bg-clip-text text-transparent">
          Simulador de Inversión Gavé
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Calcula el retorno de tu inversión en plantaciones de agave para producción de mezcal
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Panel de Configuración */}
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Configuración de Inversión
            </CardTitle>
            <CardDescription>
              Ajusta los parámetros para calcular tu inversión
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Selector de Especie */}
            <div className="space-y-2">
              <Label htmlFor="species">Especie de Agave</Label>
              <Select value={selectedSpecies} onValueChange={setSelectedSpecies}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una especie" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(speciesData).map(([name, data]) => (
                    <SelectItem key={name} value={name}>
                      <div className="flex flex-col">
                        <span className="font-medium">{name}</span>
                        <span className="text-xs text-muted-foreground">{data.scientificName}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {speciesData[selectedSpecies as keyof typeof speciesData].description}
              </p>
            </div>

            {/* Año de Establecimiento */}
            <div className="space-y-2">
              <Label htmlFor="year">Año de Establecimiento</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un año" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(plantPrices)
                    .filter(key => key.startsWith(selectedSpecies + '-'))
                    .map(key => {
                      const year = key.split('-')[1];
                      const price = plantPrices[key];
                      return (
                        <SelectItem key={year} value={year}>
                          {year} - {formatCurrency(price)} por planta
                        </SelectItem>
                      );
                    })
                  }
                  {Object.keys(plantPrices).filter(key => key.startsWith(selectedSpecies + '-')).length === 0 && (
                    <SelectItem value="2025">2025 - $250 MXN por planta (precio por defecto)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Número de Plantas */}
            <div className="space-y-2">
              <Label htmlFor="plants">Número de Plantas</Label>
              <Input
                id="plants"
                type="number"
                min="1"
                max="1000"
                value={numberOfPlants}
                onChange={(e) => setNumberOfPlants(parseInt(e.target.value) || 1)}
                className="text-lg font-medium"
              />
              <p className="text-sm text-muted-foreground">
                Mínimo 1, máximo 1,000 plantas
              </p>
            </div>

            {/* Peso Esperado por Planta */}
            <div className="space-y-4">
              <Label>Peso Esperado por Planta</Label>
              <div className="px-3">
                <Slider
                  value={weightPerPlant}
                  onValueChange={setWeightPerPlant}
                  max={speciesData[selectedSpecies as keyof typeof speciesData].weightRange.max}
                  min={speciesData[selectedSpecies as keyof typeof speciesData].weightRange.min}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{speciesData[selectedSpecies as keyof typeof speciesData].weightRange.min} kg</span>
                <span className="font-medium text-primary text-lg">
                  {formatNumber(weightPerPlant[0])} kg por planta
                </span>
                <span>{speciesData[selectedSpecies as keyof typeof speciesData].weightRange.max} kg</span>
              </div>
            </div>

            {/* Precio Esperado por Kg */}
            <div className="space-y-4">
              <Label>Precio Esperado por Kg de Agave</Label>
              <div className="px-3">
                <Slider
                  value={selectedPricePerKg}
                  onValueChange={setSelectedPricePerKg}
                  max={50}
                  min={0}
                  step={0.5}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>$0 MXN</span>
                <span className="font-medium text-primary text-lg">
                  {formatCurrency(selectedPricePerKg[0])} por kg
                </span>
                <span>$50 MXN</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Panel de Resultados */}
        <div className="space-y-4">
          {/* Inversión Inicial */}
          <Card className="animate-fade-in border-investment/20 bg-gradient-to-br from-investment/5 to-investment/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-investment flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Inversión Inicial
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-investment">
                {formatCurrency(results.totalInvestment)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {formatNumber(numberOfPlants)} plantas × {formatCurrency(plantPrices[`${selectedSpecies}-${selectedYear}`] || 250)}
              </p>
            </CardContent>
          </Card>

          {/* Retorno Final */}
          <Card className="animate-fade-in border-profit/20 bg-gradient-to-br from-profit/5 to-profit/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-profit flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Retorno Final
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-profit">
                {formatCurrency(results.finalReturn)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Inversión + 65% de utilidades
              </p>
            </CardContent>
          </Card>

          {/* Ganancia Neta */}
          <Card className="animate-fade-in border-roi/20 bg-gradient-to-br from-roi/5 to-roi/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-roi flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Ganancia Neta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-roi">
                {formatCurrency(results.investorProfit)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                ROI: {formatNumber(results.roi, 1)}%
              </p>
            </CardContent>
          </Card>

          {/* Desglose de Cosecha */}
          <Card className="animate-fade-in border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-accent flex items-center gap-2">
                <Leaf className="h-5 w-5" />
                Desglose de Cosecha
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Peso total:</span>
                <span className="font-medium">{formatNumber(results.totalYield)} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Valor bruto:</span>
                <span className="font-medium">{formatCurrency(results.grossRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Comisión Gavé (35%):</span>
                <span className="font-medium">{formatCurrency(results.gaveProfit)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Métricas Adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Tiempo de Maduración
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {speciesData[selectedSpecies as keyof typeof speciesData].maturationYears} años
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Cosecha estimada: {results.maturationDate.toLocaleDateString('es-MX', { 
                year: 'numeric', 
                month: 'long' 
              })}
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="h-4 w-4" />
              Modelo de Ganancia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">65% / 35%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Inversionista / Gavé
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Leaf className="h-4 w-4" />
              Impacto Ambiental
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(results.totalCarbonCapture, 1)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Toneladas CO₂ capturadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Botón de Acción */}
      <div className="text-center">
        <Button 
          size="lg" 
          className="bg-gradient-agave hover:opacity-90 transition-all duration-300"
          onClick={handleProceedWithInvestment}
          disabled={loading}
        >
          {loading ? 'Enviando solicitud...' : 'Proceder con esta Inversión'}
        </Button>
        <p className="text-sm text-muted-foreground mt-2">
          * Los cálculos son estimaciones basadas en condiciones promedio de cultivo
        </p>
        {!user && (
          <p className="text-sm text-amber-600 mt-2">
            Inicia sesión para enviar tu solicitud de inversión
          </p>
        )}
      </div>
    </div>
  );
};

export default InvestmentSimulator;