
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TreePine, Coins, Leaf, Calendar, Plus, TrendingUp, BarChart3, Sprout } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
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

  // Fetch user's investments
  const { data: investments } = useQuery({
    queryKey: ['user-investments', user?.id],
    queryFn: async () => {
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

  // Fetch plant species for the request form
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

  const handleSubmitRequest = async () => {
    try {
      const { error } = await supabase
        .from('investment_requests')
        .insert([{
          user_id: user?.id,
          ...requestData,
          weight_per_plant: 0, // Set default value
          price_per_kg: 0      // Set default value
        }]);

      if (error) throw error;

      // Send notification email
      await supabase.functions.invoke('send-investment-notification', {
        body: requestData
      });

      toast({
        title: "Solicitud enviada",
        description: "Tu solicitud de inversión ha sido enviada correctamente"
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
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Tu Portafolio Forestal
          </h1>
          <p className="text-xl text-muted-foreground">
            Invierte en el futuro del planeta, cosecha prosperidad
          </p>
        </div>
        <Button 
          onClick={() => setShowInvestmentRequestDialog(true)}
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 text-lg"
          size="lg"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nueva Inversión
        </Button>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
              Plantas Establecidas
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
              árboles creciendo para ti
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Inversión Total
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
              capital comprometido
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              CO₂ Secuestrado
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
              impacto ambiental positivo
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">
              Próxima Cosecha
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
              {nextHarvest ? `${nextHarvest.plant_count.toLocaleString()} plantas` : 'Sin inversiones activas'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview */}
      {investments && investments.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overall Progress Card */}
          <Card className="lg:col-span-1 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                <BarChart3 className="h-5 w-5" />
                Progreso General
              </CardTitle>
              <CardDescription>
                Estado promedio de maduración
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-5xl font-bold text-purple-700 dark:text-purple-300 mb-2">
                  {Math.round(averageProgress)}%
                </div>
                <p className="text-sm text-purple-600 dark:text-purple-400">
                  madurez promedio
                </p>
              </div>
              <Progress value={averageProgress} className="h-3" />
            </CardContent>
          </Card>

          {/* Detailed Investment Progress */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sprout className="h-5 w-5 text-green-600" />
                Progreso por Inversión
              </CardTitle>
              <CardDescription>
                Estado de maduración de tus plantaciones
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
                    <Progress value={progress} className="h-3" />
                    {progress >= 100 && (
                      <div className="flex items-center gap-1 text-green-700 dark:text-green-300">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-sm font-medium">¡Listo para cosecha!</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {investments && investments.length === 0 && (
        <Card className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900 dark:to-slate-900">
          <CardContent className="py-12 text-center">
            <TreePine className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-2xl font-semibold mb-2">Comienza tu Viaje Forestal</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Aún no tienes inversiones. ¡Empieza hoy y contribuye al cuidado del medio ambiente mientras generas rendimientos!
            </p>
            <Button 
              onClick={() => setShowInvestmentRequestDialog(true)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              size="lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Mi Primera Inversión
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Investment Request Dialog */}
      <Dialog open={showInvestmentRequestDialog} onOpenChange={setShowInvestmentRequestDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Solicitar Nueva Inversión</DialogTitle>
            <DialogDescription>
              Envía una solicitud para una nueva inversión forestal. Nuestro equipo revisará tu solicitud y se pondrá en contacto contigo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user-name">Nombre completo</Label>
                <Input 
                  id="user-name" 
                  value={requestData.user_name}
                  onChange={(e) => setRequestData({...requestData, user_name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-phone">Teléfono</Label>
                <Input 
                  id="user-phone" 
                  value={requestData.user_phone}
                  onChange={(e) => setRequestData({...requestData, user_phone: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="species">Especie</Label>
              <Select value={requestData.species_name} onValueChange={(value) => setRequestData({...requestData, species_name: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una especie" />
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
                <Label htmlFor="plant-count">Cantidad de plantas</Label>
                <Input 
                  id="plant-count" 
                  type="number"
                  value={requestData.plant_count}
                  onChange={(e) => setRequestData({...requestData, plant_count: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="establishment-year">Año de establecimiento</Label>
                <Input 
                  id="establishment-year" 
                  type="number"
                  value={requestData.establishment_year}
                  onChange={(e) => setRequestData({...requestData, establishment_year: parseInt(e.target.value) || new Date().getFullYear()})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="total-investment">Inversión total</Label>
              <Input 
                id="total-investment" 
                type="number"
                step="0.01"
                value={requestData.total_investment}
                onChange={(e) => setRequestData({...requestData, total_investment: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowInvestmentRequestDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitRequest}>
              Enviar Solicitud
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
