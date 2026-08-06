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
import { Plus, CheckCircle, DollarSign, AlertTriangle, MessageCircle, WalletCards, ArrowUpRight, ReceiptText } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { getDaysDiff, getPaymentRowClass } from '@/lib/dateUtils';

interface StudentBasic { id: string; full_name: string; phone: string | null; due_day: number; }

const Payments: React.FC = () => {
  const { isOwner, gymId } = useAuth();
  const [payments, setPayments] = useState<(Payment & { student_phone?: string | null })[]>([]);
  const [students, setStudents] = useState<StudentBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [paymentLink, setPaymentLink] = useState('');
  const [form, setForm] = useState({ student_id: '', amount: '', due_date: '', payment_method: 'cash', already_paid: true });

  useEffect(() => { if (gymId) fetchData(); }, [gymId]);

  const fetchData = async () => {
    const [paymentsRes, studentsRes, settingsRes] = await Promise.all([
      supabase.from('payments').select('*, students(full_name, phone)').eq('gym_id', gymId).order('due_date', { ascending: false }),
      supabase.from('students').select('id, full_name, phone, due_day').eq('gym_id', gymId).eq('status', 'active').order('full_name'),
      supabase.from('gym_settings').select('value').eq('key', 'payment_link').eq('gym_id', gymId).single(),
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
    if (submitting) return;
    setSubmitting(true);
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('payments').insert({
      student_id: form.student_id, amount: Number(form.amount),
      due_date: form.due_date,
      status: form.already_paid ? 'paid' : 'pending',
      payment_date: form.already_paid ? today : null,
      payment_method: form.payment_method,
      gym_id: gymId,
    } as any);
    toast.success('Pago registrado');
    setDialogOpen(false);
    setForm({ student_id: '', amount: '', due_date: '', payment_method: 'cash', already_paid: true });
    setSubmitting(false);
    fetchData();
  };

  const handleMarkPaid = async (payment: Payment) => {
    if (payingId === payment.id) return;
    setPayingId(payment.id);
    await supabase.from('payments').update({ status: 'paid', payment_date: new Date().toISOString().split('T')[0] }).eq('id', payment.id);
    toast.success('Marcado como pagado');
    setPayingId(null);
    fetchData();
  };

  const sendWhatsAppReminder = (payment: Payment & { student_phone?: string | null }) => {
    const phone = payment.student_phone?.replace(/\D/g, '');
    if (!phone) { toast.error('El alumno no tiene teléfono registrado'); return; }

    const linkSection = paymentLink ? `\n👉 ${paymentLink}` : '';
    const message = `Hola ${payment.student_name}, te recordamos que tu cuota del gimnasio vence el ${payment.due_date}.\n\nEl valor de este mes es $${Number(payment.amount).toLocaleString()}.\n\nPodés pagar de estas maneras:\n1️⃣ En recepción del gimnasio\n2️⃣ Por transferencia\n3️⃣ Con el link de pago${linkSection}\n\n¡Gracias!`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const getRowClass = (payment: Payment) => getPaymentRowClass(payment.status, payment.due_date);

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
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[28px] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/12 via-card to-card p-6 lg:p-8 shadow-2xl shadow-black/20">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400"><WalletCards className="h-3.5 w-3.5" /> Finanzas</div>
            <h1 className="text-3xl font-black tracking-tight text-foreground lg:text-4xl">Cuotas y cobranzas</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground lg:text-base">Controlá ingresos, vencimientos y seguimientos sin perder de vista a ningún alumno.</p>
          </div>
        <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) setForm({ student_id: '', amount: '', due_date: '', payment_method: 'cash', already_paid: true }); }}>
          <DialogTrigger asChild><Button className="h-11 rounded-xl bg-emerald-500 px-5 font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400"><Plus className="mr-2 h-4 w-4" />Registrar pago</Button></DialogTrigger>
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
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                <div>
                  <Label className="text-sm font-medium">Ya cobrado</Label>
                  <p className="text-xs text-muted-foreground">{form.already_paid ? 'Se registra como Pagado hoy' : 'Se registra como Pendiente'}</p>
                </div>
                <Switch checked={form.already_paid} onCheckedChange={v => setForm({ ...form, already_paid: v })} />
              </div>
            </div>
            <Button onClick={handleCreatePayment} className="w-full mt-4" disabled={!form.student_id || !form.amount || !form.due_date || submitting}>
              {submitting ? 'Registrando...' : 'Registrar Pago'}
            </Button>
          </DialogContent>
        </Dialog>
        </div>
      </section>

      {/* Summary cards */}
      <div className={`grid grid-cols-1 ${isOwner ? 'md:grid-cols-3' : 'md:grid-cols-1'} gap-4`}>
        {isOwner && (
          <Card className="group overflow-hidden rounded-2xl border-border/70 bg-card/80 shadow-lg shadow-black/10 transition-all hover:-translate-y-0.5 hover:border-emerald-500/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cobrado este mes</CardTitle>
              <DollarSign className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-foreground">${totalPaid.toLocaleString()}</div></CardContent>
          </Card>
        )}
        {isOwner && (
          <Card className="group overflow-hidden rounded-2xl border-border/70 bg-card/80 shadow-lg shadow-black/10 transition-all hover:-translate-y-0.5 hover:border-emerald-500/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendiente</CardTitle>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-foreground">${totalPending.toLocaleString()}</div></CardContent>
          </Card>
        )}
        <Card className="group overflow-hidden rounded-2xl border-border/70 bg-card/80 shadow-lg shadow-black/10 transition-all hover:-translate-y-0.5 hover:border-red-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Morosos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-foreground">{overdueCount}</div></CardContent>
        </Card>
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-border/70 bg-card/60 p-2 backdrop-blur">
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

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/70 shadow-2xl shadow-black/10">
        <Table>
          <TableHeader>
            <TableRow className="border-border/70 bg-muted/30">
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
              <TableRow key={payment.id} className={`${getRowClass(payment)} border-border/60 transition-colors hover:bg-emerald-500/[0.04]`}>
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
                        <Button variant="ghost" size="sm" onClick={() => handleMarkPaid(payment)} className="text-success hover:text-success" disabled={payingId === payment.id}>
                          <CheckCircle className="h-4 w-4 mr-1" /> {payingId === payment.id ? '...' : 'Pagar'}
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
