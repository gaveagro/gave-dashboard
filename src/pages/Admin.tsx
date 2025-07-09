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
import { Edit, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

const Admin = () => {
  const [activeTab, setActiveTab] = useState('investments');
  const [userProfiles, setUserProfiles] = useState<{ [key: string]: any }>({});
  const [plantSpecies, setPlantSpecies] = useState<any[]>([]);
  const [selectedInvestment, setSelectedInvestment] = useState<any>(null);
  const [showInvestmentDialog, setShowInvestmentDialog] = useState(false);
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

      // Invalidate and refetch investments
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

      // Invalidate and refetch investment requests
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold">Panel de Administración</h1>
      <p className="text-muted-foreground">
        Gestiona usuarios, inversiones y más
      </p>

      <div className="flex gap-4">
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
      </div>

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
                      <TableHead>Año Plantación</TableHead>
                      <TableHead>Inversión</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
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
                          <div className="flex gap-2">
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

        {/* Nueva pestaña para solicitudes de inversión */}
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

      {/* Investment Dialog */}
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
