import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import type { Student } from '@/types/gym';
import type { StudentCredentials } from './CredentialsModal';
import { generatePassword } from '@/lib/passwordUtils';

const emptyForm = {
  full_name: '', phone: '', email: '', age: '', weight: '', height: '',
  training_goal: '', enrollment_date: new Date().toISOString().split('T')[0],
  due_day: '1', status: 'active', observations: '',
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
      });
      setOpen(true);
    }
  }, [editing]);

  const resetForm = () => {
    setForm(emptyForm);
    setCreatePortal(false);
    setPortalEmail('');
    setPortalPassword('');
  };

  const handleSave = async () => {
    if (!form.full_name) return;
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
            toast.error('Error al crear alumno');
          }
          return;
        }

        toast.success('Alumno creado');

        if (createPortal && portalEmail && portalPassword && newStudent) {
          const { data, error: portalError } = await supabase.functions.invoke('create-student-portal', {
            body: { student_id: newStudent.id, email: portalEmail, password: portalPassword },
          });
          if (portalError) throw new Error(portalError.message);
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
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nuevo Alumno</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Alumno' : 'Nuevo Alumno'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="col-span-2">
            <Label>Nombre completo *</Label>
            <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div><Label>Teléfono</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Edad</Label><Input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} /></div>
          <div><Label>Peso (kg)</Label><Input type="number" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} /></div>
          <div><Label>Altura (cm)</Label><Input type="number" value={form.height} onChange={e => setForm({ ...form, height: e.target.value })} /></div>
          <div><Label>Día vencimiento cuota</Label><Input type="number" min="1" max="31" value={form.due_day} onChange={e => setForm({ ...form, due_day: e.target.value })} /></div>
          <div className="col-span-2">
            <Label>Objetivo de entrenamiento</Label>
            <Input value={form.training_goal} onChange={e => setForm({ ...form, training_goal: e.target.value })} />
          </div>
          <div><Label>Fecha de inscripción</Label><Input type="date" value={form.enrollment_date} onChange={e => setForm({ ...form, enrollment_date: e.target.value })} /></div>
          <div>
            <Label>Estado</Label>
            <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
                <SelectItem value="overdue">Moroso</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Observaciones</Label>
            <Textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} />
          </div>

          {!editing && (
            <div className="col-span-2 border-t border-border pt-3 mt-1">
              <div className="flex items-center gap-2 mb-3">
                <Checkbox
                  id="create-portal"
                  checked={createPortal}
                  onCheckedChange={(v) => {
                    setCreatePortal(!!v);
                    if (v) { setPortalEmail(form.email || ''); setPortalPassword(generatePassword()); }
                  }}
                />
                <Label htmlFor="create-portal" className="cursor-pointer font-medium">
                  <KeyRound className="h-4 w-4 inline mr-1" />
                  Crear acceso al portal del alumno
                </Label>
              </div>
              {createPortal && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-md bg-muted/50 border border-border">
                  <div>
                    <Label>Email de acceso *</Label>
                    <Input type="email" value={portalEmail} onChange={e => setPortalEmail(e.target.value)} placeholder="alumno@email.com" />
                  </div>
                  <div>
                    <Label>Contraseña temporal</Label>
                    <div className="flex gap-1">
                      <Input value={portalPassword} onChange={e => setPortalPassword(e.target.value)} />
                      <Button type="button" variant="outline" size="icon" onClick={() => setPortalPassword(generatePassword())} title="Generar nueva">🎲</Button>
                    </div>
                  </div>
                  <p className="col-span-2 text-xs text-muted-foreground">
                    El alumno deberá cambiar su contraseña en el primer inicio de sesión.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        <Button onClick={handleSave} className="w-full mt-4" disabled={!form.full_name || loading}>
          {editing ? 'Guardar Cambios' : createPortal ? 'Crear Alumno + Portal' : 'Crear Alumno'}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default StudentFormDialog;
