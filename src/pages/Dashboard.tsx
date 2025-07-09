
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
import { TreePine, Coins, Leaf, Calendar, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
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
    total_investment: 0,
    weight_per_plant: 0,
    price_per_kg: 0
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
          ...requestData
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
        total_investment: 0,
        weight_per_plant: 0,
        price_per_kg: 0
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Bienvenido a tu panel de inversiones forestales
          </p>
        </div>
        <Button onClick={() => setShowInvestmentRequestDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Inversión
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Plantas Totales
            </CardTitle>
            <TreePine className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPlants.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              plantas establecidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inversión Total
            </CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalInvestment)}</div>
            <p className="text-xs text-muted-foreground">
              invertido hasta la fecha
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              CO₂ Secuestrado
            </CardTitle>
            <Leaf className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCO2Captured.toLocaleString()} kg</div>
            <p className="text-xs text-muted-foreground">
              hasta la fecha
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Próxima Cosecha
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {nextHarvest ? nextHarvest.expected_harvest_year : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {nextHarvest ? `${nextHarvest.plant_count.toLocaleString()} plantas` : 'Sin inversiones'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Investments Progress */}
      {investments && investments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Progreso de Inversiones</CardTitle>
            <CardDescription>
              Estado de maduración de tus plantas por especie
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {investments.map((investment) => {
              const yearsGrown = currentYear - investment.plantation_year;
              const maturationYears = investment.plant_species?.maturation_years || 8;
              const progress = Math.min((yearsGrown / maturationYears) * 100, 100);
              
              return (
                <div key={investment.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{investment.plant_species?.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {investment.plant_count.toLocaleString()} plantas • Establecido en {investment.plantation_year}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{Math.round(progress)}%</p>
                      <p className="text-xs text-muted-foreground">
                        {yearsGrown} de {maturationYears} años
                      </p>
                    </div>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Investment Request Dialog */}
      <Dialog open={showInvestmentRequestDialog} onOpenChange={setShowInvestmentRequestDialog}>
        <DialogContent className="sm:max-w-[600px]">
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
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight-per-plant">Peso por planta (kg)</Label>
                <Input 
                  id="weight-per-plant" 
                  type="number"
                  step="0.01"
                  value={requestData.weight_per_plant}
                  onChange={(e) => setRequestData({...requestData, weight_per_plant: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price-per-kg">Precio por kg</Label>
                <Input 
                  id="price-per-kg" 
                  type="number"
                  step="0.01"
                  value={requestData.price_per_kg}
                  onChange={(e) => setRequestData({...requestData, price_per_kg: parseFloat(e.target.value) || 0})}
                />
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
