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
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload, User, Mail, Phone, DollarSign } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

type Profile = Tables<'profiles'>;

export function UserManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [newUserData, setNewUserData] = useState({
    email: '',
    name: '',
    phone: '',
    role: 'investor' as 'admin' | 'investor',
    account_balance: 0
  });

  // Fetch users
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
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
                <TableHead>Rol</TableHead>
                <TableHead>Fecha de Registro</TableHead>
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
                      ${(user.account_balance || 0).toLocaleString()}
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
    </div>
  );
}