import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Student } from '@/types/gym';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  CalendarClock,
  Dumbbell,
  Edit,
  KeyRound,
  MessageCircle,
  MoreHorizontal,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  Users,
  UserX,
  Utensils,
} from 'lucide-react';
import { toast } from 'sonner';
import StudentFormDialog from '@/components/students/StudentFormDialog';
import PortalAccessDialog from '@/components/students/PortalAccessDialog';
import ResetPasswordDialog from '@/components/students/ResetPasswordDialog';
import CredentialsModal, { type StudentCredentials } from '@/components/students/CredentialsModal';
import AssignmentsDialog from '@/components/students/AssignmentsDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    active: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400',
    inactive: 'border-slate-500/25 bg-slate-500/10 text-slate-400',
    overdue: 'border-red-500/25 bg-red-500/10 text-red-400',
  };
  const labels: Record<string, string> = { active: 'Activo', inactive: 'Inactivo', overdue: 'Moroso' };
  return <Badge variant="outline" className={`${map[status]} font-medium`}>{labels[status]}</Badge>;
};

const initials = (name: string) => name
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map(part => part[0]?.toUpperCase())
  .join('');

const Students: React.FC = () => {
  const { isOwner, isStaffOrOwner, gymId } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [paymentLink, setPaymentLink] = useState('');

  const [editing, setEditing] = useState<Student | null>(null);
  const [portalTarget, setPortalTarget] = useState<Student | null>(null);
  const [portalDialogOpen, setPortalDialogOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<Student | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [credentials, setCredentials] = useState<StudentCredentials | null>(null);
  const [credentialsModalOpen, setCredentialsModalOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Student | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  useEffect(() => { if (gymId) fetchStudents(); }, [gymId]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchStudents = async () => {
    setLoading(true);
    const [studentsRes, routineRes, planRes, settingsRes] = await Promise.all([
      supabase.from('students').select('*').eq('gym_id', gymId).order('full_name'),
      supabase.from('student_routines').select('student_id, routines(name)'),
      supabase.from('student_nutrition_plans').select('student_id, nutrition_plans(name)'),
      supabase.from('gym_settings').select('value').eq('key', 'payment_link').eq('gym_id', gymId).single(),
    ]);

    setPaymentLink(settingsRes.data?.value || '');
    const routineMap = new Map((routineRes.data || []).map((r: any) => [r.student_id, r.routines?.name]));
    const planMap = new Map((planRes.data || []).map((p: any) => [p.student_id, p.nutrition_plans?.name]));
    const enriched = (studentsRes.data || []).map(student => ({
      ...student,
      routine_name: routineMap.get(student.id) || null,
      nutrition_plan_name: planMap.get(student.id) || null,
    }));
    setStudents(enriched as Student[]);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este alumno?')) return;
    await supabase.from('students').delete().eq('id', id);
    toast.success('Alumno eliminado');
    fetchStudents();
  };

  const handlePortalCreated = (creds: StudentCredentials) => {
    setCredentials(creds);
    setCredentialsModalOpen(true);
  };

  const sendWhatsApp = (student: Student) => {
    if (!student.phone) return;
    const phone = student.phone.replace(/\D/g, '');
    const linkSection = paymentLink ? `\n👉 ${paymentLink}` : '';
    const msg = `Hola ${student.full_name}, te recordamos que tu cuota del gimnasio vence el día ${student.due_day} de cada mes.\n\nPodés pagar de estas maneras:\n1️⃣ En recepción del gimnasio\n2️⃣ Por transferencia\n3️⃣ Con el link de pago${linkSection}\n\n¡Gracias!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const filtered = useMemo(() => students.filter(student => {
    const term = debouncedSearch.toLowerCase();
    const matchSearch = student.full_name.toLowerCase().includes(term)
      || student.email?.toLowerCase().includes(term)
      || student.phone?.toLowerCase().includes(term)
      || student.dni?.toLowerCase().includes(term);
    const matchStatus = filterStatus === 'all' || student.status === filterStatus;
    return matchSearch && matchStatus;
  }), [students, debouncedSearch, filterStatus]);

  const metrics = useMemo(() => ({
    total: students.length,
    active: students.filter(student => student.status === 'active').length,
    overdue: students.filter(student => student.status === 'overdue').length,
    withoutRoutine: students.filter(student => !student.routine_name).length,
  }), [students]);

  const metricCards = [
    { label: 'Total de alumnos', value: metrics.total, icon: Users, tone: 'text-slate-200', iconStyle: 'bg-slate-500/10 text-slate-300 border-slate-500/20' },
    { label: 'Membresías activas', value: metrics.active, icon: UserCheck, tone: 'text-emerald-400', iconStyle: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    { label: 'Cuotas vencidas', value: metrics.overdue, icon: AlertTriangle, tone: metrics.overdue ? 'text-red-400' : 'text-slate-200', iconStyle: 'bg-red-500/10 text-red-400 border-red-500/20' },
    { label: 'Sin rutina asignada', value: metrics.withoutRoutine, icon: Dumbbell, tone: metrics.withoutRoutine ? 'text-amber-400' : 'text-slate-200', iconStyle: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  ];

  const actionMenu = (student: Student) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-white/5 hover:text-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {student.phone && (
          <DropdownMenuItem onClick={() => sendWhatsApp(student)}>
            <MessageCircle className="mr-2 h-4 w-4 text-emerald-400" /> Enviar recordatorio
          </DropdownMenuItem>
        )}
        {!student.user_id && isStaffOrOwner && (
          <DropdownMenuItem onClick={() => { setPortalTarget(student); setPortalDialogOpen(true); }}>
            <KeyRound className="mr-2 h-4 w-4" /> Crear acceso al portal
          </DropdownMenuItem>
        )}
        {student.user_id && isStaffOrOwner && (
          <DropdownMenuItem onClick={() => { setResetTarget(student); setResetDialogOpen(true); }}>
            <RefreshCw className="mr-2 h-4 w-4" /> Regenerar contraseña
          </DropdownMenuItem>
        )}
        {isStaffOrOwner && (
          <DropdownMenuItem onClick={() => { setAssignTarget(student); setAssignDialogOpen(true); }}>
            <Dumbbell className="mr-2 h-4 w-4" /> Rutina y alimentación
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => setEditing(student)}>
          <Edit className="mr-2 h-4 w-4" /> Editar alumno
        </DropdownMenuItem>
        {isOwner && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(student.id)}>
              <Trash2 className="mr-2 h-4 w-4" /> Eliminar alumno
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">
            <Users className="h-4 w-4" /> Comunidad
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Alumnos</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Membresías, vencimientos, accesos al portal y asignaciones desde un solo lugar.
          </p>
        </div>
        <StudentFormDialog
          editing={editing}
          gymId={gymId}
          onStudentSaved={() => { setEditing(null); fetchStudents(); }}
          onPortalCreated={handlePortalCreated}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(card => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{card.label}</p>
                  <p className={`mt-2 text-3xl font-bold ${card.tone}`}>{card.value}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${card.iconStyle}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="rounded-2xl border border-border/80 bg-card/80 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col gap-4 border-b border-border/70 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xl">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, DNI, teléfono o email..."
              value={search}
              onChange={event => setSearch(event.target.value)}
              className="h-11 rounded-xl border-border/80 bg-background/60 pl-10"
            />
          </div>
          <div className="flex items-center gap-3">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-11 w-full rounded-xl bg-background/60 sm:w-44">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
                <SelectItem value="overdue">Morosos</SelectItem>
              </SelectContent>
            </Select>
            <div className="hidden rounded-xl border border-border/70 bg-background/50 px-3 py-2 text-sm text-muted-foreground sm:block">
              <span className="font-semibold text-foreground">{filtered.length}</span> resultados
            </div>
          </div>
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <Table>
            <TableHeader>
              <TableRow className="border-border/70 bg-background/30 hover:bg-background/30">
                <TableHead className="h-12 pl-5">Alumno</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Entrenamiento</TableHead>
                <TableHead>Portal</TableHead>
                <TableHead className="w-16 text-right pr-5">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="h-40 text-center text-muted-foreground">Cargando alumnos...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <Users className="mx-auto mb-3 h-9 w-9 text-muted-foreground/50" />
                    <p className="font-medium text-foreground">No encontramos alumnos</p>
                    <p className="mt-1 text-sm text-muted-foreground">Probá con otra búsqueda o cambiá el filtro.</p>
                  </TableCell>
                </TableRow>
              ) : filtered.map(student => (
                <TableRow key={student.id} className="border-border/60 transition-colors hover:bg-white/[0.025]">
                  <TableCell className="py-4 pl-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-sm font-bold text-emerald-400">
                        {initials(student.full_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{student.full_name}</p>
                        <p className="truncate text-xs text-muted-foreground">{student.email || student.phone || `DNI ${student.dni || 'sin registrar'}`}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{statusBadge(student.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarClock className="h-4 w-4 text-muted-foreground" /> Día {student.due_day}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <Dumbbell className="h-3.5 w-3.5 text-emerald-400" />
                        {student.routine_name || <span className="text-amber-400">Sin rutina</span>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Utensils className="h-3.5 w-3.5" />
                        {student.nutrition_plan_name || 'Sin plan alimentario'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {student.user_id ? (
                      <Badge variant="outline" className="border-sky-500/25 bg-sky-500/10 text-sky-400"><UserCheck className="mr-1 h-3 w-3" /> Habilitado</Badge>
                    ) : (
                      <Badge variant="outline" className="border-slate-500/20 bg-slate-500/10 text-slate-400"><UserX className="mr-1 h-3 w-3" /> Sin acceso</Badge>
                    )}
                  </TableCell>
                  <TableCell className="pr-5 text-right">{actionMenu(student)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="divide-y divide-border/60 lg:hidden">
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Cargando alumnos...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <Users className="mx-auto mb-3 h-9 w-9 text-muted-foreground/50" />
              <p className="font-medium text-foreground">No encontramos alumnos</p>
            </div>
          ) : filtered.map(student => (
            <article key={student.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-sm font-bold text-emerald-400">
                  {initials(student.full_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{student.full_name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{student.email || student.phone || `DNI ${student.dni || '-'}`}</p>
                    </div>
                    {actionMenu(student)}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {statusBadge(student.status)}
                    <Badge variant="outline" className="border-border/70 bg-background/40 text-muted-foreground">Vence día {student.due_day}</Badge>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <div className="flex items-center gap-2"><Dumbbell className="h-3.5 w-3.5 text-emerald-400" /> {student.routine_name || 'Sin rutina'}</div>
                    <div className="flex items-center gap-2"><Utensils className="h-3.5 w-3.5" /> {student.nutrition_plan_name || 'Sin plan alimentario'}</div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <PortalAccessDialog
        open={portalDialogOpen}
        onOpenChange={(open) => { setPortalDialogOpen(open); if (!open) setPortalTarget(null); }}
        student={portalTarget}
        onPortalCreated={handlePortalCreated}
        onSuccess={fetchStudents}
      />
      <ResetPasswordDialog
        open={resetDialogOpen}
        onOpenChange={(open) => { setResetDialogOpen(open); if (!open) setResetTarget(null); }}
        student={resetTarget}
        onPortalCreated={handlePortalCreated}
      />
      <CredentialsModal
        open={credentialsModalOpen}
        onOpenChange={(open) => { setCredentialsModalOpen(open); if (!open) setCredentials(null); }}
        credentials={credentials}
      />
      <AssignmentsDialog
        open={assignDialogOpen}
        onOpenChange={(open) => { setAssignDialogOpen(open); if (!open) setAssignTarget(null); }}
        student={assignTarget}
        gymId={gymId}
        onSaved={fetchStudents}
      />
    </div>
  );
};

export default Students;
