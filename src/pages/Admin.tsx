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
import { Users, Plus, Send, DollarSign, TrendingUp, RotateCcw, MapPin, Trash2, Upload, Download, Eye, Edit, FileText, TreePine } from 'lucide-react';
import { SpeciesManager } from '@/components/admin/SpeciesManager';
import { UserManager } from '@/components/admin/UserManager';

const Admin = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // States for investment creation
  const [newInvestmentUserId, setNewInvestmentUserId] = useState('');
  const [newInvestmentSpecies, setNewInvestmentSpecies] = useState('');
  const [newInvestmentPlantCount, setNewInvestmentPlantCount] = useState('');
  const [newInvestmentYear, setNewInvestmentYear] = useState('');
  const [newInvestmentPricePerPlant, setNewInvestmentPricePerPlant] = useState('');

  // States for notifications
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationTarget, setNotificationTarget] = useState<'all' | 'specific'>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Document upload states
  const [documentUserId, setDocumentUserId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [contractType, setContractType] = useState('');
  const [uploading, setUploading] = useState(false);

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
    available_plants: '',
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

  const { data: investmentRequests } = useQuery({
    queryKey: ['admin-investment-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investment_requests')
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
          available_plants: parseInt(plotData.available_plants) || 0,
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
        available_plants: '',
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
        <TabsList className="grid w-full grid-cols-5">
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
                      <Label htmlFor="plot-coordinates">Coordenadas</Label>
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
                      <Label htmlFor="plot-total-plants">Total de Plantas</Label>
                      <Input
                        id="plot-total-plants"
                        type="number"
                        value={newPlotData.total_plants}
                        onChange={(e) => setNewPlotData(prev => ({ ...prev, total_plants: e.target.value }))}
                        placeholder="1000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="plot-available-plants">Plantas Disponibles</Label>
                      <Input
                        id="plot-available-plants"
                        type="number"
                        value={newPlotData.available_plants}
                        onChange={(e) => setNewPlotData(prev => ({ ...prev, available_plants: e.target.value }))}
                        placeholder="800"
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
                        <span className="font-medium">Total plantas:</span> {plot.total_plants?.toLocaleString() || 0}
                      </div>
                      <div>
                        <span className="font-medium">Disponibles:</span> {plot.available_plants?.toLocaleString() || 0}
                      </div>
                      <div>
                        <span className="font-medium">Coordenadas:</span> {plot.coordinates}
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
          </div>
        </TabsContent>

        <TabsContent value="investments">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Gestión de Inversiones</h2>
                <p className="text-muted-foreground">Administra las inversiones de los usuarios</p>
              </div>
            </div>

            <div className="grid gap-4">
              {investments?.map((investment) => {
                const userProfile = profiles?.find(p => p.user_id === investment.user_id);
                return (
                  <Card key={investment.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {userProfile?.name || userProfile?.email}
                            <Badge variant="secondary">{investment.plant_species?.name}</Badge>
                          </CardTitle>
                          <CardDescription>
                            {investment.plant_count} plantas - Año {investment.plantation_year}
                          </CardDescription>
                        </div>
                        <Badge variant={investment.status === 'active' ? 'default' : 'secondary'}>
                          {investment.status}
                        </Badge>
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