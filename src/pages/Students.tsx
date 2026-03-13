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
import { Plus, Search, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const emptyStudent = {
  full_name: '', phone: '', email: '', age: '', weight: '', height: '',
  training_goal: '', enrollment_date: new Date().toISOString().split('T')[0],
  due_day: '1', status: 'active', observations: '',
};

const Students: React.FC = () => {
  const { isAdmin } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState(emptyStudent);

  useEffect(() => { fetchStudents(); }, []);

  const fetchStudents = async () => {
    const { data: studentsData } = await supabase.from('students').select('*').order('full_name');
    const { data: routineData } = await supabase
      .from('student_routines')
      .select('student_id, routines(name)');
    const { data: planData } = await supabase
      .from('student_nutrition_plans')
      .select('student_id, nutrition_plans(name)');

    const routineMap = new Map((routineData || []).map((r: any) => [r.student_id, r.routines?.name]));
    const planMap = new Map((planData || []).map((p: any) => [p.student_id, p.nutrition_plans?.name]));

    const enriched = (studentsData || []).map(s => ({
      ...s,
      routine_name: routineMap.get(s.id) || null,
      nutrition_plan_name: planMap.get(s.id) || null,
    }));

    setStudents(enriched as Student[]);
    setLoading(false);
  };

  const handleSave = async () => {
    const payload = {
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

    if (editing) {
      await supabase.from('students').update(payload).eq('id', editing.id);
      toast.success('Alumno actualizado');
    } else {
      await supabase.from('students').insert(payload);
      toast.success('Alumno creado');
    }
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyStudent);
    fetchStudents();
  };

  const handleEdit = (student: Student) => {
    setEditing(student);
    setForm({
      full_name: student.full_name,
      phone: student.phone || '',
      email: student.email || '',
      age: student.age?.toString() || '',
      weight: student.weight?.toString() || '',
      height: student.height?.toString() || '',
      training_goal: student.training_goal || '',
      enrollment_date: student.enrollment_date,
      due_day: student.due_day.toString(),
      status: student.status,
      observations: student.observations || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este alumno?')) return;
    await supabase.from('students').delete().eq('id', id);
    toast.success('Alumno eliminado');
    fetchStudents();
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

  const filtered = students.filter(s => {
    const matchSearch = s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.email?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-foreground">Gestión de Alumnos</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditing(null); setForm(emptyStudent); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nuevo Alumno</Button>
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
              <div>
                <Label>Teléfono</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>Edad</Label>
                <Input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
              </div>
              <div>
                <Label>Peso (kg)</Label>
                <Input type="number" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} />
              </div>
              <div>
                <Label>Altura (cm)</Label>
                <Input type="number" value={form.height} onChange={e => setForm({ ...form, height: e.target.value })} />
              </div>
              <div>
                <Label>Día vencimiento cuota</Label>
                <Input type="number" min="1" max="31" value={form.due_day} onChange={e => setForm({ ...form, due_day: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Objetivo de entrenamiento</Label>
                <Input value={form.training_goal} onChange={e => setForm({ ...form, training_goal: e.target.value })} />
              </div>
              <div>
                <Label>Fecha de inscripción</Label>
                <Input type="date" value={form.enrollment_date} onChange={e => setForm({ ...form, enrollment_date: e.target.value })} />
              </div>
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
            </div>
            <Button onClick={handleSave} className="w-full mt-4" disabled={!form.full_name}>
              {editing ? 'Guardar Cambios' : 'Crear Alumno'}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
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

      {/* Table */}
      <div className="border rounded-lg overflow-auto bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nombre</TableHead>
              <TableHead className="hidden md:table-cell">Teléfono</TableHead>
              <TableHead className="hidden lg:table-cell">Objetivo</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden lg:table-cell">Rutina</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No hay alumnos</TableCell></TableRow>
            ) : filtered.map(student => (
              <TableRow key={student.id} className={getRowClass(student)}>
                <TableCell className="font-medium">{student.full_name}</TableCell>
                <TableCell className="hidden md:table-cell">{student.phone || '-'}</TableCell>
                <TableCell className="hidden lg:table-cell">{student.training_goal || '-'}</TableCell>
                <TableCell>Día {student.due_day}</TableCell>
                <TableCell>{statusBadge(student.status)}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  {student.routine_name || (
                    <span className="flex items-center gap-1 text-warning text-sm">
                      <AlertTriangle className="h-3 w-3" /> Sin rutina
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(student)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(student.id)} className="hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Students;
