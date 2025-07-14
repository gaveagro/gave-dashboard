
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Send, DollarSign, TrendingUp, RotateCcw, MapPin, Trash2, Upload, Download, Eye, Edit, FileText, TreePine, CheckCircle, XCircle, Clock, BarChart3 } from 'lucide-react';
import { SpeciesManager } from '@/components/admin/SpeciesManager';
import { UserManager } from '@/components/admin/UserManager';
import { InvestmentChart } from '@/components/InvestmentChart';
import { Checkbox } from '@/components/ui/checkbox';

const Admin = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // States for investment creation
  const [isCreateInvestmentDialogOpen, setIsCreateInvestmentDialogOpen] = useState(false);
  const [newInvestmentUserId, setNewInvestmentUserId] = useState('');
  const [newInvestmentSpecies, setNewInvestmentSpecies] = useState('');
  const [newInvestmentPlantCount, setNewInvestmentPlantCount] = useState('');
  const [newInvestmentYear, setNewInvestmentYear] = useState('');
  const [newInvestmentPricePerPlant, setNewInvestmentPricePerPlant] = useState('');

  // States for investment editing
  const [editingInvestment, setEditingInvestment] = useState<any>(null);
  const [isEditInvestmentDialogOpen, setIsEditInvestmentDialogOpen] = useState(false);

  // States for notifications
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationTarget, setNotificationTarget] = useState<'all' | 'specific'>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Plot states
  const [showCreatePlotDialog, setShowCreatePlotDialog] = useState(false);
  const [showEditPlotDialog, setShowEditPlotDialog] = useState(false);
  const [editingPlot, setEditingPlot] = useState<any>(null);
  
  const [newPlotData, setNewPlotData] = useState({
    name: '',
    location: '',
    coordinates: '',
    area: '',
    total_plants: '',
    temperature: '',
    rainfall: '',
    elevation: '',
    latitude: '',
    longitude: ''
  });

  // Fetch data
  const { data: users, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: plantSpecies } = useQuery({
    queryKey: ['plant-species-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plant_species')
        .select('*');
      
      if (error) throw error;
      return data;
    }
  });

  const { data: investments } = useQuery({
    queryKey: ['admin-investments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investments')
        .select(`
          *,
          plant_species (name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: profiles } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, email');
      
      if (error) throw error;
      return data;
    }
  });

  const { data: plots } = useQuery({
    queryKey: ['admin-plots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plots')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: allNotifications } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      const userIds = [...new Set(notifications?.map(n => n.user_id))];
      const { data: userProfiles } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', userIds);

      return notifications?.map(notification => ({
        ...notification,
        user_profile: userProfiles?.find(p => p.user_id === notification.user_id)
      }));
    }
  });

  // Create investment mutation
  const createInvestmentMutation = useMutation({
    mutationFn: async (investmentData: {
      userId: string;
      speciesId: string;
      plantCount: number;
      plantationYear: number;
      pricePerPlant: number;
    }) => {
      const species = plantSpecies?.find(s => s.id === investmentData.speciesId);
      if (!species) throw new Error('Especie no encontrada');

      const totalAmount = investmentData.plantCount * investmentData.pricePerPlant;
      const expectedHarvestYear = investmentData.plantationYear + species.maturation_years;

      const { error } = await supabase
        .from('investments')
        .insert({
          user_id: investmentData.userId,
          species_id: investmentData.speciesId,
          plant_count: investmentData.plantCount,
          plantation_year: investmentData.plantationYear,
          expected_harvest_year: expectedHarvestYear,
          price_per_plant: investmentData.pricePerPlant,
          total_amount: totalAmount,
          status: 'active'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Inversión creada",
        description: "La inversión ha sido creada exitosamente."
      });
      setIsCreateInvestmentDialogOpen(false);
      setNewInvestmentUserId('');
      setNewInvestmentSpecies('');
      setNewInvestmentPlantCount('');
      setNewInvestmentYear('');
      setNewInvestmentPricePerPlant('');
      queryClient.invalidateQueries({ queryKey: ['admin-investments'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al crear inversión",
        variant: "destructive"
      });
    }
  });

  // Update investment mutation
  const updateInvestmentMutation = useMutation({
    mutationFn: async (investmentData: any) => {
      const species = plantSpecies?.find(s => s.id === investmentData.species_id);
      if (!species) throw new Error('Especie no encontrada');

      const totalAmount = investmentData.plant_count * investmentData.price_per_plant;
      const expectedHarvestYear = investmentData.plantation_year + species.maturation_years;

      const { error } = await supabase
        .from('investments')
        .update({
          user_id: investmentData.user_id,
          species_id: investmentData.species_id,
          plant_count: investmentData.plant_count,
          plantation_year: investmentData.plantation_year,
          expected_harvest_year: expectedHarvestYear,
          price_per_plant: investmentData.price_per_plant,
          total_amount: totalAmount,
          status: investmentData.status
        })
        .eq('id', investmentData.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Inversión actualizada",
        description: "La inversión ha sido actualizada exitosamente."
      });
      setIsEditInvestmentDialogOpen(false);
      setEditingInvestment(null);
      queryClient.invalidateQueries({ queryKey: ['admin-investments'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar inversión",
        variant: "destructive"
      });
    }
  });

  // Delete investment mutation
  const deleteInvestmentMutation = useMutation({
    mutationFn: async (investmentId: string) => {
      const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', investmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Inversión eliminada",
        description: "La inversión ha sido eliminada exitosamente."
      });
      queryClient.invalidateQueries({ queryKey: ['admin-investments'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar inversión",
        variant: "destructive"
      });
    }
  });

  // Create plot mutation
  const createPlotMutation = useMutation({
    mutationFn: async (plotData: any) => {
      const { error } = await supabase
        .from('plots')
        .insert({
          name: plotData.name,
          location: plotData.location,
          coordinates: plotData.coordinates,
          area: parseFloat(plotData.area),
          total_plants: parseInt(plotData.total_plants) || 0,
          temperature: plotData.temperature || null,
          rainfall: plotData.rainfall ? parseInt(plotData.rainfall) : null,
          elevation: plotData.elevation ? parseInt(plotData.elevation) : null,
          latitude: plotData.latitude ? parseFloat(plotData.latitude) : null,
          longitude: plotData.longitude ? parseFloat(plotData.longitude) : null,
          status: 'Activa'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Parcela creada",
        description: "La parcela ha sido creada exitosamente."
      });
      setShowCreatePlotDialog(false);
      setNewPlotData({
        name: '',
        location: '',
        coordinates: '',
        area: '',
        total_plants: '',
        temperature: '',
        rainfall: '',
        elevation: '',
        latitude: '',
        longitude: ''
      });
      queryClient.invalidateQueries({ queryKey: ['admin-plots'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo crear la parcela: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Update plot mutation
  const updatePlotMutation = useMutation({
    mutationFn: async (plotData: any) => {
      const { error } = await supabase
        .from('plots')
        .update({
          name: plotData.name,
          location: plotData.location,
          coordinates: plotData.coordinates,
          area: parseFloat(plotData.area),
          total_plants: parseInt(plotData.total_plants) || 0,
          temperature: plotData.temperature || null,
          rainfall: plotData.rainfall ? parseInt(plotData.rainfall) : null,
          elevation: plotData.elevation ? parseInt(plotData.elevation) : null,
          latitude: plotData.latitude ? parseFloat(plotData.latitude) : null,
          longitude: plotData.longitude ? parseFloat(plotData.longitude) : null,
          status: plotData.status
        })
        .eq('id', plotData.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Parcela actualizada",
        description: "La parcela ha sido actualizada exitosamente."
      });
      setShowEditPlotDialog(false);
      setEditingPlot(null);
      queryClient.invalidateQueries({ queryKey: ['admin-plots'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo actualizar la parcela: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Delete plot mutation
  const deletePlotMutation = useMutation({
    mutationFn: async (plotId: string) => {
      const { error } = await supabase
        .from('plots')
        .delete()
        .eq('id', plotId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Parcela eliminada",
        description: "La parcela ha sido eliminada exitosamente."
      });
      queryClient.invalidateQueries({ queryKey: ['admin-plots'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo eliminar la parcela: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Send notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: async () => {
      if (!notificationTitle || !notificationMessage) {
        throw new Error('Por favor completa todos los campos');
      }

      const targetUserIds = notificationTarget === 'all' 
        ? users?.map(u => u.user_id) || []
        : selectedUsers;

      if (targetUserIds.length === 0) {
        throw new Error('No hay usuarios seleccionados');
      }

      const notifications = targetUserIds.map(userId => ({
        user_id: userId,
        title: notificationTitle,
        message: notificationMessage,
        type: 'info'
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Notificaciones enviadas",
        description: `Se enviaron ${notificationTarget === 'all' ? users?.length : selectedUsers.length} notificaciones.`
      });
      setNotificationTitle('');
      setNotificationMessage('');
      setNotificationTarget('all');
      setSelectedUsers([]);
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al enviar notificaciones",
        variant: "destructive"
      });
    }
  });

  const handleCreateInvestment = () => {
    if (!newInvestmentUserId || !newInvestmentSpecies || !newInvestmentPlantCount || !newInvestmentYear || !newInvestmentPricePerPlant) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive"
      });
      return;
    }

    createInvestmentMutation.mutate({
      userId: newInvestmentUserId,
      speciesId: newInvestmentSpecies,
      plantCount: parseInt(newInvestmentPlantCount),
      plantationYear: parseInt(newInvestmentYear),
      pricePerPlant: parseFloat(newInvestmentPricePerPlant)
    });
  };

  const handleEditInvestment = (investment: any) => {
    setEditingInvestment(investment);
    setIsEditInvestmentDialogOpen(true);
  };

  const handleUpdateInvestment = () => {
    if (editingInvestment) {
      updateInvestmentMutation.mutate(editingInvestment);
    }
  };

  const handleEditPlot = (plot: any) => {
    setEditingPlot(plot);
    setShowEditPlotDialog(true);
  };

  const handleUpdatePlot = () => {
    if (editingPlot) {
      updatePlotMutation.mutate(editingPlot);
    }
  };

  const handleUserSelection = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    }
  };

  // Prepare data for charts
  const investmentChartData = investments?.map(investment => ({
    species: investment.plant_species?.name || 'Desconocida',
    amount: investment.total_amount,
    count: investment.plant_count,
    year: investment.plantation_year
  })) || [];

  if (profile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Panel de Administración</h1>
        <Badge variant="secondary">Admin</Badge>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="species">
            <TreePine className="w-4 h-4 mr-2" />
            Especies
          </TabsTrigger>
          <TabsTrigger value="plots">
            <MapPin className="w-4 h-4 mr-2" />
            Parcelas
          </TabsTrigger>
          <TabsTrigger value="investments">
            <TrendingUp className="w-4 h-4 mr-2" />
            Inversiones
          </TabsTrigger>
          <TabsTrigger value="statistics">
            <BarChart3 className="w-4 h-4 mr-2" />
            Estadísticas
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Send className="w-4 h-4 mr-2" />
            Notificaciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserManager />
        </TabsContent>

        <TabsContent value="species">
          <SpeciesManager />
        </TabsContent>

        <TabsContent value="plots">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Gestión de Parcelas</h2>
                <p className="text-muted-foreground">Administra las parcelas donde se cultivan las plantas</p>
              </div>
              <Dialog open={showCreatePlotDialog} onOpenChange={setShowCreatePlotDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Parcela
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Crear Nueva Parcela</DialogTitle>
                    <DialogDescription>
                      Agrega una nueva parcela al sistema
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="plot-name">Nombre de la Parcela</Label>
                      <Input
                        id="plot-name"
                        value={newPlotData.name}
                        onChange={(e) => setNewPlotData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ej: Parcela Norte A"
                      />
                    </div>
                    <div>
                      <Label htmlFor="plot-location">Ubicación</Label>
                      <Input
                        id="plot-location"
                        value={newPlotData.location}
                        onChange={(e) => setNewPlotData(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Ej: Jalisco, México"
                      />
                    </div>
                    <div>
                      <Label htmlFor="plot-coordinates">Coordenadas Google Maps</Label>
                      <Input
                        id="plot-coordinates"
                        value={newPlotData.coordinates}
                        onChange={(e) => setNewPlotData(prev => ({ ...prev, coordinates: e.target.value }))}
                        placeholder="Ej: 20.6597, -103.3496"
                      />
                    </div>
                    <div>
                      <Label htmlFor="plot-area">Área (hectáreas)</Label>
                      <Input
                        id="plot-area"
                        type="number"
                        step="0.01"
                        value={newPlotData.area}
                        onChange={(e) => setNewPlotData(prev => ({ ...prev, area: e.target.value }))}
                        placeholder="10.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="plot-total-plants">Plantas Establecidas</Label>
                      <Input
                        id="plot-total-plants"
                        type="number"
                        value={newPlotData.total_plants}
                        onChange={(e) => setNewPlotData(prev => ({ ...prev, total_plants: e.target.value }))}
                        placeholder="1000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="plot-temperature">Temperatura</Label>
                      <Input
                        id="plot-temperature"
                        value={newPlotData.temperature}
                        onChange={(e) => setNewPlotData(prev => ({ ...prev, temperature: e.target.value }))}
                        placeholder="Ej: 22-28°C"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-6">
                    <Button variant="outline" onClick={() => setShowCreatePlotDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={() => createPlotMutation.mutate(newPlotData)} disabled={createPlotMutation.isPending}>
                      {createPlotMutation.isPending ? 'Creando...' : 'Crear Parcela'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {plots?.map((plot) => (
                <Card key={plot.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{plot.name}</CardTitle>
                        <CardDescription>{plot.location}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="secondary">{plot.area} ha</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditPlot(plot)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deletePlotMutation.mutate(plot.id)}
                          disabled={deletePlotMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Plantas establecidas:</span> {plot.total_plants?.toLocaleString() || 0}
                      </div>
                      <div>
                        <span className="font-medium">Coordenadas:</span> {plot.coordinates}
                      </div>
                      <div>
                        <span className="font-medium">Temperatura:</span> {plot.temperature || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Estado:</span> 
                        <Badge variant="outline" className="ml-1">{plot.status}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Dialog para editar parcela */}
            <Dialog open={showEditPlotDialog} onOpenChange={setShowEditPlotDialog}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Editar Parcela</DialogTitle>
                  <DialogDescription>
                    Modifica los datos de la parcela
                  </DialogDescription>
                </DialogHeader>
                {editingPlot && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-plot-name">Nombre de la Parcela</Label>
                      <Input
                        id="edit-plot-name"
                        value={editingPlot.name}
                        onChange={(e) => setEditingPlot(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-plot-location">Ubicación</Label>
                      <Input
                        id="edit-plot-location"
                        value={editingPlot.location}
                        onChange={(e) => setEditingPlot(prev => ({ ...prev, location: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-plot-coordinates">Coordenadas Google Maps</Label>
                      <Input
                        id="edit-plot-coordinates"
                        value={editingPlot.coordinates}
                        onChange={(e) => setEditingPlot(prev => ({ ...prev, coordinates: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-plot-area">Área (hectáreas)</Label>
                      <Input
                        id="edit-plot-area"
                        type="number"
                        step="0.01"
                        value={editingPlot.area}
                        onChange={(e) => setEditingPlot(prev => ({ ...prev, area: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-plot-total-plants">Plantas Establecidas</Label>
                      <Input
                        id="edit-plot-total-plants"
                        type="number"
                        value={editingPlot.total_plants}
                        onChange={(e) => setEditingPlot(prev => ({ ...prev, total_plants: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-plot-temperature">Temperatura</Label>
                      <Input
                        id="edit-plot-temperature"
                        value={editingPlot.temperature || ''}
                        onChange={(e) => setEditingPlot(prev => ({ ...prev, temperature: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
                <div className="flex justify-end space-x-2 mt-6">
                  <Button variant="outline" onClick={() => setShowEditPlotDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleUpdatePlot} disabled={updatePlotMutation.isPending}>
                    {updatePlotMutation.isPending ? 'Actualizando...' : 'Actualizar Parcela'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </TabsContent>

        <TabsContent value="investments">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Gestión de Inversiones</h2>
                <p className="text-muted-foreground">Administra las inversiones de los usuarios</p>
              </div>
              <Dialog open={isCreateInvestmentDialogOpen} onOpenChange={setIsCreateInvestmentDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Inversión
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Crear Nueva Inversión</DialogTitle>
                    <DialogDescription>
                      Agrega una nueva inversión al sistema
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="investment-user">Usuario</Label>
                      <Select value={newInvestmentUserId} onValueChange={setNewInvestmentUserId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un usuario" />
                        </SelectTrigger>
                        <SelectContent>
                          {users?.map((user) => (
                            <SelectItem key={user.user_id} value={user.user_id}>
                              {user.name || user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="investment-species">Especie</Label>
                      <Select value={newInvestmentSpecies} onValueChange={setNewInvestmentSpecies}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una especie" />
                        </SelectTrigger>
                        <SelectContent>
                          {plantSpecies?.map((species) => (
                            <SelectItem key={species.id} value={species.id}>
                              {species.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="investment-plant-count">Número de Plantas</Label>
                      <Input
                        id="investment-plant-count"
                        type="number"
                        value={newInvestmentPlantCount}
                        onChange={(e) => setNewInvestmentPlantCount(e.target.value)}
                        placeholder="100"
                      />
                    </div>
                    <div>
                      <Label htmlFor="investment-year">Año de Plantación</Label>
                      <Input
                        id="investment-year"
                        type="number"
                        value={newInvestmentYear}
                        onChange={(e) => setNewInvestmentYear(e.target.value)}
                        placeholder="2025"
                      />
                    </div>
                    <div>
                      <Label htmlFor="investment-price">Precio por Planta</Label>
                      <Input
                        id="investment-price"
                        type="number"
                        step="0.01"
                        value={newInvestmentPricePerPlant}
                        onChange={(e) => setNewInvestmentPricePerPlant(e.target.value)}
                        placeholder="250.00"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsCreateInvestmentDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateInvestment} disabled={createInvestmentMutation.isPending}>
                        {createInvestmentMutation.isPending ? 'Creando...' : 'Crear Inversión'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {investments?.map((investment) => {
                const userProfile = profiles?.find(p => p.user_id === investment.user_id);
                const currentYear = new Date().getFullYear();
                const yearsToHarvest = investment.expected_harvest_year - currentYear;
                const isReady = yearsToHarvest <= 0;
                
                return (
                  <Card key={investment.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {userProfile?.name || userProfile?.email}
                            <Badge variant="secondary">{investment.plant_species?.name}</Badge>
                            {isReady && <Badge variant="default" className="bg-green-600">Lista para cosechar</Badge>}
                          </CardTitle>
                          <CardDescription>
                            {investment.plant_count} plantas - Año {investment.plantation_year}
                            {!isReady && <span className="text-amber-600 ml-2">({yearsToHarvest} años restantes)</span>}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={investment.status === 'active' ? 'default' : 'secondary'}>
                            {investment.status}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditInvestment(investment)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteInvestmentMutation.mutate(investment.id)}
                            disabled={deleteInvestmentMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Precio por planta:</span> ${investment.price_per_plant.toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Total:</span> ${investment.total_amount.toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Cosecha esperada:</span> {investment.expected_harvest_year}
                        </div>
                        <div>
                          <span className="font-medium">Creada:</span> {new Date(investment.created_at).toLocaleDateString('es-MX')}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Dialog para editar inversión */}
            <Dialog open={isEditInvestmentDialogOpen} onOpenChange={setIsEditInvestmentDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Editar Inversión</DialogTitle>
                  <DialogDescription>
                    Modifica los datos de la inversión
                  </DialogDescription>
                </DialogHeader>
                {editingInvestment && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-investment-user">Usuario</Label>
                      <Select value={editingInvestment.user_id} onValueChange={(value) => setEditingInvestment(prev => ({ ...prev, user_id: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un usuario" />
                        </SelectTrigger>
                        <SelectContent>
                          {users?.map((user) => (
                            <SelectItem key={user.user_id} value={user.user_id}>
                              {user.name || user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-investment-species">Especie</Label>
                      <Select value={editingInvestment.species_id} onValueChange={(value) => setEditingInvestment(prev => ({ ...prev, species_id: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una especie" />
                        </SelectTrigger>
                        <SelectContent>
                          {plantSpecies?.map((species) => (
                            <SelectItem key={species.id} value={species.id}>
                              {species.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-investment-plant-count">Número de Plantas</Label>
                      <Input
                        id="edit-investment-plant-count"
                        type="number"
                        value={editingInvestment.plant_count}
                        onChange={(e) => setEditingInvestment(prev => ({ ...prev, plant_count: parseInt(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-investment-year">Año de Plantación</Label>
                      <Input
                        id="edit-investment-year"
                        type="number"
                        value={editingInvestment.plantation_year}
                        onChange={(e) => setEditingInvestment(prev => ({ ...prev, plantation_year: parseInt(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-investment-price">Precio por Planta</Label>
                      <Input
                        id="edit-investment-price"
                        type="number"
                        step="0.01"
                        value={editingInvestment.price_per_plant}
                        onChange={(e) => setEditingInvestment(prev => ({ ...prev, price_per_plant: parseFloat(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-investment-status">Estado</Label>
                      <Select value={editingInvestment.status} onValueChange={(value) => setEditingInvestment(prev => ({ ...prev, status: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Activa</SelectItem>
                          <SelectItem value="pending">Pendiente</SelectItem>
                          <SelectItem value="completed">Completada</SelectItem>
                          <SelectItem value="cancelled">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsEditInvestmentDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleUpdateInvestment} disabled={updateInvestmentMutation.isPending}>
                        {updateInvestmentMutation.isPending ? 'Actualizando...' : 'Actualizar Inversión'}
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </TabsContent>

        <TabsContent value="statistics">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Estadísticas de Inversiones</h2>
              <p className="text-muted-foreground">Visualiza el resumen de todas las inversiones</p>
            </div>

            {/* Resumen de estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Inversiones</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${investments?.reduce((sum, inv) => sum + inv.total_amount, 0).toLocaleString() || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {investments?.length || 0} inversiones
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Plantas Vendidas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {investments?.reduce((sum, inv) => sum + inv.plant_count, 0).toLocaleString() || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total de plantas
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Especies Activas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Set(investments?.map(inv => inv.species_id)).size || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Diferentes especies
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Inversiones Listas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {investments?.filter(inv => inv.expected_harvest_year <= new Date().getFullYear()).length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Para cosechar
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución de Inversiones</CardTitle>
                <CardDescription>
                  Análisis visual de las inversiones por especie y año
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InvestmentChart investments={investmentChartData} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Enviar Notificación</CardTitle>
                <CardDescription>
                  Envía notificaciones a usuarios específicos o a todos los usuarios
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="notification-title">Título</Label>
                  <Input
                    id="notification-title"
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    placeholder="Título de la notificación"
                  />
                </div>
                <div>
                  <Label htmlFor="notification-message">Mensaje</Label>
                  <Textarea
                    id="notification-message"
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                    placeholder="Contenido de la notificación"
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="notification-target">Destinatarios</Label>
                  <Select value={notificationTarget} onValueChange={(value: 'all' | 'specific') => setNotificationTarget(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los usuarios</SelectItem>
                      <SelectItem value="specific">Usuarios específicos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {notificationTarget === 'specific' && (
                  <div className="space-y-2">
                    <Label>Seleccionar usuarios:</Label>
                    <div className="max-h-40 overflow-y-auto border rounded p-2">
                      {users?.map((user) => (
                        <div key={user.user_id} className="flex items-center space-x-2 py-1">
                          <Checkbox
                            id={`user-${user.user_id}`}
                            checked={selectedUsers.includes(user.user_id)}
                            onCheckedChange={(checked) => handleUserSelection(user.user_id, checked as boolean)}
                          />
                          <label htmlFor={`user-${user.user_id}`} className="text-sm cursor-pointer">
                            {user.name || user.email}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <Button 
                  onClick={() => sendNotificationMutation.mutate()}
                  disabled={sendNotificationMutation.isPending}
                  className="w-full"
                >
                  {sendNotificationMutation.isPending ? 'Enviando...' : 'Enviar Notificación'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Historial de Notificaciones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {allNotifications?.slice(0, 10).map((notification) => (
                    <div key={notification.id} className="flex justify-between items-start p-4 border rounded">
                      <div className="flex-1">
                        <div className="font-medium">{notification.title}</div>
                        <div className="text-sm text-muted-foreground">{notification.message}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Para: {notification.user_profile?.name || notification.user_profile?.email}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(notification.created_at).toLocaleDateString('es-MX')}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
