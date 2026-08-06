import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  Clock,
  DollarSign,
  Dumbbell,
  Sparkles,
  Users,
  WalletCards,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import DailyReminders from '@/components/DailyReminders';

interface DashboardStats {
  activeStudents: number;
  overdueStudents: number;
  paymentsThisMonth: number;
  revenueThisMonth: number;
  dueSoonStudents: number;
  noRoutineStudents: number;
}

interface RevenuePoint {
  label: string;
  amount: number;
  payments: number;
}

const Dashboard: React.FC = () => {
  const { isOwner, gymName, gymId } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    activeStudents: 0,
    overdueStudents: 0,
    paymentsThisMonth: 0,
    revenueThisMonth: 0,
    dueSoonStudents: 0,
    noRoutineStudents: 0,
  });
  const [revenueTrend, setRevenueTrend] = useState<RevenuePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (gymId) fetchStats();
  }, [gymId]);

  const fetchStats = async () => {
    const now = new Date();
    const currentDay = now.getDate();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [studentsRes, paymentsRes, routineAssignRes] = await Promise.all([
      supabase.from('students').select('id, status, due_day').eq('gym_id', gymId),
      supabase
        .from('payments')
        .select('id, amount, status, payment_date, due_date')
        .eq('gym_id', gymId)
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd),
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
    const noRoutineStudents = students.filter(
      s => s.status === 'active' && !routineAssignments.has(s.id),
    ).length;

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const weekCount = Math.ceil(daysInMonth / 7);
    const trend = Array.from({ length: weekCount }, (_, index) => ({
      label: `Sem ${index + 1}`,
      amount: 0,
      payments: 0,
    }));

    paidPayments.forEach(payment => {
      const sourceDate = payment.payment_date || payment.due_date;
      const paymentDate = new Date(`${sourceDate}T12:00:00`);
      const weekIndex = Math.min(Math.floor((paymentDate.getDate() - 1) / 7), weekCount - 1);
      trend[weekIndex].amount += Number(payment.amount);
      trend[weekIndex].payments += 1;
    });

    setStats({
      activeStudents,
      overdueStudents,
      paymentsThisMonth: paidPayments.length,
      revenueThisMonth,
      dueSoonStudents,
      noRoutineStudents,
    });
    setRevenueTrend(trend);
    setLoading(false);
  };

  const collectionRate = useMemo(() => {
    const total = stats.activeStudents + stats.overdueStudents;
    if (!total) return 100;
    return Math.max(0, Math.round((stats.activeStudents / total) * 100));
  }, [stats.activeStudents, stats.overdueStudents]);

  const monthName = new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(new Date());
  const attentionTotal = stats.overdueStudents + stats.dueSoonStudents + stats.noRoutineStudents;

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-28 animate-pulse rounded-2xl border border-border bg-card" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map(item => (
            <div key={item} className="h-36 animate-pulse rounded-2xl border border-border bg-card" />
          ))}
        </div>
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
    primary: 'bg-primary/10 text-primary border-primary/20',
    danger: 'bg-destructive/10 text-destructive border-destructive/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    neutral: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-card px-6 py-6 md:px-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/10">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Vista general
              </Badge>
              {gymName && <span className="text-xs text-muted-foreground">{gymName}</span>}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Todo lo importante, a simple vista.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Membresías, cobranzas y tareas pendientes de {monthName}, sin perder tiempo buscando datos.
            </p>
          </div>

          <div className="grid min-w-[280px] grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border/80 bg-background/45 p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Activity className="h-4 w-4 text-primary" /> Salud
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">{collectionRate}%</p>
              <p className="text-[11px] text-primary">membresías activas</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-background/45 p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarClock className="h-4 w-4 text-warning" /> Atención
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">{attentionTotal}</p>
              <p className="text-[11px] text-muted-foreground">acciones pendientes</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(card => (
          <article key={card.title} className="metric-card group">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent opacity-0 transition group-hover:opacity-100" />
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">{card.value}</p>
                <p className="mt-2 text-xs text-muted-foreground">{card.detail}</p>
              </div>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${toneClasses[card.tone]}`}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.55fr_0.75fr]">
        <div className="surface-panel p-5 md:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm font-semibold text-foreground">Cobranza del mes</p>
              <p className="mt-1 text-xs text-muted-foreground">Ingresos acreditados, agrupados por semana.</p>
            </div>
            <div className="rounded-xl border border-primary/15 bg-primary/[0.08] px-3 py-2 text-right">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Total</p>
              <p className="text-lg font-bold text-primary">${stats.revenueThisMonth.toLocaleString('es-AR')}</p>
            </div>
          </div>

          <div className="mt-6 h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={value => `$${Number(value).toLocaleString('es-AR')}`} />
                <Tooltip
                  cursor={{ stroke: 'hsl(var(--primary) / 0.35)', strokeWidth: 1 }}
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    color: 'hsl(var(--popover-foreground))',
                  }}
                  formatter={(value: number | string, _name: string, item: any) => [
                    `$${Number(value).toLocaleString('es-AR')} · ${item.payload.payments} pago${item.payload.payments === 1 ? '' : 's'}`,
                    'Cobrado',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  fill="url(#revenueFill)"
                  activeDot={{ r: 5, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))', strokeWidth: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-panel p-5 md:p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Prioridades de hoy</p>
              <p className="mt-1 text-xs text-muted-foreground">Lo que merece atención primero.</p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-primary" />
          </div>

          <div className="mt-6 space-y-3">
            {[
              { label: 'Cuotas vencidas', value: stats.overdueStudents, icon: AlertTriangle, className: 'text-destructive bg-destructive/10 border-destructive/20' },
              { label: 'Vencen en 3 días', value: stats.dueSoonStudents, icon: Clock, className: 'text-warning bg-warning/10 border-warning/20' },
              { label: 'Alumnos sin rutina', value: stats.noRoutineStudents, icon: Dumbbell, className: 'text-muted-foreground bg-muted border-border' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/35 p-3.5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${item.className}`}>
                  <item.icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">Pendientes de resolver</p>
                </div>
                <span className="text-xl font-bold text-foreground">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/[0.06] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <WalletCards className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{stats.paymentsThisMonth} pagos acreditados</p>
                <p className="text-xs text-muted-foreground">durante {monthName}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <DailyReminders />
    </div>
  );
};

export default Dashboard;
