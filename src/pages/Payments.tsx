import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Payment } from '@/types/gym';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, CheckCircle, DollarSign, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const Payments: React.FC = () => {
  const { isAdmin } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    student_id: '', amount: '', due_date: '', payment_method: 'cash',
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [paymentsRes, studentsRes] = await Promise.all([
      supabase.from('payments').select('*, students(full_name)').order('due_date', { ascending: false }),
      supabase.from('students').select('id, full_name').eq('status', 'active').order('full_name'),
    ]);
    setPayments((paymentsRes.data || []).map((p: any) => ({
      ...p,
      student_name: p.students?.full_name || 'Desconocido',
    })));
    setStudents(studentsRes.data || []);
    setLoading(false);
  };

  const handleCreatePayment = async () => {
    await supabase.from('payments').insert({
      student_id: form.student_id,
      amount: Number(form.amount),
      due_date: form.due_date,
      status: 'pending',
      payment_method: form.payment_method,
    });
    toast.success('Pago registrado');
    setDialogOpen(false);
    setForm({ student_id: '', amount: '', due_date: '', payment_method: 'cash' });
    fetchData();
  };

  const handleMarkPaid = async (payment: Payment) => {
    await supabase.from('payments').update({
      status: 'paid',
      payment_date: new Date().toISOString().split('T')[0],
    }).eq('id', payment.id);
    toast.success('Marcado como pagado');
    fetchData();
  };

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = payments.filter(p => p.status !== 'paid').reduce((s, p) => s + Number(p.amount), 0);
  const overdueCount = payments.filter(p => p.status === 'overdue').length;

  const statusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      paid: { cls: 'bg-success/15 text-success border-success/30', label: 'Pagado' },
      pending: { cls: 'bg-warning/15 text-warning border-warning/30', label: 'Pendiente' },
      overdue: { cls: 'bg-destructive/15 text-destructive border-destructive/30', label: 'Vencido' },
    };
    const { cls, label } = map[status] || map.pending;
    return <Badge variant="outline" className={cls}>{label}</Badge>;
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-foreground">Cuotas y Pagos</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Registrar Pago</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo Pago</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-4">
              <div>
                <Label>Alumno</Label>
                <Select value={form.student_id} onValueChange={v => setForm({ ...form, student_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar alumno" /></SelectTrigger>
                  <SelectContent>
                    {students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Monto</Label>
                <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div>
                <Label>Fecha de vencimiento</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
              </div>
              <div>
                <Label>Método de pago</Label>
                <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleCreatePayment} className="w-full mt-4" disabled={!form.student_id || !form.amount || !form.due_date}>
              Registrar Pago
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cobrado este mes</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-foreground">${totalPaid.toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendiente</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-foreground">${totalPending.toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Morosos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-foreground">{overdueCount}</div></CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-auto bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Alumno</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden md:table-cell">Método</TableHead>
              <TableHead className="hidden md:table-cell">Último pago</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : payments.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No hay pagos registrados</TableCell></TableRow>
            ) : payments.map(payment => (
              <TableRow key={payment.id} className="table-row-striped">
                <TableCell className="font-medium">{payment.student_name}</TableCell>
                <TableCell>${Number(payment.amount).toLocaleString()}</TableCell>
                <TableCell>{payment.due_date}</TableCell>
                <TableCell>{statusBadge(payment.status)}</TableCell>
                <TableCell className="hidden md:table-cell capitalize">{payment.payment_method || '-'}</TableCell>
                <TableCell className="hidden md:table-cell">{payment.payment_date || '-'}</TableCell>
                <TableCell className="text-right">
                  {payment.status !== 'paid' && (
                    <Button variant="ghost" size="sm" onClick={() => handleMarkPaid(payment)} className="text-success hover:text-success">
                      <CheckCircle className="h-4 w-4 mr-1" /> Pagar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Payments;
