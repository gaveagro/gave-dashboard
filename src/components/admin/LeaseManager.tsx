import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, Edit, Trash2, DollarSign, AlertTriangle, CheckCircle, Clock, 
  MapPin, Calendar, Filter
} from 'lucide-react';

type Lease = {
  id: string;
  plantation_year: number | null;
  area_hectares: number | null;
  cost_per_hectare_year: number | null;
  annual_rent: number | null;
  owner_name: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  payment_frequency: string | null;
  outstanding_balance: number | null;
  notes: string | null;
  species_name: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
};

const MATURATION_YEARS = 5.5;

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
};

const getHarvestDate = (plantationYear: number | null) => {
  if (!plantationYear) return null;
  const monthsToAdd = Math.floor(MATURATION_YEARS * 12); // 66 months
  const harvestDate = new Date(plantationYear, 3 + monthsToAdd, 1); // April + 66 months
  return harvestDate;
};

const getMonthsToHarvest = (plantationYear: number | null) => {
  if (!plantationYear) return Infinity;
  const harvestDate = getHarvestDate(plantationYear);
  if (!harvestDate) return Infinity;
  const now = new Date();
  const months = (harvestDate.getFullYear() - now.getFullYear()) * 12 + (harvestDate.getMonth() - now.getMonth());
  return months;
};

const getLeaseStatus = (lease: Lease) => {
  const now = new Date();
  const endDate = lease.end_date ? new Date(lease.end_date) : null;
  const balance = lease.outstanding_balance || 0;

  if (endDate && endDate < now && balance > 0) return 'overdue';
  if (endDate) {
    const monthsToExpiry = (endDate.getFullYear() - now.getFullYear()) * 12 + (endDate.getMonth() - now.getMonth());
    if (monthsToExpiry <= 3 && monthsToExpiry >= 0 && balance > 0) return 'expiring_soon';
  }
  if (balance <= 0) return 'paid_up';
  return 'active';
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'overdue':
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Vencida</Badge>;
    case 'expiring_soon':
      return <Badge className="gap-1 bg-amber-500 hover:bg-amber-600"><Clock className="h-3 w-3" /> Próxima</Badge>;
    case 'paid_up':
      return <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-700"><CheckCircle className="h-3 w-3" /> Al corriente</Badge>;
    default:
      return <Badge variant="secondary" className="gap-1">Activa</Badge>;
  }
};

const emptyForm = {
  plantation_year: new Date().getFullYear(),
  area_hectares: 0,
  cost_per_hectare_year: 0,
  annual_rent: 0,
  owner_name: '',
  location: '',
  start_date: '',
  end_date: '',
  payment_frequency: 'Anual',
  outstanding_balance: 0,
  notes: '',
  species_name: '',
  status: 'active',
};

export const LeaseManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [editingLease, setEditingLease] = useState<Lease | null>(null);
  const [payingLease, setPayingLease] = useState<Lease | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [paymentForm, setPaymentForm] = useState({ amount: 0, payment_date: '', period_covered: '', notes: '' });
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: leases, isLoading } = useQuery({
    queryKey: ['land-leases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('land_leases')
        .select('*')
        .order('plantation_year', { ascending: true });
      if (error) throw error;
      return data as Lease[];
    }
  });

  const locations = [...new Set(leases?.map(l => l.location).filter(Boolean) || [])];
  const years = [...new Set(leases?.map(l => l.plantation_year).filter(Boolean) || [])].sort();

  // Filter and sort leases
  const filteredLeases = (leases || [])
    .filter(l => filterLocation === 'all' || l.location === filterLocation)
    .filter(l => filterYear === 'all' || String(l.plantation_year) === filterYear)
    .filter(l => {
      if (filterStatus === 'all') return true;
      return getLeaseStatus(l) === filterStatus;
    })
    .sort((a, b) => {
      // Sort by proximity to harvest (closest first = highest priority)
      return getMonthsToHarvest(a.plantation_year) - getMonthsToHarvest(b.plantation_year);
    });

  // Summary stats
  const activeLeases = leases?.filter(l => l.status === 'active') || [];
  const totalBalance = activeLeases.reduce((sum, l) => sum + (l.outstanding_balance || 0), 0);
  const overdueCount = activeLeases.filter(l => getLeaseStatus(l) === 'overdue').length;
  const expiringSoonCount = activeLeases.filter(l => getLeaseStatus(l) === 'expiring_soon').length;
  const totalArea = activeLeases.reduce((sum, l) => sum + (l.area_hectares || 0), 0);

  const handleSave = async () => {
    try {
      const data = {
        ...form,
        annual_rent: form.area_hectares * form.cost_per_hectare_year || form.annual_rent,
      };

      if (editingLease) {
        const { error } = await supabase.from('land_leases').update(data).eq('id', editingLease.id);
        if (error) throw error;
        toast({ title: 'Renta actualizada' });
      } else {
        const { error } = await supabase.from('land_leases').insert([data]);
        if (error) throw error;
        toast({ title: 'Renta creada' });
      }
      queryClient.invalidateQueries({ queryKey: ['land-leases'] });
      setShowDialog(false);
      setEditingLease(null);
      setForm(emptyForm);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta renta?')) return;
    try {
      const { error } = await supabase.from('land_leases').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Renta eliminada' });
      queryClient.invalidateQueries({ queryKey: ['land-leases'] });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handlePayment = async () => {
    if (!payingLease) return;
    try {
      const { error: payError } = await supabase.from('lease_payments').insert([{
        lease_id: payingLease.id,
        amount: paymentForm.amount,
        payment_date: paymentForm.payment_date || new Date().toISOString().split('T')[0],
        period_covered: paymentForm.period_covered,
        notes: paymentForm.notes,
      }]);
      if (payError) throw payError;

      const newBalance = Math.max(0, (payingLease.outstanding_balance || 0) - paymentForm.amount);
      const { error: updateError } = await supabase
        .from('land_leases')
        .update({ outstanding_balance: newBalance })
        .eq('id', payingLease.id);
      if (updateError) throw updateError;

      toast({ title: 'Pago registrado', description: `Nuevo saldo: ${formatCurrency(newBalance)}` });
      queryClient.invalidateQueries({ queryKey: ['land-leases'] });
      setShowPaymentDialog(false);
      setPayingLease(null);
      setPaymentForm({ amount: 0, payment_date: '', period_covered: '', notes: '' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const openEdit = (lease: Lease) => {
    setEditingLease(lease);
    setForm({
      plantation_year: lease.plantation_year || new Date().getFullYear(),
      area_hectares: lease.area_hectares || 0,
      cost_per_hectare_year: lease.cost_per_hectare_year || 0,
      annual_rent: lease.annual_rent || 0,
      owner_name: lease.owner_name,
      location: lease.location || '',
      start_date: lease.start_date || '',
      end_date: lease.end_date || '',
      payment_frequency: lease.payment_frequency || 'Anual',
      outstanding_balance: lease.outstanding_balance || 0,
      notes: lease.notes || '',
      species_name: lease.species_name || '',
      status: lease.status || 'active',
    });
    setShowDialog(true);
  };

  const openPayment = (lease: Lease) => {
    setPayingLease(lease);
    setPaymentForm({ amount: lease.annual_rent || 0, payment_date: new Date().toISOString().split('T')[0], period_covered: '', notes: '' });
    setShowPaymentDialog(true);
  };

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Cargando rentas...</div>;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rentas Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeLeases.length}</div>
            <p className="text-xs text-muted-foreground">{totalArea.toFixed(0)} ha totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Pendiente Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totalBalance)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rentas Vencidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueCount}</div>
            <p className="text-xs text-destructive">{overdueCount > 0 ? 'Requieren atención' : 'Sin vencimientos'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Próximas a Vencer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{expiringSoonCount}</div>
            <p className="text-xs text-muted-foreground">Próximos 3 meses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Renta Anual Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(activeLeases.reduce((s, l) => s + (l.annual_rent || 0), 0))}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterLocation} onValueChange={setFilterLocation}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Ubicación" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las ubicaciones</SelectItem>
              {locations.map(loc => <SelectItem key={loc} value={loc!}>{loc}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Año" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los años</SelectItem>
              {years.map(y => <SelectItem key={y!} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="overdue">Vencidas</SelectItem>
              <SelectItem value="expiring_soon">Próximas</SelectItem>
              <SelectItem value="paid_up">Al corriente</SelectItem>
              <SelectItem value="active">Activas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { setEditingLease(null); setForm(emptyForm); setShowDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nueva Renta
        </Button>
      </div>

      {/* Leases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Calendario de Rentas</CardTitle>
          <p className="text-sm text-muted-foreground">Ordenadas por prioridad de cosecha (más próximas primero)</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Propietario</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead className="text-center">Año Plant.</TableHead>
                  <TableHead className="text-center">Cosecha Est.</TableHead>
                  <TableHead className="text-right">Ha</TableHead>
                  <TableHead className="text-right">Renta Anual</TableHead>
                  <TableHead>Frecuencia</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeases.map(lease => {
                  const status = getLeaseStatus(lease);
                  const harvest = getHarvestDate(lease.plantation_year);
                  const harvestStr = harvest 
                    ? `${harvest.toLocaleString('es-MX', { month: 'short' })} ${harvest.getFullYear()}`
                    : '-';
                  const monthsToH = getMonthsToHarvest(lease.plantation_year);

                  return (
                    <TableRow 
                      key={lease.id} 
                      className={
                        status === 'overdue' ? 'bg-destructive/5' : 
                        status === 'expiring_soon' ? 'bg-amber-500/5' : 
                        status === 'paid_up' ? 'bg-emerald-500/5' : ''
                      }
                    >
                      <TableCell className="font-medium">{lease.owner_name}</TableCell>
                      <TableCell className="flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" />{lease.location}</TableCell>
                      <TableCell className="text-center">{lease.plantation_year}</TableCell>
                      <TableCell className="text-center">
                        <span className={monthsToH <= 12 ? 'font-semibold text-amber-600' : ''}>
                          {harvestStr}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{lease.area_hectares}</TableCell>
                      <TableCell className="text-right">{formatCurrency(lease.annual_rent || 0)}</TableCell>
                      <TableCell>{lease.payment_frequency}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {lease.end_date ? new Date(lease.end_date).toLocaleDateString('es-MX') : '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {(lease.outstanding_balance || 0) > 0 
                          ? <span className="text-destructive">{formatCurrency(lease.outstanding_balance || 0)}</span>
                          : <span className="text-emerald-600">$0</span>
                        }
                      </TableCell>
                      <TableCell>{getStatusBadge(status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openPayment(lease)} title="Registrar pago">
                            <DollarSign className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(lease)} title="Editar">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(lease.id)} title="Eliminar">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLease ? 'Editar Renta' : 'Nueva Renta'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Propietario *</Label>
              <Input value={form.owner_name} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Ubicación</Label>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Año Plantación</Label>
              <Input type="number" value={form.plantation_year} onChange={e => setForm(f => ({ ...f, plantation_year: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-2">
              <Label>Superficie (ha)</Label>
              <Input type="number" step="0.01" value={form.area_hectares} onChange={e => setForm(f => ({ ...f, area_hectares: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-2">
              <Label>Costo por ha/año</Label>
              <Input type="number" step="0.01" value={form.cost_per_hectare_year} onChange={e => setForm(f => ({ ...f, cost_per_hectare_year: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-2">
              <Label>Renta Anual</Label>
              <Input type="number" step="0.01" value={form.annual_rent} onChange={e => setForm(f => ({ ...f, annual_rent: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-2">
              <Label>Fecha Inicio</Label>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Fecha Terminación</Label>
              <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Frecuencia de Pago</Label>
              <Select value={form.payment_frequency} onValueChange={v => setForm(f => ({ ...f, payment_frequency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Anual">Anual</SelectItem>
                  <SelectItem value="Cada 6 meses">Cada 6 meses</SelectItem>
                  <SelectItem value="Mensual">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Saldo Pendiente</Label>
              <Input type="number" step="0.01" value={form.outstanding_balance} onChange={e => setForm(f => ({ ...f, outstanding_balance: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-2">
              <Label>Especie</Label>
              <Input value={form.species_name} onChange={e => setForm(f => ({ ...f, species_name: e.target.value }))} placeholder="Ej: Espadín" />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activa</SelectItem>
                  <SelectItem value="expired">Expirada</SelectItem>
                  <SelectItem value="paid_up">Pagada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            <div className="col-span-2 pt-2">
              <Button onClick={handleSave} className="w-full">
                {editingLease ? 'Actualizar Renta' : 'Crear Renta'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            {payingLease && (
              <p className="text-sm text-muted-foreground">
                {payingLease.owner_name} — {payingLease.location} — Saldo: {formatCurrency(payingLease.outstanding_balance || 0)}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Monto del Pago</Label>
              <Input type="number" step="0.01" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-2">
              <Label>Fecha de Pago</Label>
              <Input type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm(f => ({ ...f, payment_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Periodo que Cubre</Label>
              <Input placeholder="Ej: Oct 2024 - Oct 2025" value={paymentForm.period_covered} onChange={e => setPaymentForm(f => ({ ...f, period_covered: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            <Button onClick={handlePayment} className="w-full">Registrar Pago</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
