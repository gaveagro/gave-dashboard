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
import { Users, Plus, Send, DollarSign, TrendingUp, RotateCcw, MapPin, Trash2, Upload, Download, Eye, Edit, FileText } from 'lucide-react';

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
  
  // Price editing states
  const [editingPrice, setEditingPrice] = useState<any>(null);
  const [showPriceDialog, setShowPriceDialog] = useState(false);
  const [newPriceValue, setNewPriceValue] = useState('');
  
  // Report states
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [reportName, setReportName] = useState('');
  const [reportUploading, setReportUploading] = useState(false);

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

  // Fetch profiles separately to join with investments
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

  // Fetch investment requests
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

  // Fetch notifications for admin management
  const { data: allNotifications } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Get user profiles separately
      const userIds = [...new Set(notifications?.map(n => n.user_id))];
      const { data: userProfiles } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', userIds);

      // Join the data
      return notifications?.map(notification => ({
        ...notification,
        user_profile: userProfiles?.find(p => p.user_id === notification.user_id)
      }));
    }
  });

  // Fetch plant prices
  const { data: plantPrices } = useQuery({
    queryKey: ['admin-plant-prices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plant_prices')
        .select(`
          *,
          plant_species (name)
        `)
        .order('year', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch reports
  const { data: reports } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('document_type', 'report')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: { email: string; name: string; role: 'admin' | 'investor' }) => {
      // Create the profile directly since we can't create auth users from client
      const randomId = crypto.randomUUID();
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: randomId,
          email: userData.email,
          name: userData.name,
          role: userData.role
        })
        .select()
        .single();

      if (profileError) throw profileError;
      
      return profile;
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
    onError: (error: any) => {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el usuario.",
        variant: "destructive"
      });
    }
  });

  // Upload document mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !documentType || !documentName || !documentUserId) {
        throw new Error('Por favor completa todos los campos requeridos');
      }

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${documentUserId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('contracts')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: documentUserId,
          document_name: documentName,
          document_type: documentType,
          contract_type: documentType === 'contract' ? contractType : null,
          document_url: publicUrl,
          file_size: selectedFile.size,
          uploaded_by: profile?.user_id
        });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Documento subido correctamente"
      });
      setSelectedFile(null);
      setDocumentType('');
      setDocumentName('');
      setContractType('');
      setDocumentUserId('');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (error: any) => {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: error.message || "Error al subir el archivo",
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

  // Update plot mutation
  const updatePlotMutation = useMutation({
    mutationFn: async ({ plotId, plotData }: { plotId: string; plotData: any }) => {
      const { error } = await supabase
        .from('plots')
        .update({
          name: plotData.name,
          location: plotData.location,
          coordinates: plotData.coordinates,
          area: parseFloat(plotData.area),
                  total_plants: parseInt(plotData.total_plants) || 0,
                  available_plants: parseInt(plotData.total_plants) || 0,
          temperature: plotData.temperature || null,
          rainfall: plotData.rainfall ? parseInt(plotData.rainfall) : null,
          elevation: plotData.elevation ? parseInt(plotData.elevation) : null,
          latitude: plotData.latitude ? parseFloat(plotData.latitude) : null,
          longitude: plotData.longitude ? parseFloat(plotData.longitude) : null,
        })
        .eq('id', plotId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Parcela actualizada",
        description: "La parcela ha sido actualizada exitosamente."
      });
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
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo enviar la notificación: ${error.message}`,
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
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo eliminar la inversión: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Notificación eliminada",
        description: "La notificación ha sido eliminada exitosamente."
      });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo eliminar la notificación: ${error.message}`,
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

  const handleUploadDocument = () => {
    uploadDocumentMutation.mutate();
  };

  const handleCreatePlot = () => {
    if (!newPlotData.name || !newPlotData.location || !newPlotData.area) {
      toast({
        title: "Error",
        description: "Por favor completa los campos requeridos (nombre, ubicación, área).",
        variant: "destructive"
      });
      return;
    }

    createPlotMutation.mutate(newPlotData);
  };

  // Update price mutation
  const updatePriceMutation = useMutation({
    mutationFn: async ({ priceId, newPrice }: { priceId: string; newPrice: number }) => {
      const { error } = await supabase
        .from('plant_prices')
        .update({ price_per_plant: newPrice })
        .eq('id', priceId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Precio actualizado",
        description: "El precio ha sido actualizado exitosamente."
      });
      setShowPriceDialog(false);
      setEditingPrice(null);
      setNewPriceValue('');
      queryClient.invalidateQueries({ queryKey: ['admin-plant-prices'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `No se pudo actualizar el precio: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Upload report mutation
  const uploadReportMutation = useMutation({
    mutationFn: async () => {
      if (!reportFile || !reportName) {
        throw new Error('Por favor completa todos los campos requeridos');
      }

      const fileExt = reportFile.name.split('.').pop();
      const fileName = `reports/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(fileName, reportFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('contracts')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: profile?.user_id || '',
          document_name: reportName,
          document_type: 'report',
          document_url: publicUrl,
          file_size: reportFile.size,
          uploaded_by: profile?.user_id
        });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast({
        title: "Reporte subido",
        description: "El reporte ha sido subido exitosamente."
      });
      setReportFile(null);
      setReportName('');
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Error al subir el reporte: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Delete report mutation
  const deleteReportMutation = useMutation({
    mutationFn: async ({ reportId, documentUrl }: { reportId: string; documentUrl: string }) => {
      // Extract file path from URL
      const urlParts = documentUrl.split('/');
      const filePath = urlParts.slice(-2).join('/');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('contracts')
        .remove([filePath]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', reportId);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast({
        title: "Reporte eliminado",
        description: "El reporte ha sido eliminado exitosamente."
      });
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Error al eliminar el reporte: ${error.message}`,
        variant: "destructive"
      });
    }
  });

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
          Gestiona usuarios, inversiones, parcelas y notificaciones
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="investments">Inversiones</TabsTrigger>
          <TabsTrigger value="requests">Solicitudes</TabsTrigger>
          <TabsTrigger value="species">Especies</TabsTrigger>
          <TabsTrigger value="plots">Parcelas</TabsTrigger>
          <TabsTrigger value="reports">Reportes</TabsTrigger>
          <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
          <TabsTrigger value="stats">Estadísticas</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
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

        {/* Investments Tab */}
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
                {investments?.map((investment) => {
                  const userProfile = profiles?.find(p => p.user_id === investment.user_id);
                  return (
                    <div key={investment.id} className="flex items-center justify-between p-4 border rounded-lg">
                     <div>
                       <h3 className="font-semibold">{userProfile?.name || userProfile?.email || `Usuario ID: ${investment.user_id}`}</h3>
                      <p className="text-sm text-muted-foreground">
                        {investment.plant_count} plantas de {investment.plant_species?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Año: {investment.plantation_year} | Total: ${investment.total_amount.toLocaleString()}
                      </p>
                    </div>
                     <div className="flex items-center gap-2">
                       <Badge variant={investment.status === 'active' ? 'default' : 'secondary'}>
                         {investment.status}
                       </Badge>
                       <Button
                         variant="destructive"
                         size="sm"
                         onClick={() => deleteInvestmentMutation.mutate(investment.id)}
                         disabled={deleteInvestmentMutation.isPending}
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     </div>
                   </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Investment Requests Tab */}
        <TabsContent value="requests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Solicitudes de Inversión</CardTitle>
              <CardDescription>
                Revisa y gestiona las solicitudes de nuevas inversiones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {investmentRequests?.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{request.user_name}</h3>
                      <p className="text-sm text-muted-foreground">{request.user_email}</p>
                      <p className="text-sm text-muted-foreground">
                        {request.plant_count} plantas de {request.species_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Año: {request.establishment_year} | Total: ${request.total_investment.toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={request.status === 'pending' ? 'outline' : request.status === 'approved' ? 'default' : 'destructive'}>
                      {request.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Species Management Tab */}
        <TabsContent value="species" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Especies y Precios</CardTitle>
              <CardDescription>
                Administra especies de plantas y sus precios por año
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Plant Prices List */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Precios por Especie y Año</h3>
                  {plantPrices?.map((price) => (
                    <div key={price.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <span className="font-medium">{price.plant_species?.name}</span>
                        <span className="text-muted-foreground ml-2">({price.year})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">${price.price_per_plant}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingPrice(price);
                            setNewPriceValue(price.price_per_plant.toString());
                            setShowPriceDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Especies Disponibles</h3>
                  <div className="space-y-4">
                    {plantSpecies?.map((species) => (
                      <div key={species.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{species.name}</h4>
                            <p className="text-sm text-muted-foreground">{species.scientific_name}</p>
                            <p className="text-sm text-muted-foreground">
                              Maduración: {species.maturation_years} años | 
                              Peso: {species.min_weight_kg}-{species.max_weight_kg} kg
                            </p>
                            {species.carbon_capture_per_plant && (
                              <p className="text-sm text-muted-foreground">
                                Captura CO₂: {species.carbon_capture_per_plant} t por planta
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <h5 className="font-medium mb-2">Precios por Año</h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {plantPrices?.filter(price => price.species_id === species.id).map((price) => (
                              <div key={price.id} className="text-sm">
                                {price.year}: ${price.price_per_plant}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plots Tab */}
        <TabsContent value="plots" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Agregar Nueva Parcela
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowCreatePlotDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Parcela
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Parcelas Existentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {plots?.map((plot) => (
                  <div key={plot.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{plot.name}</h3>
                      <p className="text-sm text-muted-foreground">{plot.location}</p>
                       <p className="text-sm text-muted-foreground">
                         Área: {plot.area} ha | Plantas: {plot.total_plants}
                       </p>
                     </div>
                     <div className="flex gap-2">
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => {
                           setEditingPlot(plot);
                           setNewPlotData({
                             name: plot.name,
                             location: plot.location,
                             coordinates: plot.coordinates || '',
                             area: plot.area.toString(),
                             total_plants: plot.total_plants.toString(),
                             available_plants: plot.available_plants.toString(),
                             temperature: plot.temperature || '',
                             rainfall: plot.rainfall?.toString() || '',
                             elevation: plot.elevation?.toString() || '',
                             latitude: plot.latitude?.toString() || '',
                             longitude: plot.longitude?.toString() || ''
                           });
                           setShowEditPlotDialog(true);
                         }}
                       >
                         Editar
                       </Button>
                       <Button
                         variant="destructive"
                         size="sm"
                         onClick={() => deletePlotMutation.mutate(plot.id)}
                         disabled={deletePlotMutation.isPending}
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Create Plot Dialog */}
          <Dialog open={showCreatePlotDialog} onOpenChange={setShowCreatePlotDialog}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Nueva Parcela</DialogTitle>
                <DialogDescription>
                  Completa la información de la nueva parcela
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="plot-name">Nombre *</Label>
                    <Input 
                      id="plot-name" 
                      value={newPlotData.name}
                      onChange={(e) => setNewPlotData({...newPlotData, name: e.target.value})}
                      placeholder="Nombre de la parcela"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plot-location">Ubicación *</Label>
                    <Input 
                      id="plot-location" 
                      value={newPlotData.location}
                      onChange={(e) => setNewPlotData({...newPlotData, location: e.target.value})}
                      placeholder="Ciudad, Estado"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plot-coordinates">Coordenadas Google Maps</Label>
                  <Input 
                    id="plot-coordinates" 
                    value={newPlotData.coordinates}
                    onChange={(e) => setNewPlotData({...newPlotData, coordinates: e.target.value})}
                    placeholder="19.4326, -99.1332"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="plot-area">Área (ha) *</Label>
                    <Input 
                      id="plot-area" 
                      type="number"
                      step="0.01"
                      value={newPlotData.area}
                      onChange={(e) => setNewPlotData({...newPlotData, area: e.target.value})}
                      placeholder="10.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plot-total-plants">Plantas Totales</Label>
                    <Input 
                      id="plot-total-plants" 
                      type="number"
                      value={newPlotData.total_plants}
                      onChange={(e) => setNewPlotData({...newPlotData, total_plants: e.target.value})}
                      placeholder="1000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plot-available-plants">Plantas Disponibles</Label>
                    <Input 
                      id="plot-available-plants" 
                      type="number"
                      value={newPlotData.available_plants}
                      onChange={(e) => setNewPlotData({...newPlotData, available_plants: e.target.value})}
                      placeholder="500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="plot-temperature">Temperatura Promedio</Label>
                    <Input 
                      id="plot-temperature" 
                      value={newPlotData.temperature}
                      onChange={(e) => setNewPlotData({...newPlotData, temperature: e.target.value})}
                      placeholder="22°C"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plot-rainfall">Precipitación (mm)</Label>
                    <Input 
                      id="plot-rainfall" 
                      type="number"
                      value={newPlotData.rainfall}
                      onChange={(e) => setNewPlotData({...newPlotData, rainfall: e.target.value})}
                      placeholder="800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plot-elevation">Elevación (m)</Label>
                    <Input 
                      id="plot-elevation" 
                      type="number"
                      value={newPlotData.elevation}
                      onChange={(e) => setNewPlotData({...newPlotData, elevation: e.target.value})}
                      placeholder="1500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="plot-latitude">Latitud</Label>
                    <Input 
                      id="plot-latitude" 
                      type="number"
                      step="any"
                      value={newPlotData.latitude}
                      onChange={(e) => setNewPlotData({...newPlotData, latitude: e.target.value})}
                      placeholder="19.4326"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plot-longitude">Longitud</Label>
                    <Input 
                      id="plot-longitude" 
                      type="number"
                      step="any"
                      value={newPlotData.longitude}
                      onChange={(e) => setNewPlotData({...newPlotData, longitude: e.target.value})}
                      placeholder="-99.1332"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreatePlotDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreatePlot} disabled={createPlotMutation.isPending}>
                  {createPlotMutation.isPending ? 'Creando...' : 'Crear Parcela'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Plot Dialog */}
          <Dialog open={showEditPlotDialog} onOpenChange={setShowEditPlotDialog}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar Parcela</DialogTitle>
                <DialogDescription>
                  Modifica la información de la parcela
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-plot-name">Nombre *</Label>
                    <Input 
                      id="edit-plot-name" 
                      value={newPlotData.name}
                      onChange={(e) => setNewPlotData({...newPlotData, name: e.target.value})}
                      placeholder="Nombre de la parcela"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-plot-location">Ubicación *</Label>
                    <Input 
                      id="edit-plot-location" 
                      value={newPlotData.location}
                      onChange={(e) => setNewPlotData({...newPlotData, location: e.target.value})}
                      placeholder="Ciudad, Estado"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-plot-coordinates">Coordenadas Google Maps</Label>
                  <Input 
                    id="edit-plot-coordinates" 
                    value={newPlotData.coordinates}
                    onChange={(e) => setNewPlotData({...newPlotData, coordinates: e.target.value})}
                    placeholder="19.4326, -99.1332"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-plot-area">Área (ha) *</Label>
                    <Input 
                      id="edit-plot-area" 
                      type="number"
                      step="0.01"
                      value={newPlotData.area}
                      onChange={(e) => setNewPlotData({...newPlotData, area: e.target.value})}
                      placeholder="10.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-plot-total-plants">Plantas Totales</Label>
                    <Input 
                      id="edit-plot-total-plants" 
                      type="number"
                      value={newPlotData.total_plants}
                      onChange={(e) => setNewPlotData({...newPlotData, total_plants: e.target.value})}
                      placeholder="1000"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-plot-temperature">Temperatura Promedio</Label>
                    <Input 
                      id="edit-plot-temperature" 
                      value={newPlotData.temperature}
                      onChange={(e) => setNewPlotData({...newPlotData, temperature: e.target.value})}
                      placeholder="22°C"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-plot-rainfall">Precipitación (mm)</Label>
                    <Input 
                      id="edit-plot-rainfall" 
                      type="number"
                      value={newPlotData.rainfall}
                      onChange={(e) => setNewPlotData({...newPlotData, rainfall: e.target.value})}
                      placeholder="800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-plot-elevation">Elevación (m)</Label>
                    <Input 
                      id="edit-plot-elevation" 
                      type="number"
                      value={newPlotData.elevation}
                      onChange={(e) => setNewPlotData({...newPlotData, elevation: e.target.value})}
                      placeholder="1500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-plot-latitude">Latitud</Label>
                    <Input 
                      id="edit-plot-latitude" 
                      type="number"
                      step="any"
                      value={newPlotData.latitude}
                      onChange={(e) => setNewPlotData({...newPlotData, latitude: e.target.value})}
                      placeholder="19.4326"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-plot-longitude">Longitud</Label>
                    <Input 
                      id="edit-plot-longitude" 
                      type="number"
                      step="any"
                      value={newPlotData.longitude}
                      onChange={(e) => setNewPlotData({...newPlotData, longitude: e.target.value})}
                      placeholder="-99.1332"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditPlotDialog(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={() => {
                    if (editingPlot) {
                      updatePlotMutation.mutate({ plotId: editingPlot.id, plotData: newPlotData });
                      setShowEditPlotDialog(false);
                    }
                  }} 
                  disabled={updatePlotMutation.isPending}
                >
                  {updatePlotMutation.isPending ? 'Actualizando...' : 'Actualizar Parcela'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Price Dialog */}
          <Dialog open={showPriceDialog} onOpenChange={setShowPriceDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Precio</DialogTitle>
                <DialogDescription>
                  Actualizar precio para {editingPrice?.plant_species?.name} ({editingPrice?.year})
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="new-price">Nuevo Precio</Label>
                  <Input
                    id="new-price"
                    type="number"
                    value={newPriceValue}
                    onChange={(e) => setNewPriceValue(e.target.value)}
                    placeholder="Precio por planta"
                  />
                </div>
                <Button
                  onClick={() => updatePriceMutation.mutate({
                    priceId: editingPrice?.id || '',
                    newPrice: parseFloat(newPriceValue)
                  })}
                  disabled={!newPriceValue || updatePriceMutation.isPending}
                >
                  {updatePriceMutation.isPending ? 'Actualizando...' : 'Actualizar Precio'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          {/* Upload Report Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Subir Reporte
              </CardTitle>
              <CardDescription>
                Sube reportes anuales y documentos oficiales
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="report-file">Archivo</Label>
                  <Input
                    id="report-file"
                    type="file"
                    onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="report-name">Nombre del reporte</Label>
                  <Input
                    id="report-name"
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    placeholder="Ej: Reporte Anual 2024"
                  />
                </div>
              </div>

              <Button 
                onClick={() => uploadReportMutation.mutate()} 
                disabled={reportUploading || !reportFile || !reportName}
              >
                {reportUploading ? 'Subiendo...' : 'Subir Reporte'}
              </Button>
            </CardContent>
          </Card>

          {/* Reports List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Reportes Existentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reports && reports.length > 0 ? (
                <div className="space-y-3">
                  {reports.map((report) => (
                    <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-gray-500" />
                          <div>
                            <h4 className="font-medium">{report.document_name}</h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{new Date(report.created_at).toLocaleDateString('es-MX')}</span>
                              {report.file_size && (
                                <span>{(report.file_size / 1024 / 1024).toFixed(2)} MB</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(report.document_url, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = report.document_url;
                            link.download = report.document_name;
                            link.target = '_blank';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteReportMutation.mutate({ 
                            reportId: report.id, 
                            documentUrl: report.document_url 
                          })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No hay reportes disponibles
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
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

          <Card>
            <CardHeader>
              <CardTitle>Notificaciones Enviadas</CardTitle>
              <CardDescription>
                Administra las notificaciones que han sido enviadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allNotifications?.map((notification) => (
                  <div key={notification.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{notification.title}</h3>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">
                        Para: {notification.user_profile?.name || notification.user_profile?.email} | 
                        Enviado: {new Date(notification.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={notification.read ? 'default' : 'outline'}>
                        {notification.read ? 'Leída' : 'No leída'}
                      </Badge>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteNotificationMutation.mutate(notification.id)}
                        disabled={deleteNotificationMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stats Tab */}
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

          {/* Breakdown by Species and Year */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Plantas por Especie</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {plantSpecies?.map((species) => {
                    const speciesInvestments = investments?.filter(inv => inv.species_id === species.id) || [];
                    const totalPlants = speciesInvestments.reduce((sum, inv) => sum + inv.plant_count, 0);
                    return totalPlants > 0 ? (
                      <div key={species.id} className="flex justify-between items-center">
                        <span className="text-sm">{species.name}</span>
                        <span className="font-semibold">{totalPlants.toLocaleString()}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Plantas por Año de Establecimiento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {investments && Object.entries(
                    investments.reduce((acc, inv) => {
                      acc[inv.plantation_year] = (acc[inv.plantation_year] || 0) + inv.plant_count;
                      return acc;
                    }, {} as Record<number, number>)
                  )
                  .sort(([a], [b]) => Number(b) - Number(a))
                  .map(([year, count]) => (
                    <div key={year} className="flex justify-between items-center">
                      <span className="text-sm">{year}</span>
                      <span className="font-semibold">{count.toLocaleString()}</span>
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
