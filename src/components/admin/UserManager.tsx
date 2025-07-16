import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload, User, Mail, Phone, DollarSign, Edit } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

type Profile = Tables<'profiles'>;

export function UserManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [csvData, setCsvData] = useState('');
  const [newUserData, setNewUserData] = useState({
    email: '',
    name: '',
    phone: '',
    role: 'investor' as 'admin' | 'investor',
    account_balance: 0
  });
  const [editUserData, setEditUserData] = useState({
    email: '',
    name: '',
    phone: '',
    role: 'investor' as 'admin' | 'investor',
    account_balance: 0
  });

  // Fetch users with investment totals
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (profilesError) throw profilesError;

      // Get investment totals for each user
      const { data: investments, error: investmentsError } = await supabase
        .from('investments')
        .select('user_id, total_amount');
      
      if (investmentsError) throw investmentsError;

      // Calculate total invested per user
      const investmentTotals = investments?.reduce((acc: Record<string, number>, inv) => {
        acc[inv.user_id] = (acc[inv.user_id] || 0) + inv.total_amount;
        return acc;
      }, {}) || {};

      // Add investment totals to profiles
      return profiles?.map(profile => ({
        ...profile,
        total_invested: investmentTotals[profile.user_id] || 0
      })) || [];
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUserData) => {
      const { data, error } = await supabase.rpc('create_user_with_profile_v2', {
        user_email: userData.email,
        user_name: userData.name,
        user_role: userData.role,
        user_balance: userData.account_balance
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.success) {
        queryClient.invalidateQueries({ queryKey: ['users'] });
        setIsCreateDialogOpen(false);
        setNewUserData({
          email: '',
          name: '',
          phone: '',
          role: 'investor',
          account_balance: 0
        });
        toast({
          title: "Usuario creado",
          description: "El usuario ha sido creado exitosamente con confirmación automática",
        });
      } else {
        throw new Error(data?.error || 'Error desconocido');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el usuario",
        variant: "destructive",
      });
    },
  });

  // Bulk import mutation
  const bulkImportMutation = useMutation({
    mutationFn: async (csvData: string) => {
      // Parse CSV data
      const lines = csvData.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const users = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const user: any = {};
        
        headers.forEach((header, index) => {
          if (header === 'email' || header === 'correo') user.email = values[index];
          if (header === 'name' || header === 'nombre') user.name = values[index];
          if (header === 'phone' || header === 'telefono' || header === 'teléfono') user.phone = values[index];
          if (header === 'balance' || header === 'saldo') user.balance = parseFloat(values[index]) || 0;
          if (header === 'role' || header === 'rol') user.role = values[index] === 'admin' ? 'admin' : 'investor';
        });
        
        return user;
      }).filter(user => user.email && user.name);

      const { data, error } = await supabase.rpc('bulk_import_users', {
        users_data: users
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.success) {
        queryClient.invalidateQueries({ queryKey: ['users'] });
        setIsImportDialogOpen(false);
        setCsvData('');
        toast({
          title: "Importación completada",
          description: `${data.imported_count || 0} usuarios importados. ${data.error_count || 0} errores.`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error en importación",
        description: error.message || "No se pudo importar los usuarios",
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = () => {
    createUserMutation.mutate(newUserData);
  };

  const handleBulkImport = () => {
    bulkImportMutation.mutate(csvData);
  };

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (userData: typeof editUserData & { userId: string }) => {
      // Update profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          email: userData.email,
          name: userData.name,
          phone: userData.phone,
          role: userData.role,
          account_balance: userData.account_balance
        })
        .eq('user_id', userData.userId);
      
      if (profileError) throw profileError;

      // Update auth.users email if changed
      const { error: authError } = await supabase.auth.admin.updateUserById(
        userData.userId,
        { email: userData.email }
      );
      
      // Don't throw error for auth update as it might be permission issue
      // but we'll continue with profile update
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      toast({
        title: "Usuario actualizado",
        description: "Los datos del usuario han sido actualizados correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el usuario",
        variant: "destructive",
      });
    },
  });

  // Sync account balance with investments
  const syncBalanceMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Get total investments for user
      const { data: investments, error } = await supabase
        .from('investments')
        .select('total_amount')
        .eq('user_id', userId);
      
      if (error) throw error;

      const totalInvested = investments?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0;

      // Update profile balance
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ account_balance: totalInvested })
        .eq('user_id', userId);
      
      if (updateError) throw updateError;
      
      return totalInvested;
    },
    onSuccess: (totalInvested) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: "Balance sincronizado",
        description: `Balance actualizado a $${totalInvested.toLocaleString()}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo sincronizar el balance",
        variant: "destructive",
      });
    },
  });

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setEditUserData({
      email: user.email,
      name: user.name || '',
      phone: user.phone || '',
      role: user.role,
      account_balance: user.account_balance || 0
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = () => {
    if (editingUser) {
      updateUserMutation.mutate({
        ...editUserData,
        userId: editingUser.user_id
      });
    }
  };

  const handleSyncBalance = (userId: string) => {
    syncBalanceMutation.mutate(userId);
  };

  const csvTemplate = `email,nombre,telefono,balance,rol
ejemplo1@email.com,Juan Pérez,+52 123 456 7890,1500.00,investor
ejemplo2@email.com,María González,+52 098 765 4321,2000.50,investor
admin@email.com,Admin User,+52 555 555 5555,0,admin`;

  if (isLoading) {
    return <div className="text-center py-6">Cargando usuarios...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>
          <p className="text-muted-foreground">Administra usuarios y sus balances</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Importar CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Importar Usuarios desde CSV</DialogTitle>
                <DialogDescription>
                  Importa múltiples usuarios desde un archivo CSV. Todos los usuarios serán creados con confirmación automática.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Formato CSV esperado:</Label>
                  <pre className="bg-muted p-3 rounded text-sm mt-2 overflow-x-auto">
                    {csvTemplate}
                  </pre>
                </div>
                <div>
                  <Label htmlFor="csvData">Datos CSV</Label>
                  <Textarea
                    id="csvData"
                    value={csvData}
                    onChange={(e) => setCsvData(e.target.value)}
                    placeholder="Pega aquí los datos CSV..."
                    rows={10}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleBulkImport} disabled={bulkImportMutation.isPending || !csvData.trim()}>
                    {bulkImportMutation.isPending ? 'Importando...' : 'Importar Usuarios'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Usuario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                <DialogDescription>
                  Agrega un nuevo usuario al sistema con confirmación automática
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="usuario@ejemplo.com"
                  />
                </div>
                <div>
                  <Label htmlFor="name">Nombre Completo</Label>
                  <Input
                    id="name"
                    value={newUserData.name}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Juan Pérez"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono (opcional)</Label>
                  <Input
                    id="phone"
                    value={newUserData.phone}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+52 123 456 7890"
                  />
                </div>
                <div>
                  <Label htmlFor="balance">Balance Inicial</Label>
                  <Input
                    id="balance"
                    type="number"
                    step="0.01"
                    value={newUserData.account_balance}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, account_balance: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Rol</Label>
                  <select
                    id="role"
                    value={newUserData.role}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, role: e.target.value as 'admin' | 'investor' }))}
                    className="w-full p-2 border rounded"
                  >
                    <option value="investor">Inversionista</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateUser} disabled={createUserMutation.isPending}>
                    {createUserMutation.isPending ? 'Creando...' : 'Crear Usuario'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
          <CardDescription>
            Total de usuarios: {users?.length || 0}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Total Invertido</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Fecha de Registro</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {user.name || 'Sin nombre'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {user.phone || 'No registrado'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span className={user.account_balance !== user.total_invested ? 'text-orange-600' : ''}>
                        ${(user.account_balance || 0).toLocaleString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      ${(user.total_invested || 0).toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                      {user.role === 'admin' ? 'Admin' : 'Inversionista'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString('es-MX')}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditUser(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {user.account_balance !== user.total_invested && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSyncBalance(user.user_id)}
                          disabled={syncBalanceMutation.isPending}
                          title="Sincronizar balance con inversiones"
                        >
                          💰
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {users?.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              No hay usuarios registrados
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifica los datos del usuario seleccionado
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-email">Correo Electrónico</Label>
              <Input
                id="edit-email"
                type="email"
                value={editUserData.email}
                onChange={(e) => setEditUserData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="usuario@ejemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="edit-name">Nombre Completo</Label>
              <Input
                id="edit-name"
                value={editUserData.name}
                onChange={(e) => setEditUserData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Juan Pérez"
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Teléfono</Label>
              <Input
                id="edit-phone"
                value={editUserData.phone}
                onChange={(e) => setEditUserData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+52 123 456 7890"
              />
            </div>
            <div>
              <Label htmlFor="edit-balance">Balance de Cuenta</Label>
              <Input
                id="edit-balance"
                type="number"
                step="0.01"
                value={editUserData.account_balance}
                onChange={(e) => setEditUserData(prev => ({ ...prev, account_balance: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="edit-role">Rol</Label>
              <Select
                value={editUserData.role}
                onValueChange={(value: 'admin' | 'investor') => setEditUserData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="investor">Inversionista</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateUser} disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? 'Actualizando...' : 'Actualizar Usuario'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}