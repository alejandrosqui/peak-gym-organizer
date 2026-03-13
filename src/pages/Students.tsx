import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Student } from '@/types/gym';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Edit, Trash2, AlertTriangle, UserCheck, UserX, KeyRound, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

const emptyStudent = {
  full_name: '', phone: '', email: '', age: '', weight: '', height: '',
  training_goal: '', enrollment_date: new Date().toISOString().split('T')[0],
  due_day: '1', status: 'active', observations: '',
};

const generatePassword = () => {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const Students: React.FC = () => {
  const { isOwner, isStaffOrOwner } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [portalDialogOpen, setPortalDialogOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<Student | null>(null);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState(emptyStudent);
  const [createPortal, setCreatePortal] = useState(false);
  const [portalEmail, setPortalEmail] = useState('');
  const [portalPassword, setPortalPassword] = useState('');
  const [portalLoading, setPortalLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState('');

  useEffect(() => { fetchStudents(); }, []);

  const fetchStudents = async () => {
    const { data: studentsData } = await supabase.from('students').select('*').order('full_name');
    const { data: routineData } = await supabase.from('student_routines').select('student_id, routines(name)');
    const { data: planData } = await supabase.from('student_nutrition_plans').select('student_id, nutrition_plans(name)');

    const routineMap = new Map((routineData || []).map((r: any) => [r.student_id, r.routines?.name]));
    const planMap = new Map((planData || []).map((p: any) => [p.student_id, p.nutrition_plans?.name]));

    const enriched = (studentsData || []).map(s => ({
      ...s, routine_name: routineMap.get(s.id) || null, nutrition_plan_name: planMap.get(s.id) || null,
    }));
    setStudents(enriched as Student[]);
    setLoading(false);
  };

  const callCreatePortal = async (studentId: string, email: string, password: string) => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-student-portal', {
        body: { student_id: studentId, email, password },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast.success(`Portal creado para ${email}. Contraseña: ${password}`, { duration: 10000 });
      fetchStudents();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Error al crear portal');
      return false;
    } finally {
      setPortalLoading(false);
    }
  };

  const handleSave = async () => {
    const payload = {
      full_name: form.full_name, phone: form.phone || null, email: form.email || null,
      age: form.age ? Number(form.age) : null, weight: form.weight ? Number(form.weight) : null,
      height: form.height ? Number(form.height) : null, training_goal: form.training_goal || null,
      enrollment_date: form.enrollment_date, due_day: Number(form.due_day),
      status: form.status, observations: form.observations || null,
    };

    if (editing) {
      await supabase.from('students').update(payload).eq('id', editing.id);
      toast.success('Alumno actualizado');
    } else {
      const { data: newStudent, error } = await supabase.from('students').insert(payload).select().single();
      if (error) { toast.error('Error al crear alumno'); return; }
      toast.success('Alumno creado');

      if (createPortal && portalEmail && portalPassword && newStudent) {
        await callCreatePortal(newStudent.id, portalEmail, portalPassword);
      }
    }
    setDialogOpen(false); setEditing(null); setForm(emptyStudent);
    setCreatePortal(false); setPortalEmail(''); setPortalPassword('');
    fetchStudents();
  };

  const handleEdit = (student: Student) => {
    setEditing(student);
    setForm({
      full_name: student.full_name, phone: student.phone || '', email: student.email || '',
      age: student.age?.toString() || '', weight: student.weight?.toString() || '',
      height: student.height?.toString() || '', training_goal: student.training_goal || '',
      enrollment_date: student.enrollment_date, due_day: student.due_day.toString(),
      status: student.status, observations: student.observations || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este alumno?')) return;
    await supabase.from('students').delete().eq('id', id);
    toast.success('Alumno eliminado'); fetchStudents();
  };

  const openPortalDialog = (student: Student) => {
    setPortalTarget(student);
    setPortalEmail(student.email || '');
    setPortalPassword(generatePassword());
    setPortalDialogOpen(true);
  };

  const handleCreatePortalAccess = async () => {
    if (!portalTarget || !portalEmail || !portalPassword) return;
    const ok = await callCreatePortal(portalTarget.id, portalEmail, portalPassword);
    if (ok) {
      setPortalDialogOpen(false);
      setPortalTarget(null);
    }
  };

  const getRowClass = (student: Student) => {
    if (student.status === 'overdue') return 'row-danger';
    const today = new Date().getDate();
    const diff = student.due_day - today;
    if (diff >= 0 && diff <= 3 && student.status === 'active') return 'row-warning';
    return 'table-row-striped';
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: 'bg-success/15 text-success border-success/30',
      inactive: 'bg-muted text-muted-foreground border-border',
      overdue: 'bg-destructive/15 text-destructive border-destructive/30',
    };
    const labels: Record<string, string> = { active: 'Activo', inactive: 'Inactivo', overdue: 'Moroso' };
    return <Badge variant="outline" className={map[status]}>{labels[status]}</Badge>;
  };

  const portalBadge = (student: Student) => {
    if (student.user_id) {
      return (
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
          <UserCheck className="h-3 w-3 mr-1" /> Activo
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
        <UserX className="h-3 w-3 mr-1" /> Sin acceso
      </Badge>
    );
  };

  const filtered = students.filter(s => {
    const matchSearch = s.full_name.toLowerCase().includes(search.toLowerCase()) || (s.email?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const resetDialog = () => {
    setEditing(null); setForm(emptyStudent);
    setCreatePortal(false); setPortalEmail(''); setPortalPassword('');
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-foreground">Gestión de Alumnos</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetDialog(); }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Nuevo Alumno</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? 'Editar Alumno' : 'Nuevo Alumno'}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="col-span-2"><Label>Nombre completo *</Label><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><Label>Teléfono</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Edad</Label><Input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} /></div>
              <div><Label>Peso (kg)</Label><Input type="number" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} /></div>
              <div><Label>Altura (cm)</Label><Input type="number" value={form.height} onChange={e => setForm({ ...form, height: e.target.value })} /></div>
              <div><Label>Día vencimiento cuota</Label><Input type="number" min="1" max="31" value={form.due_day} onChange={e => setForm({ ...form, due_day: e.target.value })} /></div>
              <div className="col-span-2"><Label>Objetivo de entrenamiento</Label><Input value={form.training_goal} onChange={e => setForm({ ...form, training_goal: e.target.value })} /></div>
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
              <div className="col-span-2"><Label>Observaciones</Label><Textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} /></div>

              {/* Portal access section - only for new students */}
              {!editing && (
                <div className="col-span-2 border-t border-border pt-3 mt-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Checkbox
                      id="create-portal"
                      checked={createPortal}
                      onCheckedChange={(v) => {
                        setCreatePortal(!!v);
                        if (v) {
                          setPortalEmail(form.email || '');
                          setPortalPassword(generatePassword());
                        }
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
                          <Button type="button" variant="outline" size="icon" onClick={() => setPortalPassword(generatePassword())} title="Generar nueva">
                            🎲
                          </Button>
                        </div>
                      </div>
                      <p className="col-span-2 text-xs text-muted-foreground">
                        El alumno podrá cambiar su contraseña después de iniciar sesión.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <Button onClick={handleSave} className="w-full mt-4" disabled={!form.full_name || portalLoading}>
              {editing ? 'Guardar Cambios' : createPortal ? 'Crear Alumno + Portal' : 'Crear Alumno'}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
            <SelectItem value="overdue">Morosos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-auto bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nombre</TableHead>
              <TableHead className="hidden md:table-cell">Teléfono</TableHead>
              <TableHead className="hidden lg:table-cell">Objetivo</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Portal</TableHead>
              <TableHead className="hidden lg:table-cell">Rutina</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No hay alumnos</TableCell></TableRow>
            ) : filtered.map(student => (
              <TableRow key={student.id} className={getRowClass(student)}>
                <TableCell className="font-medium">{student.full_name}</TableCell>
                <TableCell className="hidden md:table-cell">{student.phone || '-'}</TableCell>
                <TableCell className="hidden lg:table-cell">{student.training_goal || '-'}</TableCell>
                <TableCell>Día {student.due_day}</TableCell>
                <TableCell>{statusBadge(student.status)}</TableCell>
                <TableCell>{portalBadge(student)}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  {student.routine_name || (<span className="flex items-center gap-1 text-warning text-sm"><AlertTriangle className="h-3 w-3" /> Sin rutina</span>)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {!student.user_id && isStaffOrOwner && (
                      <Button variant="ghost" size="icon" onClick={() => openPortalDialog(student)} title="Crear acceso al portal">
                        <KeyRound className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(student)}><Edit className="h-4 w-4" /></Button>
                    {isOwner && (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(student.id)} className="hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Standalone portal creation dialog */}
      <Dialog open={portalDialogOpen} onOpenChange={(open) => { setPortalDialogOpen(open); if (!open) setPortalTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> Crear acceso al portal
            </DialogTitle>
          </DialogHeader>
          {portalTarget && (
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">
                Crear acceso para <strong className="text-foreground">{portalTarget.full_name}</strong>
              </p>
              <div>
                <Label>Email de acceso *</Label>
                <Input type="email" value={portalEmail} onChange={e => setPortalEmail(e.target.value)} />
              </div>
              <div>
                <Label>Contraseña temporal</Label>
                <div className="flex gap-1">
                  <Input value={portalPassword} onChange={e => setPortalPassword(e.target.value)} />
                  <Button variant="outline" size="icon" onClick={() => setPortalPassword(generatePassword())} title="Generar nueva">
                    🎲
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">El alumno podrá cambiarla después.</p>
              </div>
              <Button
                onClick={handleCreatePortalAccess}
                className="w-full"
                disabled={!portalEmail || !portalPassword || portalLoading}
              >
                {portalLoading ? 'Creando...' : 'Crear acceso'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Students;
