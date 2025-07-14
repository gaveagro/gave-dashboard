
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Calculator, TrendingUp, Clock, Leaf, Info, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

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
  isReadyForHarvest: boolean;
  yearsToHarvest: number;
  actualHarvestYear: number;
}

export const InvestmentSimulator: React.FC = () => {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selectedSpecies, setSelectedSpecies] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('2025');
  const [numberOfPlants, setNumberOfPlants] = useState<number>(200);
  const [selectedPricePerKg, setSelectedPricePerKg] = useState<number[]>([12]);
  const [weightPerPlant, setWeightPerPlant] = useState<number[]>([50]);
  const [loading, setLoading] = useState(false);
  
  // Fetch species data
  const { data: plantSpecies } = useQuery({
    queryKey: ['plant-species-simulator'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plant_species')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch price data
  const { data: plantPrices } = useQuery({
    queryKey: ['plant-prices-simulator'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plant_prices')
        .select(`
          *,
          plant_species (name, scientific_name)
        `)
        .order('year', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Set default species when data loads
  React.useEffect(() => {
    if (plantSpecies && plantSpecies.length > 0 && !selectedSpecies) {
      setSelectedSpecies(plantSpecies[0].id);
    }
  }, [plantSpecies, selectedSpecies]);

  // Get current species data
  const currentSpecies = plantSpecies?.find(s => s.id === selectedSpecies);

  // Effect to adjust weight when species changes
  React.useEffect(() => {
    if (currentSpecies) {
      const defaultWeight = (currentSpecies.min_weight_kg + currentSpecies.max_weight_kg) / 2;
      setWeightPerPlant([defaultWeight]);
    }
  }, [currentSpecies]);

  // Get available years for selected species
  const availableYears = useMemo(() => {
    if (!plantPrices || !selectedSpecies) return [];
    return plantPrices
      .filter(price => price.species_id === selectedSpecies)
      .map(price => ({
        year: price.year.toString(),
        price: price.price_per_plant
      }));
  }, [plantPrices, selectedSpecies]);

  // Get current price per plant
  const currentPricePerPlant = useMemo(() => {
    if (!plantPrices || !selectedSpecies) return 250;
    const priceData = plantPrices.find(p => 
      p.species_id === selectedSpecies && p.year.toString() === selectedYear
    );
    return priceData ? priceData.price_per_plant : 250;
  }, [plantPrices, selectedSpecies, selectedYear]);

  const results: InvestmentResults = useMemo(() => {
    if (!currentSpecies) {
      return {
        totalInvestment: 0,
        finalReturn: 0,
        investorProfit: 0,
        gaveProfit: 0,
        totalYield: 0,
        grossRevenue: 0,
        roi: 0,
        totalCarbonCapture: 0,
        maturationDate: new Date(),
        avgWeightPerPlant: 0,
        isReadyForHarvest: false,
        yearsToHarvest: 0,
        actualHarvestYear: 0
      };
    }

    const currentYear = new Date().getFullYear();
    const establishmentYear = parseInt(selectedYear);
    const yearsGrown = currentYear - establishmentYear;
    const yearsToHarvest = Math.max(0, currentSpecies.maturation_years - yearsGrown);
    const isReadyForHarvest = yearsToHarvest === 0;
    const actualHarvestYear = isReadyForHarvest ? currentYear : currentYear + yearsToHarvest;

    // 1. Datos base
    const pricePerPlant = currentPricePerPlant;
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
    
    // 5. Cálculo de CO2: usando carbon_capture_per_plant de la base de datos
    const carbonCapturePerPlant = currentSpecies.carbon_capture_per_plant || 0.072;
    const totalCarbonCapture = numberOfPlants * carbonCapturePerPlant * Math.max(yearsGrown, currentSpecies.maturation_years);
    
    const maturationDate = new Date(actualHarvestYear, 0, 1);

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
      avgWeightPerPlant,
      isReadyForHarvest,
      yearsToHarvest,
      actualHarvestYear
    };
  }, [currentSpecies, numberOfPlants, selectedPricePerKg, weightPerPlant, currentPricePerPlant, selectedYear]);

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
        title: t('simulator.accessRequired'),
        description: t('simulator.loginRequired'),
        variant: "destructive"
      });
      return;
    }

    if (!currentSpecies) {
      toast({
        title: "Error",
        description: "Por favor selecciona una especie",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Guardar solicitud en la base de datos
      const { data: requestData, error: dbError } = await supabase
        .from('investment_requests')
        .insert({
          user_id: user.id,
          user_email: profile.email,
          user_name: profile.name || profile.email,
          user_phone: profile.phone,
          plant_count: numberOfPlants,
          species_name: currentSpecies.name,
          establishment_year: parseInt(selectedYear),
          total_investment: results.totalInvestment,
          weight_per_plant: weightPerPlant[0],
          price_per_kg: selectedPricePerKg[0],
          status: 'pending'
        })
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      // Enviar notificación por email
      const response = await supabase.functions.invoke('send-investment-notification', {
        body: {
          userEmail: profile.email,
          userName: profile.name || profile.email,
          userPhone: profile.phone,
          plantCount: numberOfPlants,
          speciesName: currentSpecies.name,
          establishmentYear: parseInt(selectedYear),
          totalInvestment: results.totalInvestment,
          weightPerPlant: weightPerPlant[0],
          pricePerKg: selectedPricePerKg[0]
        }
      });

      if (response.error) {
        console.error('Error sending email notification:', response.error);
        // No fallar si el email no se envía, la solicitud ya está guardada
      }

      toast({
        title: t('simulator.requestSent'),
        description: t('simulator.requestDesc'),
      });
    } catch (error) {
      console.error('Error sending investment request:', error);
      toast({
        title: "Error",
        description: t('simulator.requestError'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!plantSpecies || !currentSpecies) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">Cargando simulador...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-agave bg-clip-text text-transparent">
          {t('simulator.title')}
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {t('simulator.description')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Panel de Configuración */}
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              {t('simulator.configTitle')}
            </CardTitle>
            <CardDescription>
              {t('simulator.configDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Selector de Especie */}
            <div className="space-y-2">
              <Label htmlFor="species">{t('simulator.species')}</Label>
              <Select value={selectedSpecies} onValueChange={setSelectedSpecies}>
                <SelectTrigger>
                  <SelectValue placeholder={t('simulator.selectSpecies')} />
                </SelectTrigger>
                <SelectContent>
                  {plantSpecies.map((species) => (
                    <SelectItem key={species.id} value={species.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{species.name}</span>
                        <span className="text-xs text-muted-foreground">{species.scientific_name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {currentSpecies.description}
              </p>
            </div>

            {/* Año de Establecimiento */}
            <div className="space-y-2">
              <Label htmlFor="year">{t('simulator.year')}</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder={t('simulator.selectYear')} />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(({ year, price }) => (
                    <SelectItem key={year} value={year}>
                      {year} - {formatCurrency(price)} por planta
                    </SelectItem>
                  ))}
                  {availableYears.length === 0 && (
                    <SelectItem value="2025">2025 - $250 MXN por planta (precio por defecto)</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {results.isReadyForHarvest && (
                <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                  <AlertTriangle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700">
                    ¡Estas plantas ya están listas para cosechar!
                  </span>
                </div>
              )}
              {results.yearsToHarvest > 0 && (
                <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-amber-700">
                    Faltan {results.yearsToHarvest} años para la cosecha
                  </span>
                </div>
              )}
            </div>

            {/* Número de Plantas */}
            <div className="space-y-2">
              <Label htmlFor="plants">{t('simulator.plants')}</Label>
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
                {t('simulator.plantsRange')}
              </p>
            </div>

            {/* Peso Esperado por Planta */}
            <div className="space-y-4">
              <Label>{t('simulator.weightPerPlant')}</Label>
              <div className="px-3">
                <Slider
                  value={weightPerPlant}
                  onValueChange={setWeightPerPlant}
                  max={currentSpecies.max_weight_kg}
                  min={currentSpecies.min_weight_kg}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{currentSpecies.min_weight_kg} kg</span>
                <span className="font-medium text-primary text-lg">
                  {formatNumber(weightPerPlant[0])} {t('simulator.weightPerPlantUnit')}
                </span>
                <span>{currentSpecies.max_weight_kg} kg</span>
              </div>
            </div>

            {/* Precio Esperado por Kg */}
            <div className="space-y-4">
              <Label>{t('simulator.pricePerKg')}</Label>
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
                  {formatCurrency(selectedPricePerKg[0])} {t('simulator.pricePerKgUnit')}
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
                {t('simulator.initialInvestment')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-investment">
                {formatCurrency(results.totalInvestment)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {formatNumber(numberOfPlants)} plantas × {formatCurrency(currentPricePerPlant)}
              </p>
            </CardContent>
          </Card>

          {/* Retorno Final */}
          <Card className="animate-fade-in border-profit/20 bg-gradient-to-br from-profit/5 to-profit/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-profit flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {t('simulator.finalReturn')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-profit">
                {formatCurrency(results.finalReturn)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {t('simulator.returnDesc')}
              </p>
            </CardContent>
          </Card>

          {/* Ganancia Neta */}
          <Card className="animate-fade-in border-roi/20 bg-gradient-to-br from-roi/5 to-roi/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-roi flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {t('simulator.netProfit')}
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
                {t('simulator.harvestBreakdown')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">{t('simulator.totalWeight')}</span>
                <span className="font-medium">{formatNumber(results.totalYield)} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">{t('simulator.grossValue')}</span>
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
              {t('simulator.maturationTime')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {results.isReadyForHarvest ? "¡Lista!" : `${results.yearsToHarvest} años`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('simulator.harvestDate')}: {results.maturationDate.toLocaleDateString('es-MX', { 
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
              {t('simulator.environmentalImpact')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(results.totalCarbonCapture, 1)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('simulator.carbonCapture')}
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
          {loading ? 'Enviando solicitud...' : t('simulator.proceed')}
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
