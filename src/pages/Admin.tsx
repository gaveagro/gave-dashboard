import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Users, 
  Leaf, 
  TrendingUp, 
  Plus, 
  Edit, 
  Trash2, 
  Upload,
  FileText,
  Mail,
  Search,
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  Bell
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SpeciesManager } from '@/components/admin/SpeciesManager';
import { UserManager } from '@/components/admin/UserManager';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Admin = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('investments');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'success'
  });
  const [sendingNotification, setSendingNotification] = useState(false);
  const [selectedNotificationTarget, setSelectedNotificationTarget] = useState<'all' | 'specific'>('all');

  // Investment form state
  const [showInvestmentDialog, setShowInvestmentDialog] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<any>(null);
  const [investmentForm, setInvestmentForm] = useState({
    user_id: '',
    species_id: '',
    plant_count: 0,
    price_per_plant: 0,
    plantation_year: new Date().getFullYear(),
    expected_harvest_year: new Date().getFullYear() + 5,
    weight_per_plant_kg: 50,
    plot_id: 'unassigned',
    status: 'active'
  });

  // Plot form state
  const [showPlotDialog, setShowPlotDialog] = useState(false);
  const [editingPlot, setEditingPlot] = useState<any>(null);
  const [plotForm, setPlotForm] = useState({
    name: '',
    location: '',
    coordinates: '',
    area: 0,
    total_plants: 0,
    available_plants: 0,
    latitude: 0,
    longitude: 0,
    elevation: 0,
    rainfall: 0,
    soil_type: '',
    temperature: '',
    status: 'Activa'
  });

  // Notification editing state
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [editingNotification, setEditingNotification] = useState<any>(null);
  const [editNotificationForm, setEditNotificationForm] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'success'
  });

  // Fetch data
  const { data: users } = useQuery({
    queryKey: ['users-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: investments } = useQuery({
    queryKey: ['investments-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investments')
        .select(`
          *,
          plant_species (name),
          plots (name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch user profiles separately and match them
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email');
        
      if (profilesError) throw profilesError;
      
      // Match investments with profiles
      const investmentsWithProfiles = data?.map(investment => {
        const userProfile = profiles?.find(profile => profile.user_id === investment.user_id);
        return {
          ...investment,
          profiles: userProfile || null
        };
      });
      
      return investmentsWithProfiles;
    }
  });

  const { data: investmentRequests } = useQuery({
    queryKey: ['investment-requests-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investment_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: plots } = useQuery({
    queryKey: ['plots-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plots')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: species } = useQuery({
    queryKey: ['species-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plant_species')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Chart data preparation
  const chartData = {
    plantsByYear: investments?.reduce((acc: any[], inv) => {
      const existing = acc.find(item => item.year === inv.plantation_year);
      if (existing) {
        existing.plants += inv.plant_count;
      } else {
        acc.push({ year: inv.plantation_year, plants: inv.plant_count });
      }
      return acc;
    }, []).sort((a, b) => a.year - b.year) || [],

    plantsBySpecies: investments?.reduce((acc: any[], inv) => {
      const speciesName = inv.plant_species?.name || 'Unknown';
      const existing = acc.find(item => item.species === speciesName);
      if (existing) {
        existing.plants += inv.plant_count;
        existing.amount += inv.total_amount;
      } else {
        acc.push({ 
          species: speciesName, 
          plants: inv.plant_count,
          amount: inv.total_amount
        });
      }
      return acc;
    }, []) || [],

    investmentsByUser: investments?.reduce((acc: any[], inv) => {
      const userName = inv.profiles?.name || inv.profiles?.email || 'Unknown';
      const existing = acc.find(item => item.user === userName);
      if (existing) {
        existing.amount += inv.total_amount;
        existing.plants += inv.plant_count;
      } else {
        acc.push({ 
          user: userName, 
          amount: inv.total_amount,
          plants: inv.plant_count
        });
      }
      return acc;
    }, []).sort((a, b) => b.amount - a.amount).slice(0, 10) || []
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // Statistics calculations
  const stats = {
    totalInvestments: investments?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0,
    totalPlantsSold: investments?.reduce((sum, inv) => sum + inv.plant_count, 0) || 0,
    activeSpecies: species?.length || 0,
    harvestReadyInvestments: investments?.filter(inv => 
      new Date().getFullYear() >= inv.expected_harvest_year
    ).length || 0
  };

  const handleSendNotification = async () => {
    if (!notificationForm.title || !notificationForm.message) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive"
      });
      return;
    }

    setSendingNotification(true);
    try {
      const targetUsers = selectedNotificationTarget === 'all' 
        ? users?.map(u => u.user_id) || []
        : selectedUsers;

      if (targetUsers.length === 0) {
        toast({
          title: "Error",
          description: "Selecciona al menos un usuario",
          variant: "destructive"
        });
        return;
      }

      const notifications = targetUsers.map(userId => ({
        user_id: userId,
        title: notificationForm.title,
        message: notificationForm.message,
        type: notificationForm.type
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;

      toast({
        title: "Notificaciones enviadas",
        description: `Se enviaron ${notifications.length} notificaciones`,
      });

      setNotificationForm({ title: '', message: '', type: 'info' });
      setSelectedUsers([]);
      setSelectedNotificationTarget('all');
      queryClient.invalidateQueries({ queryKey: ['notifications-admin'] });
    } catch (error) {
      console.error('Error sending notifications:', error);
      toast({
        title: "Error",
        description: "No se pudieron enviar las notificaciones",
        variant: "destructive"
      });
    } finally {
      setSendingNotification(false);
    }
  };

  const handleCreateInvestment = async () => {
    try {
      const investmentData = {
        ...investmentForm,
        plot_id: investmentForm.plot_id === 'unassigned' ? null : investmentForm.plot_id,
        total_amount: investmentForm.plant_count * investmentForm.price_per_plant
      };

      if (editingInvestment) {
        const { error } = await supabase
          .from('investments')
          .update(investmentData)
          .eq('id', editingInvestment.id);
        if (error) throw error;
        toast({ title: "Inversión actualizada exitosamente" });
      } else {
        const { error } = await supabase
          .from('investments')
          .insert([investmentData]);
        if (error) throw error;
        toast({ title: "Inversión creada exitosamente" });
      }

      queryClient.invalidateQueries({ queryKey: ['investments-admin'] });
      setShowInvestmentDialog(false);
      setEditingInvestment(null);
      setInvestmentForm({
        user_id: '',
        species_id: '',
        plant_count: 0,
        price_per_plant: 0,
        plantation_year: new Date().getFullYear(),
        expected_harvest_year: new Date().getFullYear() + 5,
        weight_per_plant_kg: 50,
        plot_id: 'unassigned',
        status: 'active'
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteInvestment = async (investmentId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta inversión?')) return;

    try {
      const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', investmentId);

      if (error) throw error;

      toast({ title: "Inversión eliminada exitosamente" });
      queryClient.invalidateQueries({ queryKey: ['investments-admin'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleCreatePlot = async () => {
    try {
      if (editingPlot) {
        const { error } = await supabase
          .from('plots')
          .update(plotForm)
          .eq('id', editingPlot.id);
        if (error) throw error;
        toast({ title: "Parcela actualizada exitosamente" });
      } else {
        const { error } = await supabase
          .from('plots')
          .insert([plotForm]);
        if (error) throw error;
        toast({ title: "Parcela creada exitosamente" });
      }

      queryClient.invalidateQueries({ queryKey: ['plots-admin'] });
      setShowPlotDialog(false);
      setEditingPlot(null);
      setPlotForm({
        name: '',
        location: '',
        coordinates: '',
        area: 0,
        total_plants: 0,
        available_plants: 0,
        latitude: 0,
        longitude: 0,
        elevation: 0,
        rainfall: 0,
        soil_type: '',
        temperature: '',
        status: 'Activa'
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta notificación?')) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      toast({ title: "Notificación eliminada exitosamente" });
      queryClient.invalidateQueries({ queryKey: ['notifications-admin'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEditNotification = async () => {
    if (!editingNotification) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          title: editNotificationForm.title,
          message: editNotificationForm.message,
          type: editNotificationForm.type || 'info'
        })
        .eq('id', editingNotification.id);

      if (error) throw error;

      toast({ title: "Notificación actualizada exitosamente" });
      queryClient.invalidateQueries({ queryKey: ['notifications-admin'] });
      setShowNotificationDialog(false);
      setEditingNotification(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
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

  const getStatusBadge = (status: string) => {
    const variants = {
      'pending': 'default',
      'approved': 'default',
      'rejected': 'destructive',
      'active': 'default',
      'completed': 'default'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {status}
      </Badge>
    );
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Acceso Denegado</h1>
          <p className="text-muted-foreground">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold bg-gradient-agave bg-clip-text text-transparent">
          Panel de Administración
        </h1>
        <p className="text-muted-foreground text-lg">
          Gestiona usuarios, inversiones, parcelas y más
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="investments">Inversiones</TabsTrigger>
          <TabsTrigger value="plots">Parcelas</TabsTrigger>
          <TabsTrigger value="species">Especies</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
          <TabsTrigger value="statistics">Estadísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="investments" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Gestión de Inversiones</h2>
            <Dialog open={showInvestmentDialog} onOpenChange={setShowInvestmentDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingInvestment(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Inversión
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingInvestment ? 'Editar Inversión' : 'Nueva Inversión'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingInvestment ? 'Modifica los datos de la inversión' : 'Registra una nueva inversión en el sistema'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Usuario</Label>
                    <Select 
                      value={investmentForm.user_id} 
                      onValueChange={(value) => setInvestmentForm(prev => ({ ...prev, user_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar usuario" />
                      </SelectTrigger>
                      <SelectContent>
                        {users?.filter(u => u.role === 'investor').map((user) => (
                          <SelectItem key={user.user_id} value={user.user_id}>
                            {user.name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Especie</Label>
                    <Select 
                      value={investmentForm.species_id} 
                      onValueChange={(value) => setInvestmentForm(prev => ({ ...prev, species_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar especie" />
                      </SelectTrigger>
                      <SelectContent>
                        {species?.map((specie) => (
                          <SelectItem key={specie.id} value={specie.id}>
                            {specie.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Número de Plantas</Label>
                    <Input
                      type="number"
                      value={investmentForm.plant_count}
                      onChange={(e) => setInvestmentForm(prev => ({ 
                        ...prev, 
                        plant_count: parseInt(e.target.value) || 0 
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Precio por Planta</Label>
                    <Input
                      type="number"
                      value={investmentForm.price_per_plant}
                      onChange={(e) => setInvestmentForm(prev => ({ 
                        ...prev, 
                        price_per_plant: parseFloat(e.target.value) || 0 
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Año de Plantación</Label>
                    <Input
                      type="number"
                      value={investmentForm.plantation_year}
                      onChange={(e) => setInvestmentForm(prev => ({ 
                        ...prev, 
                        plantation_year: parseInt(e.target.value) || new Date().getFullYear() 
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Año Esperado de Cosecha</Label>
                    <Input
                      type="number"
                      value={investmentForm.expected_harvest_year}
                      onChange={(e) => setInvestmentForm(prev => ({ 
                        ...prev, 
                        expected_harvest_year: parseInt(e.target.value) || new Date().getFullYear() + 5 
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Peso por Planta (kg)</Label>
                    <Input
                      type="number"
                      value={investmentForm.weight_per_plant_kg}
                      onChange={(e) => setInvestmentForm(prev => ({ 
                        ...prev, 
                        weight_per_plant_kg: parseInt(e.target.value) || 50 
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Parcela (Opcional)</Label>
                    <Select 
                      value={investmentForm.plot_id} 
                      onValueChange={(value) => setInvestmentForm(prev => ({ ...prev, plot_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar parcela" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Sin asignar</SelectItem>
                        {plots?.map((plot) => (
                          <SelectItem key={plot.id} value={plot.id}>
                            {plot.name} - {plot.location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select 
                      value={investmentForm.status} 
                      onValueChange={(value) => setInvestmentForm(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Activa</SelectItem>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="completed">Completada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 pt-4">
                    <Button onClick={handleCreateInvestment} className="w-full">
                      {editingInvestment ? 'Actualizar Inversión' : 'Crear Inversión'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Inversiones</CardTitle>
              <CardDescription>
                Todas las inversiones registradas en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Inversionista</TableHead>
                    <TableHead>Especie</TableHead>
                    <TableHead>Plantas</TableHead>
                    <TableHead>Monto Total</TableHead>
                    <TableHead>Año Plantación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investments?.map((investment) => (
                    <TableRow key={investment.id}>
                      <TableCell>{investment.profiles?.name || investment.profiles?.email || 'Usuario desconocido'}</TableCell>
                      <TableCell>{investment.plant_species?.name}</TableCell>
                      <TableCell>{investment.plant_count.toLocaleString()}</TableCell>
                      <TableCell>{formatCurrency(investment.total_amount)}</TableCell>
                      <TableCell>{investment.plantation_year}</TableCell>
                      <TableCell>{getStatusBadge(investment.status || 'active')}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingInvestment(investment);
                              setInvestmentForm({
                                user_id: investment.user_id,
                                species_id: investment.species_id,
                                plant_count: investment.plant_count,
                                price_per_plant: investment.price_per_plant,
                                plantation_year: investment.plantation_year,
                                expected_harvest_year: investment.expected_harvest_year,
                                weight_per_plant_kg: investment.weight_per_plant_kg || 50,
                                plot_id: investment.plot_id || 'unassigned',
                                status: investment.status || 'active'
                              });
                              setShowInvestmentDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteInvestment(investment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plots" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Gestión de Parcelas</h2>
            <Dialog open={showPlotDialog} onOpenChange={setShowPlotDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingPlot(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Parcela
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingPlot ? 'Editar Parcela' : 'Nueva Parcela'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingPlot ? 'Modifica los datos de la parcela' : 'Registra una nueva parcela en el sistema'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  <div className="space-y-2">
                    <Label>Nombre de la Parcela</Label>
                    <Input
                      value={plotForm.name}
                      onChange={(e) => setPlotForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ej: Parcela Norte A1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Ubicación</Label>
                    <Input
                      value={plotForm.location}
                      onChange={(e) => setPlotForm(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Ej: Oaxaca, México"
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label>Coordenadas Google Maps</Label>
                    <Input
                      value={plotForm.coordinates}
                      onChange={(e) => setPlotForm(prev => ({ ...prev, coordinates: e.target.value }))}
                      placeholder="Ej: 17.0732,-96.7266 o link de Google Maps"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Área (hectáreas)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={plotForm.area}
                      onChange={(e) => setPlotForm(prev => ({ ...prev, area: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Total de Plantas</Label>
                    <Input
                      type="number"
                      value={plotForm.total_plants}
                      onChange={(e) => setPlotForm(prev => ({ ...prev, total_plants: parseInt(e.target.value) || 0 }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Latitud</Label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={plotForm.latitude}
                      onChange={(e) => setPlotForm(prev => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Longitud</Label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={plotForm.longitude}
                      onChange={(e) => setPlotForm(prev => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Elevación (msnm)</Label>
                    <Input
                      type="number"
                      value={plotForm.elevation}
                      onChange={(e) => setPlotForm(prev => ({ ...prev, elevation: parseInt(e.target.value) || 0 }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Precipitación (mm/año)</Label>
                    <Input
                      type="number"
                      value={plotForm.rainfall}
                      onChange={(e) => setPlotForm(prev => ({ ...prev, rainfall: parseInt(e.target.value) || 0 }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Suelo</Label>
                    <Input
                      value={plotForm.soil_type}
                      onChange={(e) => setPlotForm(prev => ({ ...prev, soil_type: e.target.value }))}
                      placeholder="Ej: Franco arcilloso"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Temperatura</Label>
                    <Input
                      value={plotForm.temperature}
                      onChange={(e) => setPlotForm(prev => ({ ...prev, temperature: e.target.value }))}
                      placeholder="Ej: 18-25°C"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select 
                      value={plotForm.status} 
                      onValueChange={(value) => setPlotForm(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Activa">Activa</SelectItem>
                        <SelectItem value="En preparación">En preparación</SelectItem>
                        <SelectItem value="Inactiva">Inactiva</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 pt-4">
                    <Button onClick={handleCreatePlot} className="w-full">
                      {editingPlot ? 'Actualizar Parcela' : 'Crear Parcela'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Parcelas</CardTitle>
              <CardDescription>
                Todas las parcelas registradas en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Área (ha)</TableHead>
                    <TableHead>Plantas Establecidas</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plots?.map((plot) => {
                    const plantsEstablished = investments?.filter(inv => inv.plot_id === plot.id)
                      .reduce((sum, inv) => sum + inv.plant_count, 0) || 0;
                    
                    return (
                      <TableRow key={plot.id}>
                        <TableCell className="font-medium">{plot.name}</TableCell>
                        <TableCell>{plot.location}</TableCell>
                        <TableCell>{plot.area}</TableCell>
                        <TableCell>{plantsEstablished.toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(plot.status || 'Activa')}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingPlot(plot);
                              setPlotForm({
                                name: plot.name,
                                location: plot.location,
                                coordinates: plot.coordinates,
                                area: plot.area,
                                total_plants: plot.total_plants,
                                available_plants: plot.available_plants,
                                latitude: plot.latitude || 0,
                                longitude: plot.longitude || 0,
                                elevation: plot.elevation || 0,
                                rainfall: plot.rainfall || 0,
                                soil_type: plot.soil_type || '',
                                temperature: plot.temperature || '',
                                status: plot.status || 'Activa'
                              });
                              setShowPlotDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="species">
          <SpeciesManager />
        </TabsContent>

        <TabsContent value="users">
          <UserManager />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Enviar Notificaciones
              </CardTitle>
              <CardDescription>
                Envía notificaciones a usuarios específicos o a todos los usuarios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Destinatarios</Label>
                  <Select value={selectedNotificationTarget} onValueChange={(value: 'all' | 'specific') => {
                    setSelectedNotificationTarget(value);
                    if (value === 'all') {
                      setSelectedUsers([]);
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los usuarios</SelectItem>
                      <SelectItem value="specific">Usuarios específicos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedNotificationTarget === 'specific' && (
                  <div className="space-y-2">
                    <Label>Seleccionar Usuarios</Label>
                    <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-2">
                      {users?.map((user) => (
                        <div key={user.user_id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={user.user_id}
                            checked={selectedUsers.includes(user.user_id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers(prev => [...prev, user.user_id]);
                              } else {
                                setSelectedUsers(prev => prev.filter(id => id !== user.user_id));
                              }
                            }}
                          />
                          <label htmlFor={user.user_id} className="text-sm">
                            {user.name || user.email} ({user.role})
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Tipo de Notificación</Label>
                  <Select 
                    value={notificationForm.type} 
                    onValueChange={(value: 'info' | 'warning' | 'success') => 
                      setNotificationForm(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Información</SelectItem>
                      <SelectItem value="success">Éxito</SelectItem>
                      <SelectItem value="warning">Advertencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={notificationForm.title}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Título de la notificación"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Mensaje</Label>
                  <Input
                    value={notificationForm.message}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Contenido del mensaje"
                  />
                </div>

                <Button 
                  onClick={handleSendNotification}
                  disabled={sendingNotification}
                  className="w-full"
                >
                  {sendingNotification ? 'Enviando...' : 'Enviar Notificación'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sent Notifications Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificaciones Enviadas
              </CardTitle>
              <CardDescription>
                Gestiona las notificaciones que has enviado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Mensaje</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications?.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell className="font-medium">{notification.title}</TableCell>
                      <TableCell className="max-w-xs truncate">{notification.message}</TableCell>
                      <TableCell>{getStatusBadge(notification.type || 'info')}</TableCell>
                      <TableCell>
                        {new Date(notification.created_at).toLocaleDateString('es-MX')}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingNotification(notification);
                              setEditNotificationForm({
                                title: notification.title,
                                message: notification.message,
                                type: (notification.type as 'info' | 'warning' | 'success') || 'info'
                              });
                              setShowNotificationDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteNotification(notification.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Edit Notification Dialog */}
          <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Notificación</DialogTitle>
                <DialogDescription>
                  Modifica el contenido de la notificación
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={editNotificationForm.title}
                    onChange={(e) => setEditNotificationForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Título de la notificación"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Mensaje</Label>
                  <Input
                    value={editNotificationForm.message}
                    onChange={(e) => setEditNotificationForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Contenido del mensaje"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select 
                    value={editNotificationForm.type} 
                    onValueChange={(value: 'info' | 'warning' | 'success') => 
                      setEditNotificationForm(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Información</SelectItem>
                      <SelectItem value="success">Éxito</SelectItem>
                      <SelectItem value="warning">Advertencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleEditNotification} className="w-full">
                  Actualizar Notificación
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Inversiones</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalInvestments)}</div>
                <p className="text-xs text-muted-foreground">
                  Capital total invertido
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Plantas Vendidas</CardTitle>
                <Leaf className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalPlantsSold.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Total de plantas establecidas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Especies Activas</CardTitle>
                <Leaf className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeSpecies}</div>
                <p className="text-xs text-muted-foreground">
                  Variedades disponibles
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Listas para Cosecha</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.harvestReadyInvestments}</div>
                <p className="text-xs text-muted-foreground">
                  Inversiones maduras
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Plantas por Año de Establecimiento</CardTitle>
                <CardDescription>Distribución de plantas vendidas por año</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    plants: {
                      label: "Plantas",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.plantsByYear}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                      />
                      <Bar dataKey="plants" fill="var(--color-plants)" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Plantas por Especie</CardTitle>
                <CardDescription>Distribución de plantas por tipo de agave</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    plants: {
                      label: "Plantas",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData.plantsBySpecies}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value.toLocaleString()}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="plants"
                        nameKey="species"
                      >
                        {chartData.plantsBySpecies.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top 10 Inversionistas</CardTitle>
                <CardDescription>Usuarios con mayor inversión total</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    amount: {
                      label: "Monto",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.investmentsByUser} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="user" type="category" width={100} />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        formatter={(value) => [formatCurrency(Number(value)), "Inversión"]}
                      />
                      <Bar dataKey="amount" fill="var(--color-amount)" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inversión por Especies</CardTitle>
                <CardDescription>Monto total invertido por tipo de agave</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    amount: {
                      label: "Monto",
                      color: "hsl(var(--chart-3))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.plantsBySpecies}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="species" />
                      <YAxis />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        formatter={(value) => [formatCurrency(Number(value)), "Inversión"]}
                      />
                      <Bar dataKey="amount" fill="var(--color-amount)" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Investment Requests Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Solicitudes de Inversión del Simulador
              </CardTitle>
              <CardDescription>
                Todas las solicitudes enviadas desde el simulador de inversiones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Especie</TableHead>
                    <TableHead>Plantas</TableHead>
                    <TableHead>Año</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investmentRequests?.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.user_name}</TableCell>
                      <TableCell>{request.user_email}</TableCell>
                      <TableCell>{request.user_phone || 'No proporcionado'}</TableCell>
                      <TableCell>{request.species_name}</TableCell>
                      <TableCell>{request.plant_count.toLocaleString()}</TableCell>
                      <TableCell>{request.establishment_year}</TableCell>
                      <TableCell>{formatCurrency(request.total_investment)}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        {new Date(request.created_at).toLocaleDateString('es-MX')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
