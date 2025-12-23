
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDemo } from '@/contexts/DemoContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TreePine, Coins, Leaf, Calendar, Plus, TrendingUp, BarChart3, Sprout, Bell, AlertTriangle } from 'lucide-react';
import NotificationsPanel from '@/components/NotificationsPanel';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import MonitoringDashboard from '@/components/monitoring/MonitoringDashboard';

const Dashboard = () => {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { isDemoMode, demoData } = useDemo();
  const [showInvestmentRequestDialog, setShowInvestmentRequestDialog] = useState(false);
  const [requestData, setRequestData] = useState({
    user_name: '',
    user_email: user?.email || '',
    user_phone: '',
    plant_count: 0,
    species_name: '',
    establishment_year: new Date().getFullYear(),
    total_investment: 0
  });

  // Fetch user's investments (or use demo data)
  const { data: investments } = useQuery({
    queryKey: ['user-investments', user?.id, isDemoMode],
    queryFn: async () => {
      if (profile?.role === 'demo' || isDemoMode) {
        return demoData.investments;
      }
      
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('investments')
        .select(`
          *,
          plant_species (
            name,
            maturation_years
          )
        `)
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch plant species and prices for the request form
  const { data: plantSpecies } = useQuery({
    queryKey: ['plant-species'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plant_species')
        .select('*');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: plantPrices } = useQuery({
    queryKey: ['plant-prices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plant_prices')
        .select(`
          *,
          plant_species (name)
        `);
      
      if (error) throw error;
      return data;
    },
  });

  // Calculate total investment based on plants and price per plant
  React.useEffect(() => {
    if (requestData.plant_count && requestData.species_name && requestData.establishment_year) {
      const priceKey = plantPrices?.find(p => 
        p.plant_species.name === requestData.species_name && 
        p.year === requestData.establishment_year
      );
      if (priceKey) {
        const calculatedTotal = requestData.plant_count * priceKey.price_per_plant;
        setRequestData(prev => ({ ...prev, total_investment: calculatedTotal }));
      }
    }
  }, [requestData.plant_count, requestData.species_name, requestData.establishment_year, plantPrices]);

  const handleSubmitRequest = async () => {
    if (profile?.role === 'demo') {
      toast({
        title: "Función no disponible en el demo",
        description: "Para realizar inversiones reales, regístrate como usuario",
        variant: "destructive"
      });
      return;
    }

    try {
      // Calculate final investment if not already done
      let finalTotal = requestData.total_investment;
      if (requestData.plant_count && requestData.species_name && requestData.establishment_year) {
        const priceKey = plantPrices?.find(p => 
          p.plant_species.name === requestData.species_name && 
          p.year === requestData.establishment_year
        );
        if (priceKey) {
          finalTotal = requestData.plant_count * priceKey.price_per_plant;
        }
      }

      const { error } = await supabase
        .from('investment_requests')
        .insert([{
          user_id: user?.id,
          ...requestData,
          total_investment: finalTotal,
          weight_per_plant: 50, // Default weight
          price_per_kg: 12      // Default price per kg
        }]);

      if (error) throw error;

      // Send notification email
      await supabase.functions.invoke('send-investment-notification', {
        body: {
          ...requestData,
          total_investment: finalTotal
        }
      });

      toast({
        title: t('dashboard.requestSent'),
        description: t('dashboard.requestSuccess')
      });

      setShowInvestmentRequestDialog(false);
      setRequestData({
        user_name: '',
        user_email: user?.email || '',
        user_phone: '',
        plant_count: 0,
        species_name: '',
        establishment_year: new Date().getFullYear(),
        total_investment: 0
      });

    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast({
        title: "Error",
        description: "Error al enviar la solicitud",
        variant: "destructive"
      });
    }
  };

  // Calculate statistics
  const totalPlants = investments?.reduce((sum, inv) => sum + inv.plant_count, 0) || 0;
  const totalInvestment = investments?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0;
  
  // Calculate CO2 captured: 30 tons per hectare per year, 2500 plants per hectare
  // So each plant captures: 30/2500 = 0.012 tons per year = 12 kg per year
  const currentYear = new Date().getFullYear();
  const totalCO2Captured = investments?.reduce((sum, inv) => {
    const yearsGrown = Math.max(0, currentYear - inv.plantation_year);
    const co2PerPlantPerYear = 12; // kg per plant per year
    return sum + (inv.plant_count * co2PerPlantPerYear * yearsGrown);
  }, 0) || 0;

  // Find next harvest
  const nextHarvest = investments?.reduce((closest, inv) => {
    if (!closest || inv.expected_harvest_year < closest.expected_harvest_year) {
      return inv;
    }
    return closest;
  }, null as any);

  // Calculate average progress
  const averageProgress = investments?.length ? investments.reduce((sum, inv) => {
    const yearsGrown = currentYear - inv.plantation_year;
    const maturationYears = inv.plant_species?.maturation_years || 8;
    const progress = Math.min((yearsGrown / maturationYears) * 100, 100);
    return sum + progress;
  }, 0) / investments.length : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Demo Badge */}
      {profile?.role === 'demo' && (
        <div className="bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <div className="flex-1">
            <h3 className="font-semibold text-orange-800">{t('dashboard.demoMode')}</h3>
            <p className="text-sm text-orange-700">
              {t('dashboard.demoDescription')} 
              <a 
                href="https://www.gaveagro.com" 
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 underline font-medium hover:text-orange-900"
              >
                regístrate aquí
              </a>
            </p>
          </div>
        </div>
      )}
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            {t('dashboard.portfolio')}
          </h1>
          <p className="text-xl text-muted-foreground">
            {t('dashboard.portfolioDesc')}
          </p>
        </div>
        <Button 
          onClick={() => {
            if (profile?.role === 'demo') {
              toast({
                title: "Función no disponible en el demo",
                description: "Para realizar inversiones reales, regístrate como usuario",
                variant: "destructive"
              });
            } else {
              setShowInvestmentRequestDialog(true);
            }
          }}
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 text-lg"
          size="lg"
          disabled={profile?.role === 'demo'}
        >
          <Plus className="h-5 w-5 mr-2" />
          {t('dashboard.newInvestment')}
        </Button>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
              {t('dashboard.establishedPlants')}
            </CardTitle>
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
              <TreePine className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700 dark:text-green-300">
              {totalPlants.toLocaleString()}
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              {t('dashboard.agavesGrowing')}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {t('dashboard.totalInvestment')}
            </CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Coins className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
              {formatCurrency(totalInvestment)}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {t('dashboard.investedCapital')}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              {t('dashboard.co2Captured')}
            </CardTitle>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-full">
              <Leaf className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
              {totalCO2Captured.toLocaleString()} kg
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              {t('dashboard.positiveImpact')}
            </p>
            <div className="mt-3 p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium mb-1">
                {t('dashboard.co2Calculation')}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 leading-relaxed">
                {t('dashboard.co2Description')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">
              {t('dashboard.nextHarvest')}
            </CardTitle>
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-full">
              <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-700 dark:text-orange-300">
              {nextHarvest ? nextHarvest.expected_harvest_year : 'N/A'}
            </div>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              {nextHarvest ? `${nextHarvest.plant_count.toLocaleString()} plantas` : t('dashboard.noActiveInvestments')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview - Only Progress by Investment */}
      {investments && investments.length > 0 && (
        <div className="grid grid-cols-1 gap-6">
          {/* Detailed Investment Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sprout className="h-5 w-5 text-green-600" />
                {t('dashboard.progressByInvestment')}
              </CardTitle>
              <CardDescription>
                {t('dashboard.maturationStatus')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {investments.map((investment) => {
                const yearsGrown = currentYear - investment.plantation_year;
                const maturationYears = investment.plant_species?.maturation_years || 8;
                const progress = Math.min((yearsGrown / maturationYears) * 100, 100);
                
                return (
                  <div key={investment.id} className="space-y-3 p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border border-green-200 dark:border-green-800">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h4 className="font-semibold text-green-800 dark:text-green-200">
                          {investment.plant_species?.name}
                        </h4>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          {investment.plant_count.toLocaleString()} plantas • Establecido en {investment.plantation_year}
                        </p>
                        <p className="text-xs text-green-500 dark:text-green-500">
                          Inversión: {formatCurrency(investment.total_amount)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                          {Math.round(progress)}%
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          {yearsGrown} de {maturationYears} años
                        </p>
                      </div>
                    </div>
                    <Progress value={progress} className="h-3 [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-teal-500" />
                    {progress >= 100 && (
                      <div className="flex items-center gap-1 text-green-700 dark:text-green-300">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-sm font-medium">{t('dashboard.readyForHarvest')}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monitoring Dashboard Section */}
      <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <BarChart3 className="h-5 w-5" />
            {t('monitoring.title')}
          </CardTitle>
          <CardDescription className="text-blue-600 dark:text-blue-400">
            {t('monitoring.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MonitoringDashboard 
            plotName="El Sabinal"
          />
        </CardContent>
      </Card>

      {investments && investments.length === 0 && (
        <Card className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900 dark:to-slate-900">
          <CardContent className="py-12 text-center">
            <TreePine className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-2xl font-semibold mb-2">{t('dashboard.startForestJourney')}</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {t('dashboard.noInvestmentsDesc')}
            </p>
            <Button 
              onClick={() => {
                if (profile?.role === 'demo') {
                  toast({
                    title: "Función no disponible en el demo",
                    description: "Para realizar inversiones reales, regístrate como usuario",
                    variant: "destructive"
                  });
                } else {
                  setShowInvestmentRequestDialog(true);
                }
              }}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              size="lg"
              disabled={profile?.role === 'demo'}
            >
              <Plus className="h-5 w-5 mr-2" />
              {t('dashboard.firstInvestment')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Notifications Panel */}
      <NotificationsPanel />

      {/* Investment Request Dialog */}
      <Dialog open={showInvestmentRequestDialog} onOpenChange={setShowInvestmentRequestDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('dashboard.requestNewInvestment')}</DialogTitle>
            <DialogDescription>
              {t('dashboard.newInvestmentDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user-name">{t('dashboard.fullName')}</Label>
                <Input 
                  id="user-name" 
                  value={requestData.user_name}
                  onChange={(e) => setRequestData({...requestData, user_name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-phone">{t('dashboard.phone')}</Label>
                <Input 
                  id="user-phone" 
                  value={requestData.user_phone}
                  onChange={(e) => setRequestData({...requestData, user_phone: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="species">{t('dashboard.species')}</Label>
              <Select value={requestData.species_name} onValueChange={(value) => setRequestData({...requestData, species_name: value})}>
                <SelectTrigger>
                  <SelectValue placeholder={t('dashboard.selectSpecies')} />
                </SelectTrigger>
                <SelectContent>
                  {plantSpecies?.map((species) => (
                    <SelectItem key={species.id} value={species.name}>
                      {species.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plant-count">{t('dashboard.plantCount')}</Label>
                <Input 
                  id="plant-count" 
                  type="number"
                  value={requestData.plant_count}
                  onChange={(e) => setRequestData({...requestData, plant_count: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="establishment-year">{t('dashboard.establishmentYear')}</Label>
                <Input 
                  id="establishment-year" 
                  type="number"
                  value={requestData.establishment_year}
                  onChange={(e) => setRequestData({...requestData, establishment_year: parseInt(e.target.value) || new Date().getFullYear()})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="total-investment">{t('dashboard.totalInvestmentAmount')}</Label>
              <Input 
                id="total-investment" 
                type="number"
                step="0.01"
                value={requestData.total_investment}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Calculado automáticamente: {requestData.plant_count} plantas × precio por planta
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowInvestmentRequestDialog(false)}>
              {t('dashboard.cancel')}
            </Button>
            <Button onClick={handleSubmitRequest}>
              {t('dashboard.sendRequest')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Platform Footer */}
      <div className="text-center pt-8 border-t border-muted mt-8">
        <p className="text-lg font-semibold text-muted-foreground">
          {t('investments.platformTitle')}
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
