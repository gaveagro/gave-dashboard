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
import { Users, Plus, Send, DollarSign, TrendingUp, RotateCcw } from 'lucide-react';

const Admin = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'investor'>('investor');

  const [newInvestmentUserId, setNewInvestmentUserId] = useState('');
  const [newInvestmentSpecies, setNewInvestmentSpecies] = useState('');
  const [newInvestmentPlantCount, setNewInvestmentPlantCount] = useState('');
  const [newInvestmentYear, setNewInvestmentYear] = useState('');
  const [newInvestmentPricePerPlant, setNewInvestmentPricePerPlant] = useState('');

  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationTarget, setNotificationTarget] = useState<'all' | 'specific'>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const { data: users } = useQuery({
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
          plant_species (name),
          profiles (name, email)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: { email: string; name: string; role: 'admin' | 'investor' }) => {
      const { data, error } = await supabase.auth.admin.createUser({
        email: userData.email,
        email_confirm: false,
        user_metadata: { name: userData.name }
      });

      if (error) throw error;

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: data.user.id,
          email: userData.email,
          name: userData.name,
          role: userData.role
        });

      if (profileError) throw profileError;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Usuario creado",
        description: "El usuario ha sido creado exitosamente."
      });
      setNewUserEmail('');
      setNewUserName('');
      setNewUserRole('investor');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo crear el usuario: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const sendPasswordResetMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Email enviado",
        description: "Se ha enviado un email para restablecer la contraseña."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo enviar el email: ${error.message}`,
        variant: "destructive"
      });
    }
  });

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
        description: "La inversión ha sido registrada exitosamente."
      });
      setNewInvestmentUserId('');
      setNewInvestmentSpecies('');
      setNewInvestmentPlantCount('');
      setNewInvestmentYear('');
      setNewInvestmentPricePerPlant('');
      queryClient.invalidateQueries({ queryKey: ['admin-investments'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo crear la inversión: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const sendNotificationMutation = useMutation({
    mutationFn: async (notificationData: {
      title: string;
      message: string;
      target: 'all' | 'specific';
      userIds?: string[];
    }) => {
      let targetUserIds: string[] = [];

      if (notificationData.target === 'all') {
        const allUsers = users || [];
        targetUserIds = allUsers.map(user => user.user_id);
      } else {
        targetUserIds = notificationData.userIds || [];
      }

      const notifications = targetUserIds.map(userId => ({
        user_id: userId,
        title: notificationData.title,
        message: notificationData.message,
        type: 'info'
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Notificación enviada",
        description: "La notificación ha sido enviada exitosamente."
      });
      setNotificationTitle('');
      setNotificationMessage('');
      setNotificationTarget('all');
      setSelectedUsers([]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo enviar la notificación: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const handleCreateUser = () => {
    if (!newUserEmail || !newUserName) return;

    createUserMutation.mutate({
      email: newUserEmail,
      name: newUserName,
      role: newUserRole
    });
  };

  const handleCreateInvestment = () => {
    if (!newInvestmentUserId || !newInvestmentSpecies || !newInvestmentPlantCount || !newInvestmentYear || !newInvestmentPricePerPlant) return;

    createInvestmentMutation.mutate({
      userId: newInvestmentUserId,
      speciesId: newInvestmentSpecies,
      plantCount: parseInt(newInvestmentPlantCount),
      plantationYear: parseInt(newInvestmentYear),
      pricePerPlant: parseFloat(newInvestmentPricePerPlant)
    });
  };

  const handleSendNotification = () => {
    if (!notificationTitle || !notificationMessage) return;

    if (notificationTarget === 'specific' && selectedUsers.length === 0) {
      toast({
        title: "Error",
        description: "Selecciona al menos un usuario para notificaciones específicas.",
        variant: "destructive"
      });
      return;
    }

    sendNotificationMutation.mutate({
      title: notificationTitle,
      message: notificationMessage,
      target: notificationTarget,
      userIds: notificationTarget === 'specific' ? selectedUsers : undefined
    });
  };

  const updateUserEmail = async (userId: string, newEmail: string) => {
    try {
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        email: newEmail
      });

      if (error) throw error;

      await supabase
        .from('profiles')
        .update({ email: newEmail })
        .eq('user_id', userId);

      toast({
        title: "Email actualizado",
        description: "El email del usuario ha sido actualizado."
      });
      
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `No se pudo actualizar el email: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <p>No tienes permisos para acceder a esta página.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Panel de Administración</h1>
        <p className="text-muted-foreground">
          Gestiona usuarios, inversiones y notificaciones
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="investments">Inversiones</TabsTrigger>
          <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
          <TabsTrigger value="stats">Estadísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Crear Nuevo Usuario
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="usuario@email.com"
                  />
                </div>
                <div>
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Nombre completo"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Rol</Label>
                  <Select value={newUserRole} onValueChange={(value: 'admin' | 'investor') => setNewUserRole(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="investor">Inversor</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                onClick={handleCreateUser}
                disabled={createUserMutation.isPending || !newUserEmail || !newUserName}
              >
                {createUserMutation.isPending ? 'Creando...' : 'Crear Usuario'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Usuarios Registrados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users?.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{user.name}</h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Editar Email
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Editar Email</DialogTitle>
                            <DialogDescription>
                              Actualizar el email de {user.name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Input
                              defaultValue={user.email}
                              onChange={(e) => {
                                const newEmail = e.target.value;
                                e.target.setAttribute('data-new-email', newEmail);
                              }}
                            />
                            <Button
                              onClick={(e) => {
                                const input = e.currentTarget.parentElement?.querySelector('input');
                                const newEmail = input?.getAttribute('data-new-email') || input?.value;
                                if (newEmail && newEmail !== user.email) {
                                  updateUserEmail(user.user_id, newEmail);
                                }
                              }}
                            >
                              Actualizar Email
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendPasswordResetMutation.mutate(user.email)}
                        disabled={sendPasswordResetMutation.isPending}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset Password
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="investments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Nueva Inversión
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <Label>Usuario</Label>
                  <Select value={newInvestmentUserId} onValueChange={setNewInvestmentUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.filter(u => u.role === 'investor').map((user) => (
                        <SelectItem key={user.id} value={user.user_id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Especie</Label>
                  <Select value={newInvestmentSpecies} onValueChange={setNewInvestmentSpecies}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar especie" />
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
                  <Label>Cantidad de plantas</Label>
                  <Input
                    type="number"
                    value={newInvestmentPlantCount}
                    onChange={(e) => setNewInvestmentPlantCount(e.target.value)}
                    placeholder="100"
                  />
                </div>
                <div>
                  <Label>Año de establecimiento</Label>
                  <Input
                    type="number"
                    value={newInvestmentYear}
                    onChange={(e) => setNewInvestmentYear(e.target.value)}
                    placeholder="2024"
                  />
                </div>
                <div>
                  <Label>Precio por planta ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newInvestmentPricePerPlant}
                    onChange={(e) => setNewInvestmentPricePerPlant(e.target.value)}
                    placeholder="100.00"
                  />
                </div>
              </div>
              {newInvestmentPlantCount && newInvestmentPricePerPlant && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">
                    Total de inversión: ${(parseInt(newInvestmentPlantCount || '0') * parseFloat(newInvestmentPricePerPlant || '0')).toLocaleString()}
                  </p>
                </div>
              )}
              <Button 
                onClick={handleCreateInvestment}
                disabled={createInvestmentMutation.isPending || !newInvestmentUserId || !newInvestmentSpecies || !newInvestmentPlantCount || !newInvestmentYear || !newInvestmentPricePerPlant}
              >
                {createInvestmentMutation.isPending ? 'Creando...' : 'Crear Inversión'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inversiones Registradas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {investments?.map((investment) => (
                  <div key={investment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{investment.profiles?.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {investment.plant_count} plantas de {investment.plant_species?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Año: {investment.plantation_year} | Total: ${investment.total_amount.toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={investment.status === 'active' ? 'default' : 'secondary'}>
                      {investment.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Enviar Notificación
              </CardTitle>
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
                  placeholder="Mensaje de la notificación"
                  rows={4}
                />
              </div>
              <div>
                <Label>Destinatarios</Label>
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
                <div>
                  <Label>Seleccionar usuarios</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2">
                    {users?.map((user) => (
                      <label key={user.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.user_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, user.user_id]);
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.user_id));
                            }
                          }}
                        />
                        <span className="text-sm">{user.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <Button 
                onClick={handleSendNotification}
                disabled={sendNotificationMutation.isPending || !notificationTitle || !notificationMessage}
              >
                <Send className="h-4 w-4 mr-2" />
                {sendNotificationMutation.isPending ? 'Enviando...' : 'Enviar Notificación'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users?.length || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Inversiones</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{investments?.length || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${investments?.reduce((sum, inv) => sum + inv.total_amount, 0).toLocaleString() || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Plantas</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {investments?.reduce((sum, inv) => sum + inv.plant_count, 0).toLocaleString() || 0}
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
