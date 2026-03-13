import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { Plus, CheckCircle, DollarSign, AlertTriangle, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface StudentBasic { id: string; full_name: string; phone: string | null; due_day: number; }

const Payments: React.FC = () => {
  const { isOwner, gymId } = useAuth();
  const [payments, setPayments] = useState<(Payment & { student_phone?: string | null })[]>([]);
  const [students, setStudents] = useState<StudentBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [paymentLink, setPaymentLink] = useState('');
  const [form, setForm] = useState({ student_id: '', amount: '', due_date: '', payment_method: 'cash' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [paymentsRes, studentsRes, settingsRes] = await Promise.all([
      supabase.from('payments').select('*, students(full_name, phone)').order('due_date', { ascending: false }),
      supabase.from('students').select('id, full_name, phone, due_day').eq('status', 'active').order('full_name'),
      supabase.from('gym_settings').select('value').eq('key', 'payment_link').single(),
    ]);
    setPayments((paymentsRes.data || []).map((p: any) => ({
      ...p,
      student_name: p.students?.full_name || 'Desconocido',
      student_phone: p.students?.phone || null,
    })));
    setStudents(studentsRes.data || []);
    setPaymentLink(settingsRes.data?.value || '');
    setLoading(false);
  };

  const handleCreatePayment = async () => {
    await supabase.from('payments').insert({
      student_id: form.student_id, amount: Number(form.amount),
      due_date: form.due_date, status: 'pending', payment_method: form.payment_method,
    });
    toast.success('Pago registrado');
    setDialogOpen(false); setForm({ student_id: '', amount: '', due_date: '', payment_method: 'cash' }); fetchData();
  };

  const handleMarkPaid = async (payment: Payment) => {
    await supabase.from('payments').update({ status: 'paid', payment_date: new Date().toISOString().split('T')[0] }).eq('id', payment.id);
    toast.success('Marcado como pagado'); fetchData();
  };

  const sendWhatsAppReminder = (payment: Payment & { student_phone?: string | null }) => {
    const phone = payment.student_phone?.replace(/\D/g, '');
    if (!phone) { toast.error('El alumno no tiene teléfono registrado'); return; }

    const linkSection = paymentLink ? `\n👉 ${paymentLink}` : '';
    const message = `Hola ${payment.student_name}, te recordamos que tu cuota del gimnasio vence el ${payment.due_date}.\n\nEl valor de este mes es $${Number(payment.amount).toLocaleString()}.\n\nPodés pagar de estas maneras:\n1️⃣ En recepción del gimnasio\n2️⃣ Por transferencia\n3️⃣ Con el link de pago${linkSection}\n\n¡Gracias!`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const getRowClass = (payment: Payment) => {
    if (payment.status === 'paid') return '';
    if (payment.status === 'overdue') return 'row-danger';
    // Check if due in 3 days or less
    const dueDate = new Date(payment.due_date + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 3 && diffDays >= 0) return 'row-warning';
    return 'table-row-striped';
  };

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = payments.filter(p => p.status !== 'paid').reduce((s, p) => s + Number(p.amount), 0);
  const overdueCount = payments.filter(p => p.status === 'overdue').length;

  const statusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string; emoji: string }> = {
      paid: { cls: 'bg-success/15 text-success border-success/30', label: 'Pagado', emoji: '🟢' },
      pending: { cls: 'bg-warning/15 text-warning border-warning/30', label: 'Por vencer', emoji: '🟡' },
      overdue: { cls: 'bg-destructive/15 text-destructive border-destructive/30', label: 'Moroso', emoji: '🔴' },
    };
    const { cls, label, emoji } = map[status] || map.pending;
    return <Badge variant="outline" className={cls}>{emoji} {label}</Badge>;
  };

  const getDaysDiff = (dueDate: string) => {
    const due = new Date(dueDate + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  };

  const statusOrder: Record<string, number> = { overdue: 0, pending: 1, paid: 2 };

  const filtered = payments
    .filter(p => filterStatus === 'all' || p.status === filterStatus)
    .sort((a, b) => {
      const orderDiff = (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1);
      if (orderDiff !== 0) return orderDiff;
      // Within same status: overdue by most days first, pending by soonest due first
      if (a.status === 'overdue') return getDaysDiff(b.due_date) - getDaysDiff(a.due_date);
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-foreground">Cuotas y Pagos</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Registrar Pago</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo Pago</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-4">
              <div>
                <Label>Alumno</Label>
                <Select value={form.student_id} onValueChange={v => setForm({ ...form, student_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar alumno" /></SelectTrigger>
                  <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Monto</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
              <div><Label>Fecha de vencimiento</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
              <div>
                <Label>Método de pago</Label>
                <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                    <SelectItem value="online">Pago online</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleCreatePayment} className="w-full mt-4" disabled={!form.student_id || !form.amount || !form.due_date}>Registrar Pago</Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className={`grid grid-cols-1 ${isOwner ? 'sm:grid-cols-3' : 'sm:grid-cols-1'} gap-4 mb-6`}>
        {isOwner && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cobrado este mes</CardTitle>
              <DollarSign className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-foreground">${totalPaid.toLocaleString()}</div></CardContent>
          </Card>
        )}
        {isOwner && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendiente</CardTitle>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-foreground">${totalPending.toLocaleString()}</div></CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Morosos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-foreground">{overdueCount}</div></CardContent>
        </Card>
      </div>

      {/* Quick filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { value: 'all', label: 'Todos' },
          { value: 'pending', label: '🟡 Por vencer' },
          { value: 'overdue', label: '🔴 Morosos' },
          { value: 'paid', label: '🟢 Pagados' },
        ].map(f => (
          <Button
            key={f.value}
            variant={filterStatus === f.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="border rounded-lg overflow-auto bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Alumno</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Días</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden md:table-cell">Método</TableHead>
              <TableHead className="hidden md:table-cell">Último pago</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No hay pagos registrados</TableCell></TableRow>
            ) : filtered.map(payment => (
              <TableRow key={payment.id} className={getRowClass(payment)}>
                <TableCell className="font-medium">{payment.student_name}</TableCell>
                <TableCell>${Number(payment.amount).toLocaleString()}</TableCell>
                <TableCell>{payment.due_date}</TableCell>
                <TableCell>
                  {payment.status === 'paid' ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (() => {
                    const days = getDaysDiff(payment.due_date);
                    if (days > 0) return <span className="text-destructive font-semibold">{days}d atraso</span>;
                    if (days === 0) return <span className="text-warning font-semibold">Hoy</span>;
                    return <span className="text-muted-foreground">{Math.abs(days)}d restantes</span>;
                  })()}
                </TableCell>
                <TableCell>{statusBadge(payment.status)}</TableCell>
                <TableCell className="hidden md:table-cell capitalize">{payment.payment_method || '-'}</TableCell>
                <TableCell className="hidden md:table-cell">{payment.payment_date || '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {payment.status !== 'paid' && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => sendWhatsAppReminder(payment)} title="Enviar recordatorio por WhatsApp" className="text-success hover:text-success">
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleMarkPaid(payment)} className="text-success hover:text-success">
                          <CheckCircle className="h-4 w-4 mr-1" /> Pagar
                        </Button>
                      </>
                    )}
                  </div>
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
