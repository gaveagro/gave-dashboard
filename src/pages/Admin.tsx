import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, DollarSign, Settings, Bell, Leaf, Edit, Plus, Trash2, Upload, MapPin, BarChart3, FileText, Map } from "lucide-react";
import { Navigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'investor';
  account_balance: number;
  created_at: string;
}

interface Investment {
  id: string;
  user_id: string;
  plant_count: number;
  price_per_plant: number;
  total_amount: number;
  plantation_year: number;
  expected_harvest_year: number;
  species_id: string;
  status: string;
  created_at: string;
  plant_species?: {
    name: string;
    scientific_name: string;
  };
  profiles?: {
    name: string;
    email: string;
  };
}

interface PlantSpecies {
  id: string;
  name: string;
  scientific_name: string;
}

interface UserInvestmentsDialogProps {
  profile: Profile;
  onClose: () => void;
}

const UserInvestmentsDialog = ({ profile, onClose }: UserInvestmentsDialogProps) => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserInvestments();
  }, [profile.user_id]);

  const fetchUserInvestments = async () => {
    try {
      const { data, error } = await supabase
        .from('investments')
        .select(`
          *,
          plant_species (
            name,
            scientific_name
          )
        `)
        .eq('user_id', profile.user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvestments(data || []);
    } catch (error) {
      console.error('Error fetching investments:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las inversiones",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateInvestment = async (investmentId: string, field: string, value: number) => {
    try {
      const updateData: any = { [field]: value };
      
      // Si se actualiza plant_count o price_per_plant, recalcular total_amount
      const investment = investments.find(inv => inv.id === investmentId);
      if (investment) {
        if (field === 'plant_count') {
          updateData.total_amount = value * investment.price_per_plant;
        } else if (field === 'price_per_plant') {
          updateData.total_amount = investment.plant_count * value;
        }
      }

      const { error } = await supabase
        .from('investments')
        .update(updateData)
        .eq('id', investmentId);

      if (error) throw error;

      toast({
        title: "Inversión actualizada",
        description: "Los datos se actualizaron correctamente"
      });

      fetchUserInvestments();
      
      // Recalcular balance total del usuario
      await recalculateUserBalance();
    } catch (error) {
      console.error('Error updating investment:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la inversión",
        variant: "destructive"
      });
    }
  };

  const recalculateUserBalance = async () => {
    try {
      const totalInvested = investments.reduce((sum, inv) => sum + inv.total_amount, 0);
      
      await supabase
        .from('profiles')
        .update({ account_balance: totalInvested })
        .eq('user_id', profile.user_id);
    } catch (error) {
      console.error('Error recalculating balance:', error);
    }
  };

  const deleteInvestment = async (investmentId: string) => {
    try {
      const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', investmentId);

      if (error) throw error;

      toast({
        title: "Inversión eliminada",
        description: "La inversión se eliminó correctamente"
      });

      fetchUserInvestments();
      await recalculateUserBalance();
    } catch (error) {
      console.error('Error deleting investment:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la inversión",
        variant: "destructive"
      });
    }
  };

  const totalPlants = investments.reduce((sum, inv) => sum + inv.plant_count, 0);
  const totalInvested = investments.reduce((sum, inv) => sum + inv.total_amount, 0);

  return (
    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Leaf className="h-5 w-5" />
          Inversiones de {profile.name || profile.email}
        </DialogTitle>
        <DialogDescription>
          Gestiona las inversiones y plantas del usuario
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{totalPlants}</p>
            <p className="text-sm text-muted-foreground">Plantas Totales</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">${totalInvested.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Invertido</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Cargando inversiones...</div>
        ) : investments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Este usuario no tiene inversiones registradas
          </div>
        ) : (
          <div className="space-y-4">
            {investments.map((investment) => (
              <Card key={investment.id}>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Especie</Label>
                      <p className="font-medium">{investment.plant_species?.name || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">{investment.plant_species?.scientific_name}</p>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Cantidad de Plantas</Label>
                      <Input
                        type="number"
                        defaultValue={investment.plant_count}
                        className="mt-1"
                        onBlur={(e) => {
                          const newValue = parseInt(e.target.value);
                          if (newValue !== investment.plant_count) {
                            updateInvestment(investment.id, 'plant_count', newValue);
                          }
                        }}
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Precio por Planta (MXN)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        defaultValue={investment.price_per_plant}
                        className="mt-1"
                        onBlur={(e) => {
                          const newValue = parseFloat(e.target.value);
                          if (newValue !== investment.price_per_plant) {
                            updateInvestment(investment.id, 'price_per_plant', newValue);
                          }
                        }}
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Año de Plantación</Label>
                      <Input
                        type="number"
                        defaultValue={investment.plantation_year}
                        className="mt-1"
                        onBlur={(e) => {
                          const newValue = parseInt(e.target.value);
                          if (newValue !== investment.plantation_year) {
                            updateInvestment(investment.id, 'plantation_year', newValue);
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">Total de esta inversión:</p>
                      <p className="text-lg font-bold text-green-600">
                        ${investment.total_amount.toLocaleString()} MXN
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={investment.status === 'active' ? 'default' : 'secondary'}>
                        {investment.status}
                      </Badge>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteInvestment(investment.id)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DialogContent>
  );
};

const Admin = () => {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserBalance, setNewUserBalance] = useState("0");
  const [newUserSpecies, setNewUserSpecies] = useState("");
  const [newUserPlantCount, setNewUserPlantCount] = useState("0");
  const [newUserPricePerPlant, setNewUserPricePerPlant] = useState("0");
  const [newUserPlantationYear, setNewUserPlantationYear] = useState(new Date().getFullYear().toString());
  const [newUserHarvestYear, setNewUserHarvestYear] = useState((new Date().getFullYear() + 25).toString());
  const [selectedPlotForPhoto, setSelectedPlotForPhoto] = useState("");
  const [plots, setPlots] = useState<any[]>([]);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [plantSpecies, setPlantSpecies] = useState<PlantSpecies[]>([]);
  const [investmentsLoading, setInvestmentsLoading] = useState(false);
  
  // Estados para crear nueva inversión
  const [selectedUserForNewInvestment, setSelectedUserForNewInvestment] = useState("");
  const [newInvestmentSpecies, setNewInvestmentSpecies] = useState("");
  const [newInvestmentPlantCount, setNewInvestmentPlantCount] = useState("0");
  const [newInvestmentPricePerPlant, setNewInvestmentPricePerPlant] = useState("0");
  const [newInvestmentPlantationYear, setNewInvestmentPlantationYear] = useState(new Date().getFullYear().toString());
  const [newInvestmentHarvestYear, setNewInvestmentHarvestYear] = useState((new Date().getFullYear() + 25).toString());
  
  // Estados para gestión de precios
  const [priceYear, setPriceYear] = useState(new Date().getFullYear().toString());
  const [priceSpecies, setPriceSpecies] = useState("");
  const [pricePerPlant, setPricePerPlant] = useState("");

  // Redirect if not admin
  if (profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    fetchProfiles().then(() => {
      fetchAllInvestments();
    });
    fetchPlantSpecies();
    fetchPlots();
  }, []);

  const fetchPlots = async () => {
    try {
      const { data, error } = await supabase
        .from('plots')
        .select('*')
        .order('name');

      if (error) throw error;
      setPlots(data || []);
    } catch (error) {
      console.error('Error fetching plots:', error);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllInvestments = async () => {
    setInvestmentsLoading(true);
    try {
      const { data: investmentsData, error } = await supabase
        .from('investments')
        .select(`
          *,
          plant_species (
            name,
            scientific_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enriquecer con datos de perfil
      const enrichedInvestments = investmentsData?.map(investment => {
        const userProfile = profiles.find(p => p.user_id === investment.user_id);
        return {
          ...investment,
          profiles: userProfile ? {
            name: userProfile.name || userProfile.email,
            email: userProfile.email
          } : undefined
        };
      }) || [];

      setInvestments(enrichedInvestments);
    } catch (error) {
      console.error('Error fetching investments:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las inversiones",
        variant: "destructive"
      });
    } finally {
      setInvestmentsLoading(false);
    }
  };

  const fetchPlantSpecies = async () => {
    try {
      const { data, error } = await supabase
        .from('plant_species')
        .select('id, name, scientific_name')
        .order('name');

      if (error) throw error;
      setPlantSpecies(data || []);
    } catch (error) {
      console.error('Error fetching plant species:', error);
    }
  };

  const createUser = async () => {
    if (!newUserEmail || !newUserName) {
      toast({
        title: "Error",
        description: "Email y nombre son requeridos",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: newUserEmail,
        password: 'TempPassword123!', // Usuario deberá cambiar la contraseña
        email_confirm: true,
        user_metadata: { name: newUserName }
      });

      if (error) throw error;

      if (data.user) {
        // Crear perfil manualmente si no existe - ASEGURAR QUE SIEMPRE SE CREE
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            user_id: data.user.id,
            email: newUserEmail,
            name: newUserName,
            role: 'investor',
            account_balance: 0
          }, {
            onConflict: 'user_id'
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          toast({
            title: "Advertencia",
            description: "Usuario creado pero hubo problemas con el perfil",
            variant: "destructive"
          });
        }

        // Crear inversión si se especificaron datos
        if (newUserSpecies && newUserPlantCount !== "0") {
          const plantCount = parseInt(newUserPlantCount);
          const pricePerPlant = parseFloat(newUserPricePerPlant);
          const totalAmount = plantCount * pricePerPlant;

          const { error: investmentError } = await supabase
            .from('investments')
            .insert({
              user_id: data.user.id,
              species_id: newUserSpecies,
              plant_count: plantCount,
              price_per_plant: pricePerPlant,
              total_amount: totalAmount,
              plantation_year: parseInt(newUserPlantationYear),
              expected_harvest_year: parseInt(newUserHarvestYear),
              status: 'active'
            });

          if (investmentError) {
            console.error('Error creating investment:', investmentError);
          } else {
            // Actualizar balance del usuario
            await supabase
              .from('profiles')
              .update({ account_balance: totalAmount })
              .eq('user_id', data.user.id);
          }
        }
      }

      toast({
        title: "Usuario creado",
        description: `Usuario ${newUserEmail} creado exitosamente`
      });

      // Reset form
      setNewUserEmail("");
      setNewUserName("");
      setNewUserBalance("0");
      setNewUserSpecies("");
      setNewUserPlantCount("0");
      setNewUserPricePerPlant("0");
      setNewUserPlantationYear(new Date().getFullYear().toString());
      setNewUserHarvestYear((new Date().getFullYear() + 25).toString());
      
      fetchProfiles();
      fetchAllInvestments();
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el usuario",
        variant: "destructive"
      });
    }
  };

  const updateBalance = async (userId: string, newBalance: number) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ account_balance: newBalance })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Balance actualizado",
        description: "El balance del usuario se actualizó correctamente"
      });

      fetchProfiles();
    } catch (error) {
      console.error('Error updating balance:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el balance",
        variant: "destructive"
      });
    }
  };

  const sendNotification = async () => {
    if (!notificationTitle || !notificationMessage) {
      toast({
        title: "Error",
        description: "Título y mensaje son requeridos",
        variant: "destructive"
      });
      return;
    }

    try {
      // Enviar notificación a todos los usuarios (excepto admin)
      const investorProfiles = profiles.filter(p => p.role === 'investor');
      
      const notifications = investorProfiles.map(profile => ({
        user_id: profile.user_id,
        title: notificationTitle,
        message: notificationMessage,
        type: 'admin'
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;

      toast({
        title: "Notificaciones enviadas",
        description: `Se enviaron ${notifications.length} notificaciones`
      });

      setNotificationTitle("");
      setNotificationMessage("");
    } catch (error) {
      console.error('Error sending notifications:', error);
      toast({
        title: "Error",
        description: "No se pudieron enviar las notificaciones",
        variant: "destructive"
      });
    }
  };

  const updateInvestmentField = async (investmentId: string, field: string, value: any) => {
    try {
      const updateData: any = { [field]: value };
      
      // Si se actualiza plant_count o price_per_plant, recalcular total_amount
      const investment = investments.find(inv => inv.id === investmentId);
      if (investment) {
        if (field === 'plant_count') {
          updateData.total_amount = value * investment.price_per_plant;
        } else if (field === 'price_per_plant') {
          updateData.total_amount = investment.plant_count * value;
        }
      }

      const { error } = await supabase
        .from('investments')
        .update(updateData)
        .eq('id', investmentId);

      if (error) throw error;

      toast({
        title: "Inversión actualizada",
        description: "Los datos se actualizaron correctamente"
      });

      fetchAllInvestments();
    } catch (error) {
      console.error('Error updating investment:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la inversión",
        variant: "destructive"
      });
    }
  };

  const deleteInvestment = async (investmentId: string) => {
    try {
      const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', investmentId);

      if (error) throw error;

      toast({
        title: "Inversión eliminada",
        description: "La inversión se eliminó correctamente"
      });

      fetchAllInvestments();
    } catch (error) {
      console.error('Error deleting investment:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la inversión",
        variant: "destructive"
      });
    }
  };

  const createNewInvestment = async () => {
    if (!selectedUserForNewInvestment || !newInvestmentSpecies || !newInvestmentPlantCount || parseFloat(newInvestmentPlantCount) <= 0) {
      toast({
        title: "Error",
        description: "Todos los campos son requeridos y la cantidad debe ser mayor a 0",
        variant: "destructive"
      });
      return;
    }

    try {
      const plantCount = parseInt(newInvestmentPlantCount);
      const pricePerPlant = parseFloat(newInvestmentPricePerPlant);
      const totalAmount = plantCount * pricePerPlant;

      const { error } = await supabase
        .from('investments')
        .insert({
          user_id: selectedUserForNewInvestment,
          species_id: newInvestmentSpecies,
          plant_count: plantCount,
          price_per_plant: pricePerPlant,
          total_amount: totalAmount,
          plantation_year: parseInt(newInvestmentPlantationYear),
          expected_harvest_year: parseInt(newInvestmentHarvestYear),
          status: 'active'
        });

      if (error) throw error;

      // Actualizar balance del usuario
      const currentProfile = profiles.find(p => p.user_id === selectedUserForNewInvestment);
      if (currentProfile) {
        const newBalance = (currentProfile.account_balance || 0) + totalAmount;
        await supabase
          .from('profiles')
          .update({ account_balance: newBalance })
          .eq('user_id', selectedUserForNewInvestment);
      }

      toast({
        title: "Inversión creada",
        description: `Nueva inversión de $${totalAmount.toLocaleString()} MXN creada exitosamente`
      });

      // Reset form
      setSelectedUserForNewInvestment("");
      setNewInvestmentSpecies("");
      setNewInvestmentPlantCount("0");
      setNewInvestmentPricePerPlant("0");
      setNewInvestmentPlantationYear(new Date().getFullYear().toString());
      setNewInvestmentHarvestYear((new Date().getFullYear() + 25).toString());
      
      fetchProfiles();
      fetchAllInvestments();
    } catch (error) {
      console.error('Error creating investment:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la inversión",
        variant: "destructive"
      });
    }
  };

  const addPlantPrice = async () => {
    if (!priceYear || !priceSpecies || !pricePerPlant) {
      toast({
        title: "Error",
        description: "Todos los campos son requeridos",
        variant: "destructive"
      });
      return;
    }

    try {
      // Aquí implementarías la lógica para guardar precios por año/especie
      // Por ahora solo mostramos un mensaje de éxito
      toast({
        title: "Precio actualizado",
        description: `Precio de ${pricePerPlant} MXN para ${priceYear} guardado exitosamente`
      });

      // Reset form
      setPriceYear(new Date().getFullYear().toString());
      setPriceSpecies("");
      setPricePerPlant("");
    } catch (error) {
      console.error('Error updating price:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el precio",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Cargando panel de administración...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Panel de Administración</h1>
          <p className="text-muted-foreground">Gestión completa del sistema</p>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="investments" className="flex items-center gap-2">
            <Leaf className="h-4 w-4" />
            Inversiones
          </TabsTrigger>
          <TabsTrigger value="plots" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Parcelas
          </TabsTrigger>
          <TabsTrigger value="finances" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Finanzas
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificaciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{profiles.filter(p => p.role === 'investor').length}</p>
                    <p className="text-sm text-muted-foreground">Inversores</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Leaf className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{investments.reduce((sum, inv) => sum + inv.plant_count, 0)}</p>
                    <p className="text-sm text-muted-foreground">Plantas Totales</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">${investments.reduce((sum, inv) => sum + inv.total_amount, 0).toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Inversión Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">{plots.length}</p>
                    <p className="text-sm text-muted-foreground">Parcelas</p>
                  </div>
                </div>
              </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Crear Nueva Inversión</CardTitle>
              <CardDescription>
                Agregar inversiones adicionales a usuarios existentes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="existingUser">Seleccionar Usuario</Label>
                  <Select value={selectedUserForNewInvestment} onValueChange={setSelectedUserForNewInvestment}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.filter(p => p.role === 'investor').map((profile) => (
                        <SelectItem key={profile.id} value={profile.user_id}>
                          {profile.name || profile.email} - Balance: ${profile.account_balance?.toLocaleString() || '0'} MXN
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="newInvestmentSpecies">Especie de Planta</Label>
                  <Select value={newInvestmentSpecies} onValueChange={setNewInvestmentSpecies}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar especie" />
                    </SelectTrigger>
                    <SelectContent>
                      {plantSpecies.map((species) => (
                        <SelectItem key={species.id} value={species.id}>
                          {species.name} ({species.scientific_name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 flex flex-col justify-center">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total de la inversión:</span>
                    <span className="text-lg font-bold text-green-600">
                      ${((parseFloat(newInvestmentPlantCount) || 0) * (parseFloat(newInvestmentPricePerPlant) || 0)).toLocaleString()} MXN
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <Label>Cantidad de Plantas</Label>
                  <Input 
                    type="number" 
                    placeholder="Ej: 100" 
                    value={newInvestmentPlantCount}
                    onChange={(e) => setNewInvestmentPlantCount(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label>Precio por Planta (MXN)</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder="Ej: 850.00" 
                    value={newInvestmentPricePerPlant}
                    onChange={(e) => setNewInvestmentPricePerPlant(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label>Año Plantación</Label>
                  <Input 
                    type="number" 
                    value={newInvestmentPlantationYear}
                    onChange={(e) => setNewInvestmentPlantationYear(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label>Año Cosecha Esperada</Label>
                  <Input 
                    type="number" 
                    value={newInvestmentHarvestYear}
                    onChange={(e) => setNewInvestmentHarvestYear(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              <Button onClick={createNewInvestment} className="w-full" size="lg">
                <Plus className="h-4 w-4 mr-2" />
                Crear Nueva Inversión
              </Button>
            </CardContent>
          </Card>
        </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Inversiones por Año</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(
                    investments.reduce((acc, inv) => {
                      const year = inv.plantation_year;
                      acc[year] = (acc[year] || 0) + inv.plant_count;
                      return acc;
                    }, {} as Record<number, number>)
                  ).map(([year, count]) => (
                    <div key={year} className="flex justify-between">
                      <span>{year}</span>
                      <span className="font-medium">{count} plantas</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Especies Plantadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(
                    investments.reduce((acc, inv) => {
                      const species = inv.plant_species?.name || 'Sin especie';
                      acc[species] = (acc[species] || 0) + inv.plant_count;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([species, count]) => (
                    <div key={species} className="flex justify-between">
                      <span>{species}</span>
                      <span className="font-medium">{count} plantas</span>
                    </div>
                  ))}
                 </div>
               </CardContent>
             </Card>

             <Card>
               <CardHeader>
                 <CardTitle>Distribución de Plantas por Especie y Año</CardTitle>
                 <CardDescription>
                   Análisis detallado de la colocación de plantas invertidas
                 </CardDescription>
               </CardHeader>
               <CardContent>
                 {/* Datos para gráficos calculados inline */}
                 {(() => {
                   const speciesData = investments.reduce((acc: any[], inv) => {
                     const existing = acc.find(item => item.name === inv.plant_species?.name);
                     if (existing) {
                       existing.value += inv.plant_count;
                     } else {
                       acc.push({
                         name: inv.plant_species?.name || 'Desconocida',
                         value: inv.plant_count
                       });
                     }
                     return acc;
                   }, []);

                   const yearData = investments.reduce((acc: any[], inv) => {
                     const existing = acc.find(item => item.name === inv.plantation_year.toString());
                     if (existing) {
                       existing.value += inv.plant_count;
                     } else {
                       acc.push({
                         name: inv.plantation_year.toString(),
                         value: inv.plant_count
                       });
                     }
                     return acc;
                   }, []);

                   const COLORS = ['#059669', '#0d9488', '#0891b2', '#3b82f6', '#6366f1'];

                   return (
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                       <div className="space-y-4">
                         <h3 className="text-lg font-semibold text-center">Por Especies</h3>
                         <div className="space-y-2">
                           {speciesData.map((item, index) => (
                             <div key={item.name} className="flex justify-between items-center">
                               <div className="flex items-center gap-2">
                                 <div 
                                   className="w-3 h-3 rounded-full" 
                                   style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                 />
                                 <span>{item.name}</span>
                               </div>
                               <span className="font-medium">{item.value} plantas</span>
                             </div>
                           ))}
                         </div>
                       </div>
                       <div className="space-y-4">
                         <h3 className="text-lg font-semibold text-center">Por Años</h3>
                         <div className="space-y-2">
                           {yearData.map((item, index) => (
                             <div key={item.name} className="flex justify-between items-center">
                               <div className="flex items-center gap-2">
                                 <div 
                                   className="w-3 h-3 rounded-full" 
                                   style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                 />
                                 <span>Año {item.name}</span>
                               </div>
                               <span className="font-medium">{item.value} plantas</span>
                             </div>
                           ))}
                         </div>
                       </div>
                     </div>
                   );
                 })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Crear Nuevo Usuario</CardTitle>
              <CardDescription>
                Registrar manualmente nuevos usuarios en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="userEmail">Email</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="usuario@ejemplo.com"
                  />
                </div>
                <div>
                  <Label htmlFor="userName">Nombre</Label>
                  <Input
                    id="userName"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Nombre completo"
                  />
                </div>
                <div>
                  <Label htmlFor="userSpecies">Especie de Planta</Label>
                  <Select value={newUserSpecies} onValueChange={setNewUserSpecies}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar especie" />
                    </SelectTrigger>
                    <SelectContent>
                      {plantSpecies.map((species) => (
                        <SelectItem key={species.id} value={species.id}>
                          {species.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="userPlantCount">Cantidad de Plantas</Label>
                  <Input
                    id="userPlantCount"
                    type="number"
                    value={newUserPlantCount}
                    onChange={(e) => setNewUserPlantCount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="userPricePerPlant">Precio por Planta (MXN)</Label>
                  <Input
                    id="userPricePerPlant"
                    type="number"
                    step="0.01"
                    value={newUserPricePerPlant}
                    onChange={(e) => setNewUserPricePerPlant(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="userPlantationYear">Año Plantación</Label>
                  <Input
                    id="userPlantationYear"
                    type="number"
                    value={newUserPlantationYear}
                    onChange={(e) => setNewUserPlantationYear(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="userHarvestYear">Año Cosecha</Label>
                  <Input
                    id="userHarvestYear"
                    type="number"
                    value={newUserHarvestYear}
                    onChange={(e) => setNewUserHarvestYear(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Total de la inversión:</p>
                <p className="text-lg font-bold">
                  ${(parseInt(newUserPlantCount || "0") * parseFloat(newUserPricePerPlant || "0")).toLocaleString()} MXN
                </p>
              </div>

              <Button onClick={createUser} className="w-full">
                Crear Usuario con Inversión
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usuarios Registrados</CardTitle>
              <CardDescription>
                Lista de todos los usuarios en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium">{profile.name || profile.email}</p>
                        <p className="text-sm text-muted-foreground">{profile.email}</p>
                      </div>
                      <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'}>
                        {profile.role}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Input
                          type="number"
                          className="w-32 text-right"
                          defaultValue={profile.account_balance}
                          onBlur={(e) => {
                            const newBalance = parseFloat(e.target.value);
                            if (newBalance !== profile.account_balance) {
                              updateBalance(profile.user_id, newBalance);
                            }
                          }}
                        />
                        <p className="text-sm text-muted-foreground">Balance MXN</p>
                      </div>
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
              <CardTitle>Gestión de Inversiones</CardTitle>
              <CardDescription>
                Administra todas las inversiones de los usuarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              {investmentsLoading ? (
                <div className="text-center py-8">Cargando inversiones...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Especie</TableHead>
                      <TableHead>Cantidad Plantas</TableHead>
                      <TableHead>Precio/Planta</TableHead>
                      <TableHead>Año Plantación</TableHead>
                      <TableHead>Año Cosecha</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Fecha Inversión</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {investments.map((investment) => (
                      <TableRow key={investment.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{investment.profiles?.name || investment.profiles?.email}</p>
                            <p className="text-sm text-muted-foreground">{investment.profiles?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select 
                            defaultValue={investment.species_id}
                            onValueChange={(value) => updateInvestmentField(investment.id, 'species_id', value)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {plantSpecies.map((species) => (
                                <SelectItem key={species.id} value={species.id}>
                                  {species.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-20"
                            defaultValue={investment.plant_count}
                            onBlur={(e) => updateInvestmentField(investment.id, 'plant_count', parseInt(e.target.value))}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            className="w-24"
                            defaultValue={investment.price_per_plant}
                            onBlur={(e) => updateInvestmentField(investment.id, 'price_per_plant', parseFloat(e.target.value))}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-20"
                            defaultValue={investment.plantation_year}
                            onBlur={(e) => updateInvestmentField(investment.id, 'plantation_year', parseInt(e.target.value))}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-20"
                            defaultValue={investment.expected_harvest_year}
                            onBlur={(e) => updateInvestmentField(investment.id, 'expected_harvest_year', parseInt(e.target.value))}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          ${investment.total_amount.toLocaleString()} MXN
                        </TableCell>
                        <TableCell>
                          {new Date(investment.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteInvestment(investment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plots" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Parcelas</CardTitle>
              <CardDescription>
                Administra parcelas, fotos aéreas y geo-referenciación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-medium mb-4">Subir Fotos de Dron</h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Seleccionar Parcela</Label>
                      <Select value={selectedPlotForPhoto} onValueChange={setSelectedPlotForPhoto}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar parcela" />
                        </SelectTrigger>
                        <SelectContent>
                          {plots.map((plot) => (
                            <SelectItem key={plot.id} value={plot.id}>
                              {plot.name} - {plot.location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-4">
                        Arrastra fotos aéreas o haz click para seleccionar
                      </p>
                      <Button variant="outline" disabled={!selectedPlotForPhoto}>
                        Seleccionar Archivos
                      </Button>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-4">Geo-referenciación</h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Parcela a Geo-referenciar</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar parcela" />
                        </SelectTrigger>
                        <SelectContent>
                          {plots.map((plot) => (
                            <SelectItem key={plot.id} value={plot.id}>
                              {plot.name} - {plot.location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="outline" className="w-full">
                      <MapPin className="h-4 w-4 mr-2" />
                      Abrir Editor de Mapas
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Utiliza herramientas gratuitas como Google Maps o OpenStreetMap para dibujar las parcelas.
                    </p>
                  </div>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Gestión de Parcelas</CardTitle>
                  <CardDescription>Editar datos de las parcelas existentes</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Ubicación</TableHead>
                        <TableHead>Especie Principal</TableHead>
                        <TableHead>Área (ha)</TableHead>
                        <TableHead>Plantas Totales</TableHead>
                        <TableHead>Plantas Disponibles</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plots.map((plot) => (
                        <TableRow key={plot.id}>
                          <TableCell>
                            <Input
                              defaultValue={plot.name}
                              className="w-32"
                              onBlur={(e) => {
                                // Aquí implementarías la actualización
                                console.log('Update plot name:', e.target.value);
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              defaultValue={plot.location}
                              className="w-40"
                              placeholder="Ciudad, Estado"
                            />
                          </TableCell>
                          <TableCell>
                            <Select>
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Seleccionar especie" />
                              </SelectTrigger>
                              <SelectContent>
                                {plantSpecies.map((species) => (
                                  <SelectItem key={species.id} value={species.id}>
                                    {species.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              defaultValue={plot.area}
                              className="w-20"
                              step="0.1"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              defaultValue={plot.total_plants}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              defaultValue={plot.available_plants}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Select defaultValue={plot.status}>
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Activa">Activa</SelectItem>
                                <SelectItem value="Inactiva">Inactiva</SelectItem>
                                <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finances" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Precios de Plantas</CardTitle>
                <CardDescription>
                  Actualizar precios por especie y año para simulación y nuevas inversiones
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label>Año</Label>
                    <Input 
                      type="number" 
                      placeholder="2024" 
                      value={priceYear}
                      onChange={(e) => setPriceYear(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label>Especie</Label>
                    <Select value={priceSpecies} onValueChange={setPriceSpecies}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar especie" />
                      </SelectTrigger>
                      <SelectContent>
                        {plantSpecies.map((species) => (
                          <SelectItem key={species.id} value={species.id}>
                            {species.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Precio por Planta (MXN)</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="850.00" 
                      value={pricePerPlant}
                      onChange={(e) => setPricePerPlant(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addPlantPrice} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Precio
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg">
                  <div className="p-4 border-b bg-muted/20">
                    <h4 className="font-medium">Historial de Precios por Especie</h4>
                  </div>
                  <div className="p-4">
                    <div className="grid gap-4">
                      {plantSpecies.map((species) => (
                        <div key={species.id} className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1 min-w-0 mb-2 lg:mb-0">
                            <p className="font-medium truncate">{species.name}</p>
                            <p className="text-sm text-muted-foreground truncate">{species.scientific_name}</p>
                          </div>
                          <div className="flex flex-col lg:flex-row gap-2 lg:gap-4">
                            <div className="text-right">
                              <p className="font-medium">$850.00 MXN</p>
                              <p className="text-xs text-muted-foreground">2024</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-muted-foreground">$800.00 MXN</p>
                              <p className="text-xs text-muted-foreground">2023</p>
                            </div>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Subir Reportes Anuales</CardTitle>
                <CardDescription>
                  Cargar documentos de reportes financieros y de crecimiento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Año del Reporte</Label>
                    <Input type="number" placeholder="2024" className="w-full" />
                  </div>
                  <div>
                    <Label>Tipo de Reporte</Label>
                    <Select>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="financiero">Reporte Financiero</SelectItem>
                        <SelectItem value="crecimiento">Reporte de Crecimiento</SelectItem>
                        <SelectItem value="carbono">Captura de Carbono</SelectItem>
                        <SelectItem value="cosecha">Reporte de Cosecha</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Arrastra archivos PDF o haz click para seleccionar
                  </p>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Seleccionar Archivos
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Enviar Notificación</CardTitle>
              <CardDescription>
                Enviar notificaciones a todos los usuarios del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="notificationTitle">Título</Label>
                <Input
                  id="notificationTitle"
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  placeholder="Título de la notificación"
                />
              </div>
              <div>
                <Label htmlFor="notificationMessage">Mensaje</Label>
                <Input
                  id="notificationMessage"
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  placeholder="Contenido del mensaje"
                />
              </div>
              <Button onClick={sendNotification} className="w-full">
                Enviar a Todos los Usuarios
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;