import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Leaf, 
  TrendingUp, 
  Calendar, 
  MapPin,
  ExternalLink,
  Bell,
  FileText,
  Calculator
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const { data: investments } = useQuery({
    queryKey: ['investments', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: plantSpecies } = useQuery({
    queryKey: ['plant-species'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plant_species')
        .select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const unreadNotifications = notifications?.filter(n => !n.read);

  const { data: userProfiles } = useQuery({
    queryKey: ['user-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const { data: investmentRequests } = useQuery({
    queryKey: ['investment-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investment_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  if (!user || !profile) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <p>Por favor, inicia sesión para acceder al dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            Bienvenido, {profile.name || profile.email}
          </h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Panel de Administración' : 'Panel de Inversiones'}
          </p>
        </div>
        <Badge variant={isAdmin ? 'default' : 'secondary'}>
          {isAdmin ? 'Administrador' : 'Inversionista'}
        </Badge>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calculator className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">Simulador</h3>
                <p className="text-sm text-muted-foreground">Calcula tu inversión</p>
              </div>
            </div>
            <Link to="/simulator">
              <Button className="w-full mt-3" size="sm">
                Simular Inversión
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-emerald-600" />
              <div>
                <h3 className="font-semibold">Mis Inversiones</h3>
                <p className="text-sm text-muted-foreground">Ver portafolio</p>
              </div>
            </div>
            <Link to="/investments">
              <Button className="w-full mt-3" size="sm" variant="outline">
                Ver Inversiones
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <h3 className="font-semibold">Documentos</h3>
                <p className="text-sm text-muted-foreground">Contratos y docs</p>
              </div>
            </div>
            <Link to="/documents">
              <Button className="w-full mt-3" size="sm" variant="outline">
                Ver Documentos
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-8 w-8 text-orange-600" />
              <div>
                <h3 className="font-semibold">Parcelas</h3>
                <p className="text-sm text-muted-foreground">Ubicaciones</p>
              </div>
            </div>
            <Link to="/plots">
              <Button className="w-full mt-3" size="sm" variant="outline">
                Ver Parcelas
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Balance Section - Solo para Admin */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Resumen Administrativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-emerald-50 rounded-lg">
                <p className="text-2xl font-bold text-emerald-600">
                  {investments?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Inversiones Activas</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {investmentRequests?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Solicitudes Pendientes</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">
                  {Object.keys(userProfiles || {}).length}
                </p>
                <p className="text-sm text-muted-foreground">Usuarios Registrados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications */}
      {unreadNotifications && unreadNotifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificaciones Recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {unreadNotifications.slice(0, 3).map((notification) => (
              <div key={notification.id} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">{notification.title}</h4>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(notification.created_at).toLocaleDateString('es-MX')}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Investments - Para usuarios */}
      {!isAdmin && investments && investments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mis Inversiones Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {investments.slice(0, 3).map((investment) => (
                <div key={investment.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {plantSpecies?.find(s => s.id === investment.species_id)?.name || 'Especie desconocida'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {investment.plant_count.toLocaleString()} plantas • {investment.plantation_year}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {new Intl.NumberFormat('es-MX', {
                        style: 'currency',
                        currency: 'MXN',
                        minimumFractionDigits: 0
                      }).format(investment.total_amount)}
                    </p>
                    <Badge variant={
                      investment.status === 'active' ? 'default' :
                      investment.status === 'pending' ? 'secondary' :
                      'outline'
                    }>
                      {investment.status === 'active' ? 'Activa' :
                       investment.status === 'pending' ? 'Pendiente' :
                       'Completada'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
