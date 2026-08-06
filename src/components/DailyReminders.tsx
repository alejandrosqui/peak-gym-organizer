import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getDaysDiff } from '@/lib/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, Bell, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface ReminderPayment {
  id: string;
  student_id: string;
  student_name: string;
  student_phone: string | null;
  amount: number;
  due_date: string;
  status: string;
  type: 'due_soon' | 'overdue';
  days: number;
  last_reminder_sent_at: string | null;
  reminder_count: number;
}

const DailyReminders: React.FC = () => {
  const { gymId } = useAuth();
  const [reminders, setReminders] = useState<ReminderPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => { if (gymId) fetchReminders(); }, [gymId]);

  const fetchReminders = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const futureStr = threeDaysLater.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('payments')
      .select('id, student_id, amount, due_date, status, last_reminder_sent_at, reminder_count, students(full_name, phone)')
      .eq('gym_id', gymId)
      .in('status', ['pending', 'overdue'])
      .lte('due_date', futureStr)
      .order('due_date', { ascending: true });

    if (error) { setLoading(false); return; }

    const todayStart = new Date().toISOString().split('T')[0];

    const items: ReminderPayment[] = (data || [])
      .map((p: any) => {
        const diffDays = getDaysDiff(p.due_date);
        const type: 'due_soon' | 'overdue' = diffDays > 0 ? 'overdue' : 'due_soon';

        return {
          id: p.id,
          student_id: p.student_id,
          student_name: p.students?.full_name || 'Desconocido',
          student_phone: p.students?.phone || null,
          amount: Number(p.amount),
          due_date: p.due_date,
          status: p.status,
          type,
          days: Math.abs(diffDays),
          last_reminder_sent_at: p.last_reminder_sent_at,
          reminder_count: p.reminder_count || 0,
        };
      })
      .filter((r: ReminderPayment) => {
        // Exclude if reminder already sent today
        if (r.last_reminder_sent_at) {
          const sentDate = r.last_reminder_sent_at.split('T')[0];
          if (sentDate === todayStart) return false;
        }
        return true;
      });

    setReminders(items);
    setLoading(false);
  };

  const buildMessage = (r: ReminderPayment, paymentLink: string) => {
    const linkSection = paymentLink ? `\n👉 ${paymentLink}` : '';
    if (r.type === 'overdue') {
      return `Hola ${r.student_name}, notamos que tu cuota de $${r.amount.toLocaleString()} venció el ${r.due_date} (hace ${r.days} días).\n\nTe pedimos regularizar tu situación lo antes posible.\n\nPodés pagar de estas maneras:\n1️⃣ En recepción del gimnasio\n2️⃣ Por transferencia\n3️⃣ Con el link de pago${linkSection}\n\n¡Gracias!`;
    }
    return `Hola ${r.student_name}, te recordamos que tu cuota de $${r.amount.toLocaleString()} vence el ${r.due_date}${r.days === 0 ? ' (hoy)' : ` (en ${r.days} días)`}.\n\nPodés pagar de estas maneras:\n1️⃣ En recepción del gimnasio\n2️⃣ Por transferencia\n3️⃣ Con el link de pago${linkSection}\n\n¡Gracias!`;
  };

  const handleSendReminder = async (r: ReminderPayment) => {
    const phone = r.student_phone?.replace(/\D/g, '');
    if (!phone) { toast.error('El alumno no tiene teléfono registrado'); return; }

    setSending(r.id);

    // Get payment link from settings
    const { data: settings } = await supabase
      .from('gym_settings')
      .select('value')
      .eq('key', 'payment_link')
      .eq('gym_id', gymId)
      .single();

    const paymentLink = settings?.value || '';
    const message = buildMessage(r, paymentLink);

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');

    // Record the reminder
    await supabase
      .from('payments')
      .update({
        last_reminder_sent_at: new Date().toISOString(),
        last_reminder_type: r.type,
        reminder_count: r.reminder_count + 1,
      } as any)
      .eq('id', r.id);

    toast.success(`Recordatorio enviado a ${r.student_name}`);
    setReminders(prev => prev.filter(p => p.id !== r.id));
    setSending(null);
  };

  const pendingCount = reminders.length;
  const overdueCount = reminders.filter(r => r.type === 'overdue').length;
  const dueSoonCount = reminders.filter(r => r.type === 'due_soon').length;

  return (
    <Card className="surface-panel overflow-hidden border-border/80 bg-card/90">
      <CardHeader className="border-b border-border/70 bg-background/20 pb-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning/10 text-warning">
                <Bell className="h-[18px] w-[18px]" />
              </span>
              Recordatorios de hoy
            </CardTitle>
            <p className="ml-11 mt-1 text-xs text-muted-foreground">Seguimiento de cuotas por WhatsApp, sin perder vencimientos.</p>
          </div>
          <div className="flex items-center gap-2">
            {overdueCount > 0 && (
              <Badge variant="outline" className="border-destructive/25 bg-destructive/10 text-destructive">
                {overdueCount} vencida{overdueCount !== 1 ? 's' : ''}
              </Badge>
            )}
            {dueSoonCount > 0 && (
              <Badge variant="outline" className="border-warning/25 bg-warning/10 text-warning">
                {dueSoonCount} próxima{dueSoonCount !== 1 ? 's' : ''}
              </Badge>
            )}
            <span className="flex h-8 min-w-8 items-center justify-center rounded-lg border border-border bg-background/40 px-2 text-sm font-bold text-foreground">
              {pendingCount}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Cargando recordatorios...</div>
        ) : reminders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/10 text-success">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Todo al día</p>
              <p className="mt-1 text-xs text-muted-foreground">No hay recordatorios pendientes para hoy.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/25 hover:bg-muted/25">
                  <TableHead>Alumno</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead className="hidden md:table-cell">Enviados</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reminders.map(r => (
                  <TableRow key={r.id} className="border-border/60 transition-colors hover:bg-muted/25">
                    <TableCell className="font-medium text-foreground">{r.student_name}</TableCell>
                    <TableCell>
                      {r.type === 'overdue' ? (
                        <Badge variant="outline" className="border-destructive/25 bg-destructive/10 text-destructive">Vencida</Badge>
                      ) : (
                        <Badge variant="outline" className="border-warning/25 bg-warning/10 text-warning">Por vencer</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">${r.amount.toLocaleString('es-AR')}</TableCell>
                    <TableCell className="text-muted-foreground">{r.due_date}</TableCell>
                    <TableCell>
                      {r.type === 'overdue' ? (
                        <span className="font-semibold text-destructive">{r.days}d atraso</span>
                      ) : r.days === 0 ? (
                        <span className="font-semibold text-warning">Hoy</span>
                      ) : (
                        <span className="text-muted-foreground">{r.days}d restantes</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{r.reminder_count}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSendReminder(r)}
                        disabled={sending === r.id}
                        className="rounded-lg text-primary hover:bg-primary/10 hover:text-primary"
                      >
                        <MessageCircle className="mr-1.5 h-4 w-4" />
                        WhatsApp
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DailyReminders;
