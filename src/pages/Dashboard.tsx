import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, AlertTriangle, CreditCard, DollarSign, Clock, Dumbbell } from 'lucide-react';

interface DashboardStats {
  activeStudents: number;
  overdueStudents: number;
  paymentsThisMonth: number;
  revenueThisMonth: number;
  dueSoonStudents: number;
  noRoutineStudents: number;
}

const Dashboard: React.FC = () => {
  const { isOwner, isManager, gymName } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    activeStudents: 0, overdueStudents: 0, paymentsThisMonth: 0,
    revenueThisMonth: 0, dueSoonStudents: 0, noRoutineStudents: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    const now = new Date();
    const currentDay = now.getDate();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [studentsRes, paymentsRes, routineAssignRes] = await Promise.all([
      supabase.from('students').select('id, status, due_day'),
      supabase.from('payments').select('id, amount, status, payment_date').gte('due_date', monthStart).lte('due_date', monthEnd),
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

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando dashboard...</div>;
  }

  const ownerCards = [
    { title: 'Alumnos Activos', value: stats.activeStudents, icon: Users, color: 'text-primary' },
    { title: 'Cuotas Vencidas', value: stats.overdueStudents, icon: AlertTriangle, color: 'text-destructive' },
    { title: 'Pagos del Mes', value: stats.paymentsThisMonth, icon: CreditCard, color: 'text-success' },
    { title: 'Ingresos del Mes', value: `$${stats.revenueThisMonth.toLocaleString()}`, icon: DollarSign, color: 'text-success' },
    { title: 'Vencen esta Semana', value: stats.dueSoonStudents, icon: Clock, color: 'text-warning' },
    { title: 'Sin Rutina', value: stats.noRoutineStudents, icon: Dumbbell, color: 'text-muted-foreground' },
  ];

  const managerCards = [
    { title: 'Alumnos Activos', value: stats.activeStudents, icon: Users, color: 'text-primary' },
    { title: 'Cuotas Vencidas', value: stats.overdueStudents, icon: AlertTriangle, color: 'text-destructive' },
    { title: 'Vencen esta Semana', value: stats.dueSoonStudents, icon: Clock, color: 'text-warning' },
    { title: 'Sin Rutina', value: stats.noRoutineStudents, icon: Dumbbell, color: 'text-muted-foreground' },
  ];

  const cards = isOwner ? ownerCards : managerCards;
  const title = isOwner ? 'Dashboard Financiero' : 'Dashboard Operativo';

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {gymName && <Badge variant="outline" className="text-sm">{gymName}</Badge>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(card => (
          <Card key={card.title} className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
