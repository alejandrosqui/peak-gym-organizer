import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Student } from '@/types/gym';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Edit, Trash2, AlertTriangle, UserCheck, UserX, KeyRound, MessageCircle, RefreshCw, Dumbbell } from 'lucide-react';
import { toast } from 'sonner';
import { getStudentRowClass } from '@/lib/dateUtils';
import StudentFormDialog from '@/components/students/StudentFormDialog';
import PortalAccessDialog from '@/components/students/PortalAccessDialog';
import ResetPasswordDialog from '@/components/students/ResetPasswordDialog';
import CredentialsModal, { type StudentCredentials } from '@/components/students/CredentialsModal';
import AssignmentsDialog from '@/components/students/AssignmentsDialog';

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
    const [studentsRes, routineRes, planRes, settingsRes] = await Promise.all([
      supabase.from('students').select('*').eq('gym_id', gymId).order('full_name'),
      supabase.from('student_routines').select('student_id, routines(name)'),
      supabase.from('student_nutrition_plans').select('student_id, nutrition_plans(name)'),
      supabase.from('gym_settings').select('value').eq('key', 'payment_link').eq('gym_id', gymId).single(),
    ]);
    setPaymentLink(settingsRes.data?.value || '');

    const routineMap = new Map((routineRes.data || []).map((r: any) => [r.student_id, r.routines?.name]));
    const planMap = new Map((planRes.data || []).map((p: any) => [p.student_id, p.nutrition_plans?.name]));

    const enriched = (studentsRes.data || []).map(s => ({
      ...s,
      routine_name: routineMap.get(s.id) || null,
      nutrition_plan_name: planMap.get(s.id) || null,
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

  const filtered = useMemo(() => students.filter(s => {
    const term = debouncedSearch.toLowerCase();
    const matchSearch = s.full_name.toLowerCase().includes(term)
      || (s.email?.toLowerCase().includes(term));
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchSearch && matchStatus;
  }), [students, debouncedSearch, filterStatus]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-foreground">Gestión de Alumnos</h1>
        <StudentFormDialog
          editing={editing}
          gymId={gymId}
          onStudentSaved={() => { setEditing(null); fetchStudents(); }}
          onPortalCreated={handlePortalCreated}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
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
              <TableRow key={student.id} className={getStudentRowClass(student.status, student.due_day)}>
                <TableCell className="font-medium">{student.full_name}</TableCell>
                <TableCell className="hidden md:table-cell">{student.phone || '-'}</TableCell>
                <TableCell className="hidden lg:table-cell">{student.training_goal || '-'}</TableCell>
                <TableCell>Día {student.due_day}</TableCell>
                <TableCell>{statusBadge(student.status)}</TableCell>
                <TableCell>{portalBadge(student)}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  {student.routine_name || (
                    <span className="flex items-center gap-1 text-warning text-sm">
                      <AlertTriangle className="h-3 w-3" /> Sin rutina
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {student.phone && (
                      <Button
                        variant="ghost" size="icon"
                        title="Enviar recordatorio por WhatsApp"
                        className="text-success hover:text-success"
                        onClick={() => {
                          const phone = student.phone!.replace(/\D/g, '');
                          const linkSection = paymentLink ? `\n👉 ${paymentLink}` : '';
                          const msg = `Hola ${student.full_name}, te recordamos que tu cuota del gimnasio vence el día ${student.due_day} de cada mes.\n\nPodés pagar de estas maneras:\n1️⃣ En recepción del gimnasio\n2️⃣ Por transferencia\n3️⃣ Con el link de pago${linkSection}\n\n¡Gracias!`;
                          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                        }}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    )}
                    {!student.user_id && isStaffOrOwner && (
                      <Button
                        variant="ghost" size="icon"
                        title="Crear acceso al portal"
                        onClick={() => { setPortalTarget(student); setPortalDialogOpen(true); }}
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                    )}
                    {student.user_id && isStaffOrOwner && (
                      <Button
                        variant="ghost" size="icon"
                        title="Regenerar contraseña"
                        onClick={() => { setResetTarget(student); setResetDialogOpen(true); }}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                    {isStaffOrOwner && (
                      <Button
                        variant="ghost" size="icon"
                        title="Asignar rutina / plan alimentario"
                        onClick={() => { setAssignTarget(student); setAssignDialogOpen(true); }}
                      >
                        <Dumbbell className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setEditing(student)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    {isOwner && (
                      <Button
                        variant="ghost" size="icon"
                        className="hover:text-destructive"
                        onClick={() => handleDelete(student.id)}
                      >
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
