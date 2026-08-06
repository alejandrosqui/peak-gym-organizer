import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Users, AlertTriangle, CreditCard, DollarSign, Clock, Dumbbell, ArrowUpRight, Activity, WalletCards } from 'lucide-react';
import DailyReminders from '@/components/DailyReminders';

interface DashboardStats {
  activeStudents: number;
  overdueStudents: number;
  paymentsThisMonth: number;
  revenueThisMonth: number;
  dueSoonStudents: number;
  noRoutineStudents: number;
}

const Dashboard: React.FC = () => {
  const { isOwner, gymName, gymId } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    activeStudents: 0, overdueStudents: 0, paymentsThisMonth: 0,
    revenueThisMonth: 0, dueSoonStudents: 0, noRoutineStudents: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (gymId) fetchStats(); }, [gymId]);

  const fetchStats = async () => {
    const now = new Date();
    const currentDay = now.getDate();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [studentsRes, paymentsRes, routineAssignRes] = await Promise.all([
      supabase.from('students').select('id, status, due_day').eq('gym_id', gymId),
      supabase.from('payments').select('id, amount, status, payment_date').eq('gym_id', gymId).gte('due_date', monthStart).lte('due_date', monthEnd),
      supabase.from('student_routines').select('student_id'),
    ]);

    const students = studentsRes.data || [];
    const payments = paymentsRes.data || [];
    const routineAssignments = new Set((routineAssignRes.data || []).map(r => r.student_id));
    const activeStudents = students.filter(s => s.status === 'active').length;
    const overdueStudents = students.filter(s => s.status === 'overdue').length;
    const paidPayments = payments.filter(p => p.status === 'paid');
    const revenueThisMonth = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const dueSoonStudents = students.filter(s => {
      const diff = s.due_day - currentDay;
      return s.status === 'active' && diff >= 0 && diff <= 3;
    }).length;
    const noRoutineStudents = students.filter(s => s.status === 'active' && !routineAssignments.has(s.id)).length;

    setStats({ activeStudents, overdueStudents, paymentsThisMonth: paidPayments.length, revenueThisMonth, dueSoonStudents, noRoutineStudents });
    setLoading(false);
  };

  const collectionRate = useMemo(() => {
    const total = stats.activeStudents + stats.overdueStudents;
    if (!total) return 100;
    return Math.max(0, Math.round((stats.activeStudents / total) * 100));
  }, [stats.activeStudents, stats.overdueStudents]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map(item => <div key={item} className="h-36 animate-pulse rounded-2xl border border-border bg-card" />)}
      </div>
    );
  }

  const ownerCards = [
    { title: 'Alumnos activos', value: stats.activeStudents, detail: 'Membresías habilitadas', icon: Users, tone: 'primary' },
    { title: 'Ingresos del mes', value: `$${stats.revenueThisMonth.toLocaleString('es-AR')}`, detail: `${stats.paymentsThisMonth} pagos acreditados`, icon: DollarSign, tone: 'primary' },
    { title: 'Cuotas vencidas', value: stats.overdueStudents, detail: 'Requieren seguimiento', icon: AlertTriangle, tone: 'danger' },
    { title: 'Vencen pronto', value: stats.dueSoonStudents, detail: 'Próximos 3 días', icon: Clock, tone: 'warning' },
  ];

  const managerCards = [
    { title: 'Alumnos activos', value: stats.activeStudents, detail: 'Membresías habilitadas', icon: Users, tone: 'primary' },
    { title: 'Cuotas vencidas', value: stats.overdueStudents, detail: 'Requieren seguimiento', icon: AlertTriangle, tone: 'danger' },
    { title: 'Vencen pronto', value: stats.dueSoonStudents, detail: 'Próximos 3 días', icon: Clock, tone: 'warning' },
    { title: 'Sin rutina', value: stats.noRoutineStudents, detail: 'Alumnos activos', icon: Dumbbell, tone: 'neutral' },
  ];

  const cards = isOwner ? ownerCards : managerCards;
  const toneClasses: Record<string, string> = {
    primary: 'bg-primary/12 text-primary border-primary/20',
    danger: 'bg-destructive/10 text-destructive border-destructive/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    neutral: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-7">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/10">Vista general</Badge>
            {gymName && <span className="text-xs text-muted-foreground">{gymName}</span>}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Tu gimnasio, en control.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">Estado operativo, cobranzas y tareas importantes del día en una sola pantalla.</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/70 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Activity className="h-5 w-5" /></div>
          <div>
            <p className="text-xs text-muted-foreground">Salud de membresías</p>
            <p className="text-lg font-bold text-foreground">{collectionRate}% <span className="text-xs font-medium text-primary">activas</span></p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(card => (
          <article key={card.title} className="metric-card">
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">{card.value}</p>
                <p className="mt-2 text-xs text-muted-foreground">{card.detail}</p>
              </div>
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${toneClasses[card.tone]}`}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="surface-panel overflow-hidden p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Estado operativo</p>
              <p className="mt-1 text-xs text-muted-foreground">Distribución actual de alumnos y tareas pendientes</p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-7 grid gap-6 md:grid-cols-[180px_1fr] md:items-center">
            <div className="relative mx-auto flex h-40 w-40 items-center justify-center rounded-full" style={{ background: `conic-gradient(hsl(var(--primary)) ${collectionRate}%, hsl(var(--muted)) ${collectionRate}% 100%)` }}>
              <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-card shadow-inner">
                <span className="text-3xl font-bold text-foreground">{collectionRate}%</span>
                <span className="text-[11px] text-muted-foreground">membresías activas</span>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Activos', value: stats.activeStudents, className: 'bg-primary' },
                { label: 'Vencidos', value: stats.overdueStudents, className: 'bg-destructive' },
                { label: 'Vencen pronto', value: stats.dueSoonStudents, className: 'bg-warning' },
                { label: 'Sin rutina', value: stats.noRoutineStudents, className: 'bg-muted-foreground' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.className}`} />
                  <span className="flex-1 text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-semibold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="surface-panel flex flex-col justify-between p-5 md:p-6">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><WalletCards className="h-5 w-5" /></div>
            <p className="mt-5 text-sm font-semibold text-foreground">Resumen de cobranzas</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Datos reales registrados durante el mes actual.</p>
          </div>
          <div className="mt-8 space-y-4">
            <div className="flex items-end justify-between border-b border-border pb-4">
              <span className="text-sm text-muted-foreground">Pagos acreditados</span>
              <span className="text-2xl font-bold text-foreground">{stats.paymentsThisMonth}</span>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-sm text-muted-foreground">Facturación</span>
              <span className="text-xl font-bold text-primary">${stats.revenueThisMonth.toLocaleString('es-AR')}</span>
            </div>
          </div>
        </div>
      </section>

      <DailyReminders />
    </div>
  );
};

export default Dashboard;
