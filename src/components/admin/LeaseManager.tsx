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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, Edit, Trash2, DollarSign, AlertTriangle, CheckCircle, Clock, 
  MapPin, Calendar, Filter, MessageSquare, Send, ArrowUpDown, ArrowUp, ArrowDown
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
  estimated_harvest_month: number | null;
  estimated_harvest_year: number | null;
  created_at: string;
  updated_at: string;
};

type LeaseComment = {
  id: string;
  lease_id: string;
  comment: string;
  created_at: string;
};

const MATURATION_YEARS = 5.5;

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONTH_NAMES_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
};

const getHarvestDate = (lease: Lease) => {
  // Use manual override if set
  if (lease.estimated_harvest_year) {
    const month = (lease.estimated_harvest_month || 4) - 1; // default April
    return new Date(lease.estimated_harvest_year, month, 1);
  }
  // Fallback to automatic calculation
  if (!lease.plantation_year) return null;
  const monthsToAdd = Math.floor(MATURATION_YEARS * 12);
  return new Date(lease.plantation_year, 3 + monthsToAdd, 1);
};

const getMonthsToHarvest = (lease: Lease) => {
  const harvestDate = getHarvestDate(lease);
  if (!harvestDate) return Infinity;
  const now = new Date();
  return (harvestDate.getFullYear() - now.getFullYear()) * 12 + (harvestDate.getMonth() - now.getMonth());
};

const getNextRentDueDate = (lease: Lease): Date | null => {
  if (!lease.start_date) return null;
  const now = new Date();
  const endDate = lease.end_date ? new Date(lease.end_date) : null;
  
  // If contract expired, no next due date
  if (endDate && endDate < now) return null;
  
  const start = new Date(lease.start_date);
  const freq = lease.payment_frequency || 'Anual';
  let monthsIncrement = 12;
  if (freq === 'Cada 6 meses') monthsIncrement = 6;
  if (freq === 'Mensual') monthsIncrement = 1;
  
  let current = new Date(start);
  // Find the next due date that is >= today
  while (current < now) {
    current = new Date(current.getFullYear(), current.getMonth() + monthsIncrement, current.getDate());
  }
  
  // Don't exceed end date
  if (endDate && current > endDate) return null;
  
  return current;
};

const generatePeriodOptions = (lease: Lease): string[] => {
  if (!lease.start_date) return [];
  const start = new Date(lease.start_date);
  const endDate = lease.end_date ? new Date(lease.end_date) : null;
  const freq = lease.payment_frequency || 'Anual';
  let monthsIncrement = 12;
  if (freq === 'Cada 6 meses') monthsIncrement = 6;
  if (freq === 'Mensual') monthsIncrement = 1;
  
  const periods: string[] = [];
  let current = new Date(start);
  const limit = endDate || new Date(start.getFullYear() + 10, start.getMonth(), start.getDate());
  
  while (current < limit && periods.length < 30) {
    const next = new Date(current.getFullYear(), current.getMonth() + monthsIncrement, current.getDate());
    const fromStr = `${MONTH_NAMES[current.getMonth()]} ${current.getFullYear()}`;
    const toStr = `${MONTH_NAMES[next.getMonth()]} ${next.getFullYear()}`;
    periods.push(`${fromStr} - ${toStr}`);
    current = next;
  }
  return periods;
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

const getNextRentBadge = (lease: Lease) => {
  const nextDue = getNextRentDueDate(lease);
  if (!nextDue) return <span className="text-muted-foreground text-xs">-</span>;
  
  const now = new Date();
  const diffMs = nextDue.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const label = `${MONTH_NAMES[nextDue.getMonth()]} ${nextDue.getFullYear()}`;
  
  if (diffDays < 0) {
    return <span className="text-destructive font-semibold text-xs">{label} (vencida)</span>;
  }
  if (diffDays <= 30) {
    return <span className="text-amber-600 font-semibold text-xs">{label}</span>;
  }
  return <span className="text-xs">{label}</span>;
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
  estimated_harvest_month: '' as string | number,
  estimated_harvest_year: '' as string | number,
};

export const LeaseManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showCommentsDialog, setShowCommentsDialog] = useState(false);
  const [editingLease, setEditingLease] = useState<Lease | null>(null);
  const [payingLease, setPayingLease] = useState<Lease | null>(null);
  const [commentingLease, setCommentingLease] = useState<Lease | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [paymentForm, setPaymentForm] = useState({ amount: 0, payment_date: '', period_covered: '', notes: '' });
  const [newComment, setNewComment] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1" /> 
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const statusPriority: Record<string, number> = { overdue: 0, expiring_soon: 1, active: 2, paid_up: 3 };

  const sortLeases = (list: Lease[]): Lease[] => {
    if (!sortColumn) return list.sort((a, b) => getMonthsToHarvest(a) - getMonthsToHarvest(b));
    const dir = sortDirection === 'asc' ? 1 : -1;
    return list.sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case 'owner': cmp = (a.owner_name || '').localeCompare(b.owner_name || ''); break;
        case 'location': cmp = (a.location || '').localeCompare(b.location || ''); break;
        case 'year': cmp = (a.plantation_year || 0) - (b.plantation_year || 0); break;
        case 'harvest': cmp = getMonthsToHarvest(a) - getMonthsToHarvest(b); break;
        case 'area': cmp = (a.area_hectares || 0) - (b.area_hectares || 0); break;
        case 'rent': cmp = (a.annual_rent || 0) - (b.annual_rent || 0); break;
        case 'frequency': cmp = (a.payment_frequency || '').localeCompare(b.payment_frequency || ''); break;
        case 'nextRent': {
          const da = getNextRentDueDate(a)?.getTime() || Infinity;
          const db = getNextRentDueDate(b)?.getTime() || Infinity;
          cmp = da - db; break;
        }
        case 'endDate': {
          const ea = a.end_date ? new Date(a.end_date).getTime() : Infinity;
          const eb = b.end_date ? new Date(b.end_date).getTime() : Infinity;
          cmp = ea - eb; break;
        }
        case 'balance': cmp = (a.outstanding_balance || 0) - (b.outstanding_balance || 0); break;
        case 'status': cmp = (statusPriority[getLeaseStatus(a)] ?? 9) - (statusPriority[getLeaseStatus(b)] ?? 9); break;
      }
      return cmp * dir;
    });
  };

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

  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ['lease-comments', commentingLease?.id],
    queryFn: async () => {
      if (!commentingLease) return [];
      const { data, error } = await supabase
        .from('lease_comments')
        .select('*')
        .eq('lease_id', commentingLease.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LeaseComment[];
    },
    enabled: !!commentingLease,
  });

  const locations = [...new Set(leases?.map(l => l.location).filter(Boolean) || [])];
  const years = [...new Set(leases?.map(l => l.plantation_year).filter(Boolean) || [])].sort();

  const filteredBase = (leases || [])
    .filter(l => filterLocation === 'all' || l.location === filterLocation)
    .filter(l => filterYear === 'all' || String(l.plantation_year) === filterYear)
    .filter(l => {
      if (filterStatus === 'all') return true;
      return getLeaseStatus(l) === filterStatus;
    });
  const sortedLeases = sortLeases([...filteredBase]);

  const activeLeases = leases?.filter(l => l.status === 'active') || [];
  const totalBalance = activeLeases.reduce((sum, l) => sum + (l.outstanding_balance || 0), 0);
  const overdueCount = activeLeases.filter(l => getLeaseStatus(l) === 'overdue').length;
  const expiringSoonCount = activeLeases.filter(l => getLeaseStatus(l) === 'expiring_soon').length;
  const totalArea = activeLeases.reduce((sum, l) => sum + (l.area_hectares || 0), 0);

  const handleSave = async () => {
    try {
      const data: any = {
        plantation_year: form.plantation_year,
        area_hectares: form.area_hectares,
        cost_per_hectare_year: form.cost_per_hectare_year,
        annual_rent: form.area_hectares * form.cost_per_hectare_year || form.annual_rent,
        owner_name: form.owner_name,
        location: form.location,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        payment_frequency: form.payment_frequency,
        outstanding_balance: form.outstanding_balance,
        notes: form.notes,
        species_name: form.species_name,
        status: form.status,
        estimated_harvest_month: form.estimated_harvest_month ? Number(form.estimated_harvest_month) : null,
        estimated_harvest_year: form.estimated_harvest_year ? Number(form.estimated_harvest_year) : null,
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

  const handleAddComment = async () => {
    if (!commentingLease || !newComment.trim()) return;
    try {
      const { error } = await supabase.from('lease_comments').insert([{
        lease_id: commentingLease.id,
        comment: newComment.trim(),
      }]);
      if (error) throw error;
      setNewComment('');
      refetchComments();
      toast({ title: 'Comentario agregado' });
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
      estimated_harvest_month: lease.estimated_harvest_month || '',
      estimated_harvest_year: lease.estimated_harvest_year || '',
    });
    setShowDialog(true);
  };

  const openPayment = (lease: Lease) => {
    setPayingLease(lease);
    setPaymentForm({ amount: 0, payment_date: new Date().toISOString().split('T')[0], period_covered: '', notes: '' });
    setShowPaymentDialog(true);
  };

  const openComments = (lease: Lease) => {
    setCommentingLease(lease);
    setNewComment('');
    setShowCommentsDialog(true);
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
          <p className="text-sm text-muted-foreground">{sortColumn ? `Ordenadas por columna seleccionada` : 'Ordenadas por prioridad de cosecha (más próximas primero)'}</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('owner')}><span className="flex items-center">Propietario<SortIcon column="owner" /></span></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('location')}><span className="flex items-center">Ubicación<SortIcon column="location" /></span></TableHead>
                  <TableHead className="text-center cursor-pointer select-none" onClick={() => handleSort('year')}><span className="flex items-center justify-center">Año Plant.<SortIcon column="year" /></span></TableHead>
                  <TableHead className="text-center cursor-pointer select-none" onClick={() => handleSort('harvest')}><span className="flex items-center justify-center">Cosecha Est.<SortIcon column="harvest" /></span></TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('area')}><span className="flex items-center justify-end">Ha<SortIcon column="area" /></span></TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('rent')}><span className="flex items-center justify-end">Renta Anual<SortIcon column="rent" /></span></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('frequency')}><span className="flex items-center">Frecuencia<SortIcon column="frequency" /></span></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('nextRent')}><span className="flex items-center">Próx. Renta<SortIcon column="nextRent" /></span></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('endDate')}><span className="flex items-center">Vencimiento<SortIcon column="endDate" /></span></TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('balance')}><span className="flex items-center justify-end">Saldo<SortIcon column="balance" /></span></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('status')}><span className="flex items-center">Estado<SortIcon column="status" /></span></TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLeases.map(lease => {
                  const status = getLeaseStatus(lease);
                  const harvest = getHarvestDate(lease);
                  const isManualHarvest = !!lease.estimated_harvest_year;
                  const harvestStr = harvest 
                    ? `${MONTH_NAMES[harvest.getMonth()]} ${harvest.getFullYear()}`
                    : '-';
                  const monthsToH = getMonthsToHarvest(lease);

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
                      <TableCell><span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" />{lease.location}</span></TableCell>
                      <TableCell className="text-center">{lease.plantation_year}</TableCell>
                      <TableCell className="text-center">
                        <span className={monthsToH <= 12 ? 'font-semibold text-amber-600' : ''}>
                          {harvestStr}
                          {isManualHarvest && <span className="text-xs text-muted-foreground ml-1">✎</span>}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{lease.area_hectares}</TableCell>
                      <TableCell className="text-right">{formatCurrency(lease.annual_rent || 0)}</TableCell>
                      <TableCell>{lease.payment_frequency}</TableCell>
                      <TableCell>{getNextRentBadge(lease)}</TableCell>
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
                          <Button size="icon" variant="ghost" onClick={() => openComments(lease)} title="Comentarios">
                            <MessageSquare className="h-4 w-4" />
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

            {/* Harvest override fields */}
            <div className="space-y-2">
              <Label>Mes Cosecha Estimado</Label>
              <Select value={form.estimated_harvest_month ? String(form.estimated_harvest_month) : 'auto'} onValueChange={v => setForm(f => ({ ...f, estimated_harvest_month: v === 'auto' ? '' : Number(v) }))}>
                <SelectTrigger><SelectValue placeholder="Auto (Abr)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automático</SelectItem>
                  {MONTH_NAMES_FULL.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Año Cosecha Estimado</Label>
              <Input 
                type="number" 
                placeholder="Auto" 
                value={form.estimated_harvest_year} 
                onChange={e => setForm(f => ({ ...f, estimated_harvest_year: e.target.value ? parseInt(e.target.value) : '' }))} 
              />
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

      {/* Payment Dialog - Enhanced */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Abono / Pago</DialogTitle>
            {payingLease && (
              <p className="text-sm text-muted-foreground">
                {payingLease.owner_name} — {payingLease.location}
              </p>
            )}
          </DialogHeader>
          {payingLease && (
            <div className="space-y-4">
              {/* Balance info */}
              <div className="rounded-md border p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Saldo actual:</span>
                  <span className="font-semibold text-destructive">{formatCurrency(payingLease.outstanding_balance || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Renta por periodo ({payingLease.payment_frequency}):</span>
                  <span>{formatCurrency(payingLease.annual_rent || 0)}</span>
                </div>
                {paymentForm.amount > 0 && (
                  <>
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Abono:</span>
                      <span className="text-emerald-600">- {formatCurrency(paymentForm.amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Saldo resultante:</span>
                      <span>{formatCurrency(Math.max(0, (payingLease.outstanding_balance || 0) - paymentForm.amount))}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label>Monto del Abono</Label>
                <Input type="number" step="0.01" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />
                <p className="text-xs text-muted-foreground">Puede ser un abono parcial, no tiene que ser la renta completa</p>
              </div>
              <div className="space-y-2">
                <Label>Fecha de Pago</Label>
                <Input type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm(f => ({ ...f, payment_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Periodo que Corresponde</Label>
                <Select value={paymentForm.period_covered} onValueChange={v => setPaymentForm(f => ({ ...f, period_covered: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar periodo..." /></SelectTrigger>
                  <SelectContent>
                    {generatePeriodOptions(payingLease).map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">O escribe manualmente:</p>
                <Input placeholder="Ej: Oct 2024 - Oct 2025" value={paymentForm.period_covered} onChange={e => setPaymentForm(f => ({ ...f, period_covered: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Notas del Pago</Label>
                <Textarea value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Ej: Abono parcial, transferencia bancaria" />
              </div>
              <Button onClick={handlePayment} className="w-full">Registrar Abono</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Comments Dialog */}
      <Dialog open={showCommentsDialog} onOpenChange={setShowCommentsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Comentarios</DialogTitle>
            {commentingLease && (
              <p className="text-sm text-muted-foreground">
                {commentingLease.owner_name} — {commentingLease.location}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4">
            {/* Add comment */}
            <div className="flex gap-2">
              <Textarea 
                value={newComment} 
                onChange={e => setNewComment(e.target.value)} 
                placeholder="Agregar comentario..." 
                rows={2} 
                className="flex-1"
              />
              <Button size="icon" onClick={handleAddComment} disabled={!newComment.trim()} className="self-end">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <Separator />
            {/* Comments list */}
            <ScrollArea className="max-h-[300px]">
              {(!comments || comments.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin comentarios aún</p>
              ) : (
                <div className="space-y-3">
                  {comments.map(c => (
                    <div key={c.id} className="rounded-md border p-3 space-y-1">
                      <p className="text-sm">{c.comment}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
