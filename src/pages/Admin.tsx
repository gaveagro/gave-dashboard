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
import { Users, DollarSign, Settings, Bell } from "lucide-react";
import { Navigate } from "react-router-dom";

interface Profile {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'investor';
  account_balance: number;
  created_at: string;
}

const Admin = () => {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserBalance, setNewUserBalance] = useState("0");
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");

  // Redirect if not admin
  if (profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    fetchProfiles();
  }, []);

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

      // Actualizar el balance si se especificó
      if (data.user && newUserBalance !== "0") {
        await supabase
          .from('profiles')
          .update({ account_balance: parseFloat(newUserBalance) })
          .eq('user_id', data.user.id);
      }

      toast({
        title: "Usuario creado",
        description: `Usuario ${newUserEmail} creado exitosamente`
      });

      setNewUserEmail("");
      setNewUserName("");
      setNewUserBalance("0");
      fetchProfiles();
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

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuarios
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
                  <Label htmlFor="userBalance">Balance Inicial (MXN)</Label>
                  <Input
                    id="userBalance"
                    type="number"
                    value={newUserBalance}
                    onChange={(e) => setNewUserBalance(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              <Button onClick={createUser} className="w-full">
                Crear Usuario
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
                        <p className="font-medium">${profile.account_balance.toLocaleString()} MXN</p>
                        <p className="text-sm text-muted-foreground">Balance</p>
                      </div>
                      {profile.role === 'investor' && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            className="w-32"
                            defaultValue={profile.account_balance}
                            onBlur={(e) => {
                              const newBalance = parseFloat(e.target.value);
                              if (newBalance !== profile.account_balance) {
                                updateBalance(profile.user_id, newBalance);
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finances">
          <Card>
            <CardHeader>
              <CardTitle>Gestión Financiera</CardTitle>
              <CardDescription>
                Próximamente: Gestión de precios de plantas, reportes anuales, etc.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Esta sección estará disponible en futuras actualizaciones.
              </p>
            </CardContent>
          </Card>
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