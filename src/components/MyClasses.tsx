import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ClassSchedule, StudentClassSubscription, ClassEnrollment } from '@/types/gym';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Flame, Clock, CalendarCheck, CalendarX, ArrowRight, Star } from 'lucide-react';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAY_FULL  = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toLocalDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getWeekBounds(d: Date): { start: string; end: string } {
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toLocalDateStr(start), end: toLocalDateStr(end) };
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return toLocalDateStr(d);
}

// Can cancel? Must be before 23:00 of the day before the class
function canCancel(classDate: string): boolean {
  const deadline = new Date(classDate + 'T23:00:00');
  deadline.setDate(deadline.getDate() - 1);
  return new Date() < deadline;
}

// Next occurrence of a schedule from today (inclusive)
function nextOccurrence(schedule: ClassSchedule, fromDate?: string): string | null {
  const from = fromDate ? new Date(fromDate + 'T12:00:00') : new Date();
  from.setHours(0, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    if (schedule.days.includes(d.getDay())) return toLocalDateStr(d);
  }
  return null;
}

// Count streak: consecutive calendar weeks (Sun–Sat) where student attended at least one class
function computeStreak(enrollments: ClassEnrollment[]): number {
  const attended = enrollments.filter(e => e.status === 'attended').map(e => e.date).sort().reverse();
  if (!attended.length) return 0;

  const weeks = new Set(attended.map(date => {
    const d = new Date(date + 'T12:00:00');
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return toLocalDateStr(d);
  }));

  const sorted = Array.from(weeks).sort().reverse();
  let streak = 0;
  let expected = getWeekBounds(new Date()).start;

  // Allow current week in progress
  for (const w of sorted) {
    if (w === expected) {
      streak++;
      const prev = new Date(expected + 'T12:00:00');
      prev.setDate(prev.getDate() - 7);
      expected = toLocalDateStr(prev);
    } else break;
  }
  return streak;
}

// ─── Main Component ────────────────────────────────────────────────────────────

const MyClasses: React.FC = () => {
  const { studentId, gymId } = useAuth();
  const [subscriptions, setSubscriptions] = useState<(StudentClassSubscription & { schedule: ClassSchedule })[]>([]);
  const [allEnrollments, setAllEnrollments] = useState<ClassEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!studentId || !gymId) return;
    const threeMonthsAgo = toLocalDateStr(new Date(Date.now() - 90 * 86400000));

    const [subsRes, enrollRes] = await Promise.all([
      supabase.from('student_class_subscriptions')
        .select('*, class_schedules(*)')
        .eq('student_id', studentId)
        .eq('is_active', true),
      supabase.from('class_enrollments')
        .select('*')
        .eq('student_id', studentId)
        .gte('date', threeMonthsAgo),
    ]);

    const subs = (subsRes.data || []).map((s: any) => ({ ...s, schedule: s.class_schedules }));
    setSubscriptions(subs);
    setAllEnrollments(enrollRes.data || []);
    setLoading(false);
  }, [studentId, gymId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Confirm attendance ──────────────────────────────────────────────────────
  const confirmClass = async (scheduleId: string, date: string, weeklyUsed: number, weeklyLimit: number, isLast: boolean) => {
    if (acting) return;
    setActing(scheduleId + date);

    // Check capacity
    const { count } = await supabase.from('class_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('schedule_id', scheduleId)
      .eq('date', date)
      .in('status', ['confirmed', 'attended']);

    const sched = subscriptions.find(s => s.schedule_id === scheduleId)?.schedule;
    const maxCap = sched?.max_capacity ?? 999;
    const status = (count ?? 0) >= maxCap ? 'waitlist' : 'confirmed';

    const { error } = await supabase.from('class_enrollments').upsert({
      student_id: studentId,
      schedule_id: scheduleId,
      gym_id: gymId,
      date,
      status,
    }, { onConflict: 'student_id,schedule_id,date' });

    if (error) { toast.error('Error al confirmar'); setActing(null); return; }

    if (status === 'waitlist') {
      toast.info('Cupo lleno. Quedaste en lista de espera — te avisamos si se libera un lugar.');
    } else if (isLast) {
      toast.success('¡Confirmado! 💪 Esta es tu última clase de la semana. ¿Querés venir más seguido? Hablá con recepción para cambiar tu plan.');
    } else {
      toast.success('¡Clase confirmada! Te esperamos.');
    }

    await fetchData();
    setActing(null);
  };

  // ── Cancel attendance ───────────────────────────────────────────────────────
  const cancelClass = async (enrollmentId: string, classDate: string) => {
    if (acting) return;
    setActing(enrollmentId);
    const early = canCancel(classDate);
    const newStatus = early ? 'cancelled_early' : 'cancelled_late';

    await supabase.from('class_enrollments')
      .update({ status: newStatus, cancelled_at: new Date().toISOString() })
      .eq('id', enrollmentId);

    if (!early) {
      toast.warning('Cancelación tarde — la clase igual se descuenta de tu semana (plazo: 23hs del día anterior).');
    } else {
      toast.success('Clase cancelada. El cupo queda libre para otro alumno.');
    }
    await fetchData();
    setActing(null);
  };

  // ── Extend to next week ────────────────────────────────────────────────────
  const extendToNextWeek = async (scheduleId: string, currentDate: string) => {
    if (acting) return;
    setActing('extend' + scheduleId);

    // Cancel current
    const current = allEnrollments.find(e => e.schedule_id === scheduleId && e.date === currentDate && e.status === 'confirmed');
    if (current) {
      await supabase.from('class_enrollments')
        .update({ status: 'extended', cancelled_at: new Date().toISOString() })
        .eq('id', current.id);
    }

    // Find next occurrence 7+ days out (next week same day or next occurrence after 7 days)
    const sched = subscriptions.find(s => s.schedule_id === scheduleId)?.schedule;
    if (!sched) { setActing(null); return; }
    const nextDate = nextOccurrence(sched, addDays(currentDate, 7));
    if (!nextDate) { toast.error('No se encontró la próxima fecha.'); setActing(null); return; }

    await supabase.from('class_enrollments').upsert({
      student_id: studentId,
      schedule_id: scheduleId,
      gym_id: gymId,
      date: nextDate,
      status: 'confirmed',
    }, { onConflict: 'student_id,schedule_id,date' });

    toast.success(`¡Buena decisión! Clase movida al ${DAY_FULL[new Date(nextDate + 'T12:00:00').getDay()]} ${nextDate}. ¡La racha sigue! 🔥`);
    await fetchData();
    setActing(null);
  };

  // ─────────────────────────────────────────────────────────────────────────────

  const streak = computeStreak(allEnrollments);
  const { start: weekStart, end: weekEnd } = getWeekBounds(new Date());
  const today = toLocalDateStr(new Date());

  if (loading) return <div className="text-muted-foreground text-sm py-4">Cargando clases...</div>;
  if (subscriptions.length === 0) return (
    <div className="py-6 text-center text-muted-foreground text-sm">
      <CalendarCheck className="mx-auto h-8 w-8 mb-2 opacity-30" />
      <p>Todavía no estás inscripto en ninguna clase. Hablá con recepción.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Streak banner */}
      {streak > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 border border-orange-200 text-orange-700">
          <Flame className="h-6 w-6 shrink-0" />
          <div>
            <p className="font-semibold text-sm">{streak === 1 ? '¡Arrancaste!' : `¡${streak} semanas seguidas!`} 🔥</p>
            <p className="text-xs opacity-80">{streak >= 4 ? '¡Sos una máquina! No cortés la racha.' : 'Seguí así, el hábito se forma en 21 días.'}</p>
          </div>
        </div>
      )}

      {subscriptions.map(sub => {
        const sched = sub.schedule;
        if (!sched) return null;

        // Enrollments this week for this schedule
        const weekEnrollments = allEnrollments.filter(e =>
          e.schedule_id === sched.id &&
          e.date >= weekStart &&
          e.date <= weekEnd &&
          ['confirmed', 'attended', 'cancelled_late'].includes(e.status)
        );
        const weeklyUsed = weekEnrollments.length;
        const weeklyLimit = sub.weekly_limit;
        const isLastOfWeek = weeklyUsed === weeklyLimit - 1;
        const weekFull = weeklyUsed >= weeklyLimit;

        // Next class
        const nextDate = nextOccurrence(sched);
        const nextEnrollment = nextDate ? allEnrollments.find(e => e.schedule_id === sched.id && e.date === nextDate) : null;
        const isConfirmed = nextEnrollment?.status === 'confirmed';
        const isWaitlist = nextEnrollment?.status === 'waitlist';
        const isExtended = nextEnrollment?.status === 'extended';

        const nextDateObj = nextDate ? new Date(nextDate + 'T12:00:00') : null;
        const isToday = nextDate === today;

        return (
          <Card key={sub.id} className="border-l-4 overflow-hidden" style={{ borderLeftColor: sched.color }}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{sched.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" />{sched.start_time.slice(0, 5)} – {sched.end_time.slice(0, 5)}
                    {sched.instructor_name && <> · {sched.instructor_name}</>}
                  </p>
                </div>
                {/* Weekly usage */}
                <div className="text-right shrink-0">
                  <div className="flex gap-1">
                    {Array.from({ length: weeklyLimit }).map((_, i) => (
                      <span key={i} className={`w-4 h-4 rounded-full border-2 transition-colors ${i < weeklyUsed ? 'border-orange-500 bg-orange-500' : 'border-muted-foreground/30'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{weeklyUsed}/{weeklyLimit} esta semana</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Days pills */}
              <div className="flex gap-1 flex-wrap">
                {sched.days.map(d => (
                  <span key={d} className={`px-2 py-0.5 rounded-full text-xs font-medium border ${new Date().getDay() === d ? 'text-white' : 'text-foreground bg-muted/40'}`}
                    style={new Date().getDay() === d ? { backgroundColor: sched.color, borderColor: sched.color } : {}}>
                    {DAY_NAMES[d]}
                  </span>
                ))}
              </div>

              {/* Next class action area */}
              {nextDate && nextDateObj && (
                <div className={`rounded-lg p-3 ${isToday ? 'bg-orange-50 border border-orange-200' : 'bg-muted/30'}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium mb-0.5">
                        {isToday ? 'HOY' : 'PRÓXIMA CLASE'}
                      </p>
                      <p className="font-semibold text-sm">{DAY_FULL[nextDateObj.getDay()]}, {nextDate}</p>
                    </div>

                    {/* Status badge */}
                    {isConfirmed && <Badge className="bg-green-100 text-green-700 border-green-300">✓ Confirmado</Badge>}
                    {isWaitlist && <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">En espera</Badge>}
                    {isExtended && <Badge className="bg-purple-100 text-purple-700 border-purple-300">Extendida</Badge>}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {!isConfirmed && !isWaitlist && !weekFull && (
                      <Button size="sm" onClick={() => confirmClass(sched.id, nextDate, weeklyUsed, weeklyLimit, isLastOfWeek)}
                        disabled={!!acting} style={{ backgroundColor: sched.color, borderColor: sched.color }}
                        className="text-white hover:opacity-90">
                        <CalendarCheck className="h-3.5 w-3.5 mr-1" />
                        {acting === sched.id + nextDate ? 'Confirmando...' : 'Confirmar asistencia'}
                      </Button>
                    )}

                    {!isConfirmed && weekFull && (
                      <p className="text-xs text-muted-foreground self-center">Ya usaste tus {weeklyLimit} clases de la semana.</p>
                    )}

                    {isConfirmed && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => cancelClass(nextEnrollment!.id, nextDate)}
                          disabled={!!acting} className="text-red-500 border-red-200 hover:bg-red-50">
                          <CalendarX className="h-3.5 w-3.5 mr-1" />
                          {acting === nextEnrollment!.id ? 'Cancelando...' : 'Cancelar'}
                        </Button>

                        {/* Extension option when last class of week */}
                        {isLastOfWeek && (
                          <Button size="sm" variant="outline" onClick={() => extendToNextWeek(sched.id, nextDate)}
                            disabled={!!acting} className="border-orange-300 text-orange-600 hover:bg-orange-50">
                            <ArrowRight className="h-3.5 w-3.5 mr-1" />
                            {acting === 'extend' + sched.id ? 'Moviendo...' : 'Mover a semana siguiente'}
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Upsell nudge when confirming last class */}
                  {isLastOfWeek && isConfirmed && (
                    <div className="mt-3 p-2 rounded-lg bg-orange-100 border border-orange-200 flex items-start gap-2">
                      <Star className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-orange-700">
                        ¿Por qué no venís todos los días y no cortás la racha? Hablá con recepción para cambiar tu plan. 💪
                      </p>
                    </div>
                  )}

                  {/* Cancellation warning */}
                  {isConfirmed && !canCancel(nextDate) && (
                    <p className="text-xs text-amber-600 mt-2">⚠️ El plazo de cancelación ya venció (23hs del día anterior). Si cancelás igual, la clase se descuenta.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default MyClasses;
