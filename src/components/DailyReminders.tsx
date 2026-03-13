import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  const [reminders, setReminders] = useState<ReminderPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => { fetchReminders(); }, []);

  const fetchReminders = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const futureStr = threeDaysLater.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('payments')
      .select('id, student_id, amount, due_date, status, last_reminder_sent_at, reminder_count, students(full_name, phone)')
      .in('status', ['pending', 'overdue'])
      .lte('due_date', futureStr)
      .order('due_date', { ascending: true });

    if (error) { setLoading(false); return; }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString().split('T')[0];

    const items: ReminderPayment[] = (data || [])
      .map((p: any) => {
        const dueDate = new Date(p.due_date + 'T00:00:00');
        const diffMs = today.getTime() - dueDate.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
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
    <div className="space-y-4">
      {/* Summary card */}
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Recordatorios pendientes de hoy</CardTitle>
          <Bell className="h-5 w-5 text-warning" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{pendingCount}</div>
          {pendingCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {overdueCount > 0 && <span className="text-destructive">{overdueCount} moroso{overdueCount !== 1 ? 's' : ''}</span>}
              {overdueCount > 0 && dueSoonCount > 0 && ' · '}
              {dueSoonCount > 0 && <span className="text-warning">{dueSoonCount} por vencer</span>}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Reminders table */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recordatorios de hoy
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando recordatorios...</div>
          ) : reminders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
              <CheckCircle2 className="h-8 w-8 text-success" />
              <span>No hay recordatorios pendientes para hoy</span>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
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
                    <TableRow key={r.id} className={r.type === 'overdue' ? 'row-danger' : 'row-warning'}>
                      <TableCell className="font-medium">{r.student_name}</TableCell>
                      <TableCell>
                        {r.type === 'overdue' ? (
                          <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30">🔴 Moroso</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-warning/15 text-warning border-warning/30">🟡 Por vencer</Badge>
                        )}
                      </TableCell>
                      <TableCell>${r.amount.toLocaleString()}</TableCell>
                      <TableCell>{r.due_date}</TableCell>
                      <TableCell>
                        {r.type === 'overdue' ? (
                          <span className="text-destructive font-semibold">{r.days}d atraso</span>
                        ) : r.days === 0 ? (
                          <span className="text-warning font-semibold">Hoy</span>
                        ) : (
                          <span className="text-muted-foreground">{r.days}d restantes</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{r.reminder_count}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSendReminder(r)}
                          disabled={sending === r.id}
                          className="text-success hover:text-success"
                        >
                          <MessageCircle className="h-4 w-4 mr-1" />
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
    </div>
  );
};

export default DailyReminders;
