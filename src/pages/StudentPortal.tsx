import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, CreditCard, Dumbbell, Apple, Calendar, AlertTriangle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import type { Student, Payment, Routine, NutritionPlan } from '@/types/gym';

const StudentPortal: React.FC = () => {
  const { studentId, user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlan | null>(null);
  const [loading, setLoading] = useState(true);

  // Password change state
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (studentId) fetchData();
    else setLoading(false);
  }, [studentId]);

  const fetchData = async () => {
    const [studentRes, paymentsRes, routineRes, nutritionRes] = await Promise.all([
      supabase.from('students').select('*').eq('id', studentId!).single(),
      supabase.from('payments').select('*').eq('student_id', studentId!).order('due_date', { ascending: false }).limit(12),
      supabase.from('student_routines').select('routine_id, routines(*, routine_exercises(*))').eq('student_id', studentId!).maybeSingle(),
      supabase.from('student_nutrition_plans').select('nutrition_plan_id, nutrition_plans(*)').eq('student_id', studentId!).maybeSingle(),
    ]);

    const studentData = studentRes.data as any;
    setStudent(studentData as Student | null);
    setPayments((paymentsRes.data || []) as Payment[]);

    if (studentData?.must_change_password) {
      setMustChangePassword(true);
    }

    if (routineRes.data) {
      const r = (routineRes.data as any).routines;
      if (r) setRoutine({ ...r, exercises: r.routine_exercises || [] });
    }
    if (nutritionRes.data) {
      setNutritionPlan((nutritionRes.data as any).nutrition_plans as NutritionPlan | null);
    }
    setLoading(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return; }
    if (newPassword !== confirmPassword) { toast.error('Las contraseñas no coinciden'); return; }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      // Clear the flag
      await supabase.from('students').update({ must_change_password: false } as any).eq('id', studentId!);
      setMustChangePassword(false);
      toast.success('Contraseña actualizada correctamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al cambiar contraseña');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando...</div>;

  if (!studentId || !student) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <AlertTriangle className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg">Tu cuenta no está vinculada a un perfil de alumno.</p>
        <p className="text-sm">Contactá al gimnasio para que vincule tu cuenta.</p>
      </div>
    );
  }

  // Force password change screen
  if (mustChangePassword) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Cambiá tu contraseña</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Por seguridad, necesitás crear una nueva contraseña antes de continuar.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nueva contraseña</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <Label>Confirmar contraseña</Label>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repetir contraseña" />
            </div>
            <Button
              onClick={handleChangePassword}
              className="w-full"
              disabled={changingPassword || !newPassword || !confirmPassword}
            >
              {changingPassword ? 'Actualizando...' : 'Guardar nueva contraseña'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusMap: Record<string, { cls: string; label: string }> = {
    active: { cls: 'bg-success/15 text-success border-success/30', label: 'Activo' },
    inactive: { cls: 'bg-muted text-muted-foreground border-border', label: 'Inactivo' },
    overdue: { cls: 'bg-destructive/15 text-destructive border-destructive/30', label: 'Moroso' },
  };

  const paymentStatusMap: Record<string, { cls: string; label: string }> = {
    paid: { cls: 'bg-success/15 text-success border-success/30', label: 'Pagado' },
    pending: { cls: 'bg-warning/15 text-warning border-warning/30', label: 'Pendiente' },
    overdue: { cls: 'bg-destructive/15 text-destructive border-destructive/30', label: 'Vencido' },
  };

  const st = statusMap[student.status] || statusMap.active;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Mi Panel</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Mi Perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-foreground">{student.full_name}</p>
            {student.email && <p className="text-sm text-muted-foreground">{student.email}</p>}
            {student.phone && <p className="text-sm text-muted-foreground">{student.phone}</p>}
            {student.training_goal && <p className="text-sm text-muted-foreground mt-1">Objetivo: {student.training_goal}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Estado de Cuota</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className={`text-base px-3 py-1 ${st.cls}`}>{st.label}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Vencimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-foreground">Día {student.due_day}</p>
            <p className="text-sm text-muted-foreground">de cada mes</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Dumbbell className="h-5 w-5 text-primary" />
          <CardTitle>Mi Rutina</CardTitle>
        </CardHeader>
        <CardContent>
          {routine ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="font-semibold text-lg">{routine.name}</span>
                <Badge variant="secondary" className="text-xs">{routine.days_per_week} días/semana</Badge>
              </div>
              {routine.description && <p className="text-sm text-muted-foreground mb-3">{routine.description}</p>}
              {routine.exercises && routine.exercises.length > 0 && (
                <div className="space-y-1">
                  {routine.exercises.sort((a, b) => a.sort_order - b.sort_order).map(ex => (
                    <div key={ex.id} className="text-sm p-2 rounded bg-muted/50 flex justify-between">
                      <span className="font-medium">{ex.exercise_name}</span>
                      <span className="text-muted-foreground">{ex.sets}x{ex.reps} · {ex.rest_seconds}s</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">No tenés una rutina asignada todavía.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Apple className="h-5 w-5 text-primary" />
          <CardTitle>Mi Plan Alimentario</CardTitle>
        </CardHeader>
        <CardContent>
          {nutritionPlan ? (
            <div className="space-y-2">
              <p className="font-semibold text-lg">{nutritionPlan.name}</p>
              {nutritionPlan.estimated_calories && (
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Calorías</span><span className="font-medium">{nutritionPlan.estimated_calories} kcal</span></div>
              )}
              {nutritionPlan.daily_protein && (
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Proteína</span><span className="font-medium">{nutritionPlan.daily_protein}</span></div>
              )}
              {nutritionPlan.suggested_meals && (
                <div className="text-sm mt-2"><p className="text-muted-foreground font-medium mb-1">Comidas:</p><p className="whitespace-pre-line text-xs">{nutritionPlan.suggested_meals}</p></div>
              )}
              {nutritionPlan.suggested_supplements && (
                <div className="text-sm"><span className="text-muted-foreground">Suplementos: </span><span>{nutritionPlan.suggested_supplements}</span></div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">No tenés un plan alimentario asignado todavía.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <CreditCard className="h-5 w-5 text-primary" />
          <CardTitle>Historial de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-muted-foreground">No hay pagos registrados.</p>
          ) : (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Pago</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map(p => {
                    const ps = paymentStatusMap[p.status] || paymentStatusMap.pending;
                    return (
                      <TableRow key={p.id}>
                        <TableCell>{p.due_date}</TableCell>
                        <TableCell>${Number(p.amount).toLocaleString()}</TableCell>
                        <TableCell><Badge variant="outline" className={ps.cls}>{ps.label}</Badge></TableCell>
                        <TableCell>{p.payment_date || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentPortal;
