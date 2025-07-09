
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Leaf, 
  TrendingUp, 
  Calendar, 
  MapPin,
  ExternalLink,
  Bell,
  FileText,
  Calculator,
  Users,
  TreePine,
  DollarSign
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
      let query = supabase.from('investments').select('*');
      
      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
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

  // Cálculos para usuarios
  const userInvestments = investments?.filter(inv => inv.user_id === user?.id) || [];
  const totalPlants = userInvestments.reduce((sum, inv) => sum + inv.plant_count, 0);
  const totalInvested = userInvestments.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalCarbonCapture = userInvestments.reduce((sum, inv) => {
    const species = plantSpecies?.find(s => s.id === inv.species_id);
    return sum + (species?.carbon_capture_per_plant || 0) * inv.plant_count;
  }, 0);

  // Próxima cosecha
  const nextHarvest = userInvestments.reduce((earliest, inv) => {
    return !earliest || inv.expected_harvest_year < earliest ? inv.expected_harvest_year : earliest;
  }, null as number | null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

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

      {/* User Investment Summary - Solo para usuarios */}
      {!isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TreePine className="h-4 w-4 text-green-600" />
                Mis Plantas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {totalPlants.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                plantas establecidas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                Inversión Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalInvested)}
              </div>
              <p className="text-xs text-muted-foreground">
                invertido hasta ahora
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Leaf className="h-4 w-4 text-emerald-600" />
                CO2 Capturado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {totalCarbonCapture.toFixed(1)} kg
              </div>
              <p className="text-xs text-muted-foreground">
                durante toda la vida
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-orange-600" />
                Próxima Cosecha
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {nextHarvest || 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                año estimado
              </p>
            </CardContent>
          </Card>
        </div>
      )}

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
                  {userProfiles?.length || 0}
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
      {!isAdmin && userInvestments && userInvestments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mis Inversiones Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userInvestments.slice(0, 3).map((investment) => {
                const species = plantSpecies?.find(s => s.id === investment.species_id);
                const currentYear = new Date().getFullYear();
                const maturationProgress = species ? 
                  Math.min(100, ((currentYear - investment.plantation_year) / species.maturation_years) * 100) : 0;

                return (
                  <div key={investment.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {species?.name || 'Especie desconocida'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {investment.plant_count.toLocaleString()} plantas • Plantado en {investment.plantation_year}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(investment.total_amount)}
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
                    
                    {/* Barra de progreso hacia la madurez */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progreso hacia cosecha</span>
                        <span>{maturationProgress.toFixed(0)}%</span>
                      </div>
                      <Progress value={maturationProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Cosecha estimada: {investment.expected_harvest_year}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
