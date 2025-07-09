import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, Plus, Users, TreePine, Calendar, MapPin } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

const Admin = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [userProfiles, setUserProfiles] = useState<{ [key: string]: any }>({});
  const [plantSpecies, setPlantSpecies] = useState<any[]>([]);
  const [selectedInvestment, setSelectedInvestment] = useState<any>(null);
  const [showInvestmentDialog, setShowInvestmentDialog] = useState(false);
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  const [showNewPlotDialog, setShowNewPlotDialog] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: '',
    name: '',
    phone: '',
    account_balance: 0
  });
  const [newPlotData, setNewPlotData] = useState({
    name: '',
    location: '',
    coordinates: '',
    area: 0,
    total_plants: 0,
    available_plants: 0,
    soil_type: '',
    temperature: '',
    rainfall: 0,
    elevation: 0
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch investments
  const { data: investments, isLoading: isLoadingInvestments } = useQuery({
    queryKey: ['investments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investments')
        .select('*');
      if (error) throw error;
      return data;
    },
  });

  // Fetch investment requests
  const { data: investmentRequests, isLoading: isLoadingRequests } = useQuery({
    queryKey: ['investment-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investment_requests')
        .select('*');
      if (error) throw error;
      return data;
    },
  });

  // Fetch plots
  const { data: plots } = useQuery({
    queryKey: ['plots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plots')
        .select('*');
      if (error) throw error;
      return data;
    },
  });

  // Fetch user profiles
  useEffect(() => {
    const fetchUserProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) {
        console.error('Error fetching user profiles:', error);
        return;
      }

      const profilesMap: { [key: string]: any } = {};
      data.forEach(profile => {
        profilesMap[profile.user_id] = profile;
      });
      setUserProfiles(profilesMap);
    };

    fetchUserProfiles();
  }, []);

  // Fetch plant species
  useEffect(() => {
    const fetchPlantSpecies = async () => {
      const { data, error } = await supabase
        .from('plant_species')
        .select('*');

      if (error) {
        console.error('Error fetching plant species:', error);
        return;
      }

      setPlantSpecies(data);
    };

    fetchPlantSpecies();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleDeleteInvestment = async (investmentId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta inversión?')) return;

    try {
      const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', investmentId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Inversión eliminada correctamente"
      });

      queryClient.invalidateQueries({ queryKey: ['investments'] });
    } catch (error: any) {
      console.error('Error deleting investment:', error);
      toast({
        title: "Error",
        description: "Error al eliminar la inversión",
        variant: "destructive"
      });
    }
  };

  const updateRequestStatus = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('investment_requests')
        .update({ status })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `Solicitud ${status === 'approved' ? 'aprobada' : 'rechazada'} correctamente`
      });

      queryClient.invalidateQueries({ queryKey: ['investment-requests'] });
    } catch (error: any) {
      console.error('Error updating request status:', error);
      toast({
        title: "Error",
        description: "Error al actualizar el estado de la solicitud",
        variant: "destructive"
      });
    }
  };

  const handleCreateUser = async () => {
    try {
      // Create auth user first
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUserData.email,
        password: Math.random().toString(36).slice(-8), // Random password
        email_confirm: true,
        user_metadata: {
          name: newUserData.name
        }
      });

      if (authError) throw authError;

      // Update profile with additional data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: newUserData.name,
          phone: newUserData.phone,
          account_balance: newUserData.account_balance
        })
        .eq('user_id', authData.user.id);

      if (profileError) throw profileError;

      toast({
        title: "Éxito",
        description: "Usuario creado correctamente"
      });

      setShowNewUserDialog(false);
      setNewUserData({ email: '', name: '', phone: '', account_balance: 0 });
      queryClient.invalidateQueries({ queryKey: ['user-profiles'] });

    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "Error al crear el usuario",
        variant: "destructive"
      });
    }
  };

  const handleCreatePlot = async () => {
    try {
      const { error } = await supabase
        .from('plots')
        .insert([{
          ...newPlotData,
          status: 'Activa'
        }]);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Parcela creada correctamente"
      });

      setShowNewPlotDialog(false);
      setNewPlotData({
        name: '',
        location: '',
        coordinates: '',
        area: 0,
        total_plants: 0,
        available_plants: 0,
        soil_type: '',
        temperature: '',
        rainfall: 0,
        elevation: 0
      });
      queryClient.invalidateQueries({ queryKey: ['plots'] });

    } catch (error: any) {
      console.error('Error creating plot:', error);
      toast({
        title: "Error",
        description: "Error al crear la parcela",
        variant: "destructive"
      });
    }
  };

  // Estadísticas para overview
  const totalInvestments = investments?.length || 0;
  const totalPlants = investments?.reduce((sum, inv) => sum + inv.plant_count, 0) || 0;
  const totalInvestmentAmount = investments?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0;
  const speciesCount = new Set(investments?.map(inv => inv.species_id)).size;
  const establishmentYears = new Set(investments?.map(inv => inv.plantation_year)).size;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold">Panel de Administración</h1>
      <p className="text-muted-foreground">
        Gestiona usuarios, inversiones y más
      </p>

      <div className="flex gap-4 flex-wrap">
        <Button
          variant={activeTab === 'overview' ? 'default' : 'outline'}
          onClick={() => setActiveTab('overview')}
        >
          <TreePine className="h-4 w-4 mr-2" />
          Resumen
        </Button>
        <Button
          variant={activeTab === 'investments' ? 'default' : 'outline'}
          onClick={() => setActiveTab('investments')}
        >
          Inversiones
        </Button>
        <Button
          variant={activeTab === 'investment-requests' ? 'default' : 'outline'}
          onClick={() => setActiveTab('investment-requests')}
        >
          Solicitudes
        </Button>
        <Button
          variant={activeTab === 'users' ? 'default' : 'outline'}
          onClick={() => setActiveTab('users')}
        >
          <Users className="h-4 w-4 mr-2" />
          Usuarios
        </Button>
        <Button
          variant={activeTab === 'plots' ? 'default' : 'outline'}
          onClick={() => setActiveTab('plots')}
        >
          <MapPin className="h-4 w-4 mr-2" />
          Parcelas
        </Button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Inversiones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalInvestments}</div>
                <p className="text-xs text-muted-foreground">inversiones activas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Plantas Totales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalPlants.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">plantas establecidas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Inversión Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalInvestmentAmount)}</div>
                <p className="text-xs text-muted-foreground">monto total invertido</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Especies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{speciesCount}</div>
                <p className="text-xs text-muted-foreground">especies diferentes</p>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown by Species */}
          <Card>
            <CardHeader>
              <CardTitle>Distribución por Especies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {plantSpecies?.map(species => {
                  const speciesInvestments = investments?.filter(inv => inv.species_id === species.id) || [];
                  const speciesPlants = speciesInvestments.reduce((sum, inv) => sum + inv.plant_count, 0);
                  const speciesAmount = speciesInvestments.reduce((sum, inv) => sum + inv.total_amount, 0);
                  
                  if (speciesPlants === 0) return null;
                  
                  return (
                    <div key={species.id} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <h4 className="font-medium">{species.name}</h4>
                        <p className="text-sm text-muted-foreground">{speciesInvestments.length} inversiones</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{speciesPlants.toLocaleString()} plantas</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(speciesAmount)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Breakdown by Establishment Year */}
          <Card>
            <CardHeader>
              <CardTitle>Distribución por Año de Establecimiento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from(new Set(investments?.map(inv => inv.plantation_year))).sort().map(year => {
                  const yearInvestments = investments?.filter(inv => inv.plantation_year === year) || [];
                  const yearPlants = yearInvestments.reduce((sum, inv) => sum + inv.plant_count, 0);
                  const yearAmount = yearInvestments.reduce((sum, inv) => sum + inv.total_amount, 0);
                  
                  return (
                    <div key={year} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <h4 className="font-medium">Año {year}</h4>
                        <p className="text-sm text-muted-foreground">{yearInvestments.length} inversiones</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{yearPlants.toLocaleString()} plantas</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(yearAmount)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Gestión de Usuarios</CardTitle>
                <CardDescription>Administra los usuarios del sistema</CardDescription>
              </div>
              <Button onClick={() => setShowNewUserDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Usuario
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Fecha Registro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.values(userProfiles).map((profile: any) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">{profile.name || 'N/A'}</TableCell>
                      <TableCell>{profile.email}</TableCell>
                      <TableCell>{profile.phone || 'N/A'}</TableCell>
                      <TableCell>{formatCurrency(profile.account_balance || 0)}</TableCell>
                      <TableCell>
                        <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'}>
                          {profile.role === 'admin' ? 'Admin' : 'Inversor'}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(profile.created_at).toLocaleDateString('es-MX')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plots Tab */}
      {activeTab === 'plots' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Gestión de Parcelas</CardTitle>
                <CardDescription>Administra las parcelas y su información</CardDescription>
              </div>
              <Button onClick={() => setShowNewPlotDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Parcela
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Área (ha)</TableHead>
                    <TableHead>Plantas Total</TableHead>
                    <TableHead>Plantas Disponibles</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plots?.map((plot) => (
                    <TableRow key={plot.id}>
                      <TableCell className="font-medium">{plot.name}</TableCell>
                      <TableCell>{plot.location}</TableCell>
                      <TableCell>{plot.area}</TableCell>
                      <TableCell>{plot.total_plants.toLocaleString()}</TableCell>
                      <TableCell>{plot.available_plants.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={plot.status === 'Activa' ? 'default' : 'secondary'}>
                          {plot.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'investments' && (
        <Card>
          <CardHeader>
            <CardTitle>Gestión de Inversiones</CardTitle>
            <CardDescription>
              Administra las inversiones de los usuarios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Especie</TableHead>
                    <TableHead>Plantas</TableHead>
                    <TableHead>Año</TableHead>
                    <TableHead>Inversión</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investments?.map((investment) => (
                    <TableRow key={investment.id}>
                      <TableCell className="font-medium">
                        {userProfiles[investment.user_id]?.name || 
                         userProfiles[investment.user_id]?.email || 
                         'Usuario desconocido'}
                      </TableCell>
                      <TableCell>
                        {plantSpecies.find(s => s.id === investment.species_id)?.name || 'N/A'}
                      </TableCell>
                      <TableCell>{investment.plant_count.toLocaleString()}</TableCell>
                      <TableCell>{investment.plantation_year}</TableCell>
                      <TableCell>{formatCurrency(investment.total_amount)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          investment.status === 'active' ? 'default' :
                          investment.status === 'pending' ? 'secondary' :
                          'destructive'
                        }>
                          {investment.status === 'active' ? 'Activa' :
                           investment.status === 'pending' ? 'Pendiente' :
                           investment.status === 'completed' ? 'Completada' :
                           'Cancelada'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedInvestment(investment);
                              setShowInvestmentDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
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
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'investment-requests' && (
        <Card>
          <CardHeader>
            <CardTitle>Solicitudes de Inversión</CardTitle>
            <CardDescription>
              Revisa y gestiona las solicitudes de inversión pendientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Especie</TableHead>
                    <TableHead>Plantas</TableHead>
                    <TableHead>Inversión</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investmentRequests?.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.user_name}</TableCell>
                      <TableCell className="text-sm">
                        <div>{request.user_email}</div>
                        {request.user_phone && <div>{request.user_phone}</div>}
                      </TableCell>
                      <TableCell>{request.species_name}</TableCell>
                      <TableCell>{request.plant_count.toLocaleString()}</TableCell>
                      <TableCell>{formatCurrency(request.total_investment)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          request.status === 'pending' ? 'secondary' :
                          request.status === 'approved' ? 'default' :
                          request.status === 'rejected' ? 'destructive' :
                          'outline'
                        }>
                          {request.status === 'pending' ? 'Pendiente' :
                           request.status === 'approved' ? 'Aprobada' :
                           request.status === 'rejected' ? 'Rechazada' :
                           'Procesada'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(request.created_at).toLocaleDateString('es-MX')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateRequestStatus(request.id, 'approved')}
                            disabled={request.status !== 'pending'}
                          >
                            ✓
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateRequestStatus(request.id, 'rejected')}
                            disabled={request.status !== 'pending'}
                          >
                            ✗
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Crea un nuevo usuario en el sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email</Label>
              <Input 
                id="email" 
                value={newUserData.email}
                onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Nombre</Label>
              <Input 
                id="name" 
                value={newUserData.name}
                onChange={(e) => setNewUserData({...newUserData, name: e.target.value})}
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">Teléfono</Label>
              <Input 
                id="phone" 
                value={newUserData.phone}
                onChange={(e) => setNewUserData({...newUserData, phone: e.target.value})}
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="balance" className="text-right">Saldo</Label>
              <Input 
                id="balance" 
                type="number"
                value={newUserData.account_balance}
                onChange={(e) => setNewUserData({...newUserData, account_balance: parseFloat(e.target.value) || 0})}
                className="col-span-3" 
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowNewUserDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateUser}>
              Crear Usuario
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewPlotDialog} onOpenChange={setShowNewPlotDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Crear Nueva Parcela</DialogTitle>
            <DialogDescription>
              Agrega una nueva parcela al sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plot-name">Nombre</Label>
                <Input 
                  id="plot-name" 
                  value={newPlotData.name}
                  onChange={(e) => setNewPlotData({...newPlotData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plot-location">Ubicación</Label>
                <Input 
                  id="plot-location" 
                  value={newPlotData.location}
                  onChange={(e) => setNewPlotData({...newPlotData, location: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plot-coordinates">Coordenadas</Label>
              <Input 
                id="plot-coordinates" 
                placeholder="19.4326, -99.1332"
                value={newPlotData.coordinates}
                onChange={(e) => setNewPlotData({...newPlotData, coordinates: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plot-area">Área (ha)</Label>
                <Input 
                  id="plot-area" 
                  type="number"
                  step="0.01"
                  value={newPlotData.area}
                  onChange={(e) => setNewPlotData({...newPlotData, area: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plot-total-plants">Plantas Totales</Label>
                <Input 
                  id="plot-total-plants" 
                  type="number"
                  value={newPlotData.total_plants}
                  onChange={(e) => setNewPlotData({...newPlotData, total_plants: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plot-available-plants">Plantas Disponibles</Label>
                <Input 
                  id="plot-available-plants" 
                  type="number"
                  value={newPlotData.available_plants}
                  onChange={(e) => setNewPlotData({...newPlotData, available_plants: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plot-soil">Tipo de Suelo</Label>
                <Input 
                  id="plot-soil" 
                  value={newPlotData.soil_type}
                  onChange={(e) => setNewPlotData({...newPlotData, soil_type: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plot-temperature">Temperatura</Label>
                <Input 
                  id="plot-temperature" 
                  placeholder="25°C promedio"
                  value={newPlotData.temperature}
                  onChange={(e) => setNewPlotData({...newPlotData, temperature: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plot-rainfall">Precipitación (mm)</Label>
                <Input 
                  id="plot-rainfall" 
                  type="number"
                  value={newPlotData.rainfall}
                  onChange={(e) => setNewPlotData({...newPlotData, rainfall: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plot-elevation">Elevación (m)</Label>
                <Input 
                  id="plot-elevation" 
                  type="number"
                  value={newPlotData.elevation}
                  onChange={(e) => setNewPlotData({...newPlotData, elevation: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowNewPlotDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreatePlot}>
              Crear Parcela
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showInvestmentDialog} onOpenChange={setShowInvestmentDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Inversión</DialogTitle>
            <DialogDescription>
              Actualiza los detalles de la inversión.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Usuario
              </Label>
              <Input id="name" value={userProfiles[selectedInvestment?.user_id]?.name || 'N/A'} className="col-span-3" disabled />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="species" className="text-right">
                Especie
              </Label>
              <Input id="species" value={plantSpecies.find(s => s.id === selectedInvestment?.species_id)?.name || 'N/A'} className="col-span-3" disabled />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="plants" className="text-right">
                Plantas
              </Label>
              <Input id="plants" value={selectedInvestment?.plant_count} className="col-span-3" disabled />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="year" className="text-right">
                Año
              </Label>
              <Input id="year" value={selectedInvestment?.plantation_year} className="col-span-3" disabled />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="investment" className="text-right">
                Inversión
              </Label>
              <Input id="investment" value={formatCurrency(selectedInvestment?.total_amount || 0)} className="col-span-3" disabled />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Estado
              </Label>
              <Select>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={selectedInvestment?.status} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activa</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
