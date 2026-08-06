import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { CreditCard, Dumbbell, Fingerprint, KeyRound, Plus, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import type { Student } from '@/types/gym';
import type { StudentCredentials } from './CredentialsModal';
import { generatePassword } from '@/lib/passwordUtils';

const emptyForm = {
  full_name: '', phone: '', email: '', age: '', weight: '', height: '',
  training_goal: '', enrollment_date: new Date().toISOString().split('T')[0],
  due_day: '1', status: 'active', observations: '', dni: '', rfid_uid: '',
};

interface StudentFormDialogProps {
  editing: Student | null;
  gymId: string | null;
  onStudentSaved: () => void;
  onPortalCreated: (credentials: StudentCredentials) => void;
}

const StudentFormDialog: React.FC<StudentFormDialogProps> = ({
  editing, gymId, onStudentSaved, onPortalCreated,
}) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [createPortal, setCreatePortal] = useState(false);
  const [portalEmail, setPortalEmail] = useState('');
  const [portalPassword, setPortalPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [firstPayment, setFirstPayment] = useState(true);

  useEffect(() => {
    if (editing) {
      setForm({
        full_name: editing.full_name,
        phone: editing.phone || '',
        email: editing.email || '',
        age: editing.age?.toString() || '',
        weight: editing.weight?.toString() || '',
        height: editing.height?.toString() || '',
        training_goal: editing.training_goal || '',
        enrollment_date: editing.enrollment_date,
        due_day: editing.due_day.toString(),
        status: editing.status,
        observations: editing.observations || '',
        dni: editing.dni || '',
        rfid_uid: editing.rfid_uid || '',
      });
      setOpen(true);
    }
  }, [editing]);

  const resetForm = () => {
    setForm(emptyForm);
    setCreatePortal(false);
    setPortalEmail('');
    setPortalPassword('');
    setFirstPayment(true);
  };

  const handleSave = async () => {
    if (!form.full_name || !form.dni) return;
    setLoading(true);

    const payload: any = {
      full_name: form.full_name,
      phone: form.phone || null,
      email: form.email || null,
      age: form.age ? Number(form.age) : null,
      weight: form.weight ? Number(form.weight) : null,
      height: form.height ? Number(form.height) : null,
      training_goal: form.training_goal || null,
      enrollment_date: form.enrollment_date,
      due_day: Number(form.due_day),
      status: form.status,
      observations: form.observations || null,
      dni: form.dni.replace(/\D/g, '') || null,
      rfid_uid: form.rfid_uid.trim() || null,
    };

    try {
      if (editing) {
        const { error } = await supabase.from('students').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Alumno actualizado');
      } else {
        const { data: newStudent, error } = await supabase
          .from('students')
          .insert({ ...payload, gym_id: gymId })
          .select()
          .single();

        if (error) {
          if (error.message?.includes('student_limit_reached')) {
            toast.error('Has alcanzado el límite de alumnos del plan actual.', {
              duration: 8000,
              action: { label: 'Actualizar a Pro', onClick: () => window.location.href = '/upgrade' },
            });
          } else {
            toast.error('Error: ' + (error.message || 'desconocido'));
          }
          return;
        }

        toast.success('Alumno creado');

        if (firstPayment && newStudent) {
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + 1);
          await supabase.from('payments').insert({
            student_id: newStudent.id,
            gym_id: gymId,
            amount: 0,
            status: 'paid',
            payment_date: new Date().toISOString().split('T')[0],
            due_date: dueDate.toISOString().split('T')[0],
          });
        }

        if (createPortal && portalEmail && portalPassword && newStudent) {
          const { data, error: portalError } = await supabase.functions.invoke('create-student-portal', {
            body: { student_id: newStudent.id, email: portalEmail, password: portalPassword },
          });
          if (portalError) {
            let msg = portalError.message;
            try { const body = await (portalError as any).context?.json(); if (body?.error) msg = body.error; } catch {}
            throw new Error(msg);
          }
          if (data?.error) throw new Error(data.error);

          onPortalCreated({
            name: form.full_name,
            email: portalEmail,
            password: portalPassword,
            phone: form.phone || undefined,
          });
        }
      }

      setOpen(false);
      resetForm();
      onStudentSaved();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar alumno');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)} className="h-11 rounded-xl bg-emerald-500 px-5 font-semibold text-slate-950 hover:bg-emerald-400">
          <Plus className="mr-2 h-4 w-4" /> Nuevo alumno
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto border-border/80 bg-card p-0">
        <DialogHeader className="border-b border-border/70 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">{editing ? 'Editar alumno' : 'Registrar nuevo alumno'}</DialogTitle>
              <p className="mt-1 text-sm text-muted-foreground">Datos personales, membresía, RFID y acceso al portal.</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 px-6 py-5">
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <UserRound className="h-4 w-4 text-emerald-400" /> Datos personales
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Nombre completo *</Label>
                <Input className="mt-1.5 h-11 rounded-xl" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div>
                <Label>DNI *</Label>
                <Input className="mt-1.5 h-11 rounded-xl" value={form.dni} onChange={e => setForm({ ...form, dni: e.target.value })} placeholder="Ej: 38123456" maxLength={10} />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input className="mt-1.5 h-11 rounded-xl" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input className="mt-1.5 h-11 rounded-xl" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>Edad</Label>
                <Input className="mt-1.5 h-11 rounded-xl" type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
              </div>
              <div>
                <Label>Peso (kg)</Label>
                <Input className="mt-1.5 h-11 rounded-xl" type="number" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} />
              </div>
              <div>
                <Label>Altura (cm)</Label>
                <Input className="mt-1.5 h-11 rounded-xl" type="number" value={form.height} onChange={e => setForm({ ...form, height: e.target.value })} />
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-border/70 pt-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Dumbbell className="h-4 w-4 text-emerald-400" /> Membresía y entrenamiento
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Objetivo de entrenamiento</Label>
                <Input className="mt-1.5 h-11 rounded-xl" value={form.training_goal} onChange={e => setForm({ ...form, training_goal: e.target.value })} placeholder="Ej: hipertrofia, descenso de peso, rehabilitación..." />
              </div>
              <div>
                <Label>Fecha de inscripción</Label>
                <Input className="mt-1.5 h-11 rounded-xl" type="date" value={form.enrollment_date} onChange={e => setForm({ ...form, enrollment_date: e.target.value })} />
              </div>
              <div>
                <Label>Día de vencimiento</Label>
                <Input className="mt-1.5 h-11 rounded-xl" type="number" min="1" max="31" value={form.due_day} onChange={e => setForm({ ...form, due_day: e.target.value })} />
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as any })}>
                  <SelectTrigger className="mt-1.5 h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                    <SelectItem value="overdue">Moroso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>RFID UID</Label>
                <div className="relative mt-1.5">
                  <Fingerprint className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="h-11 rounded-xl pl-10" value={form.rfid_uid} onChange={e => setForm({ ...form, rfid_uid: e.target.value })} placeholder="A1B2C3D4" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label>Observaciones</Label>
                <Textarea className="mt-1.5 min-h-24 rounded-xl" value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} />
              </div>
            </div>
          </section>

          {!editing && (
            <section className="space-y-4 border-t border-border/70 pt-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CreditCard className="h-4 w-4 text-emerald-400" /> Alta inicial
              </div>
              <div className="grid gap-3">
                <label htmlFor="first-payment" className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/70 bg-background/40 p-4 transition-colors hover:border-emerald-500/30">
                  <Checkbox id="first-payment" checked={firstPayment} onCheckedChange={(value) => setFirstPayment(!!value)} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Registrar primera cuota como pagada</p>
                    <p className="mt-1 text-xs text-muted-foreground">Se crea el primer pago y el próximo vencimiento queda a 30 días.</p>
                  </div>
                </label>

                <label htmlFor="create-portal" className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/70 bg-background/40 p-4 transition-colors hover:border-emerald-500/30">
                  <Checkbox id="create-portal" checked={createPortal} onCheckedChange={(value) => {
                    setCreatePortal(!!value);
                    if (value) { setPortalEmail(form.email || ''); setPortalPassword(generatePassword()); }
                  }} className="mt-0.5" />
                  <div>
                    <p className="flex items-center gap-2 text-sm font-medium text-foreground"><KeyRound className="h-4 w-4 text-emerald-400" /> Crear acceso al portal</p>
                    <p className="mt-1 text-xs text-muted-foreground">El alumno podrá consultar rutinas, alimentación y estado de membresía.</p>
                  </div>
                </label>
              </div>

              {createPortal && (
                <div className="grid gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 sm:grid-cols-2">
                  <div>
                    <Label>Email de acceso *</Label>
                    <Input className="mt-1.5 h-11 rounded-xl" type="email" value={portalEmail} onChange={e => setPortalEmail(e.target.value)} placeholder="alumno@email.com" />
                  </div>
                  <div>
                    <Label>Contraseña temporal</Label>
                    <div className="mt-1.5 flex gap-2">
                      <Input className="h-11 rounded-xl" value={portalPassword} onChange={e => setPortalPassword(e.target.value)} />
                      <Button type="button" variant="outline" className="h-11 rounded-xl px-3" onClick={() => setPortalPassword(generatePassword())} title="Generar nueva">🎲</Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground sm:col-span-2">El alumno deberá cambiar su contraseña en el primer inicio de sesión.</p>
                </div>
              )}
            </section>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border/70 bg-background/30 px-6 py-4">
          <Button variant="ghost" className="rounded-xl" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={loading || !form.full_name || !form.dni}
            className="rounded-xl bg-emerald-500 px-5 font-semibold text-slate-950 hover:bg-emerald-400"
          >
            {loading ? 'Guardando...' : editing ? 'Guardar cambios' : 'Registrar alumno'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudentFormDialog;
