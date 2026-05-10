import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { GymSpace, ClassSchedule, StudentClassSubscription, ClassEnrollment } from '@/types/gym';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Users, Clock, MapPin, CheckCircle, XCircle } from 'lucide-react';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAY_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#eab308', '#ec4899'];

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  confirmed:      { label: 'Confirmado',  cls: 'bg-blue-100 text-blue-700' },
  cancelled_early:{ label: 'Canceló',     cls: 'bg-gray-100 text-gray-500' },
  cancelled_late: { label: 'Canceló tarde',cls: 'bg-red-100 text-red-600' },
  waitlist:       { label: 'En espera',   cls: 'bg-yellow-100 text-yellow-700' },
  attended:       { label: 'Asistió',     cls: 'bg-green-100 text-green-700' },
  absent:         { label: 'Ausente',     cls: 'bg-red-100 text-red-600' },
  extended:       { label: 'Extendió',    cls: 'bg-purple-100 text-purple-700' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().split('T')[0];
}

function getNextOccurrences(schedule: ClassSchedule, count = 7): string[] {
  const dates: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cur = new Date(today);
  let attempts = 0;
  while (dates.length < count && attempts < 60) {
    if (schedule.days.includes(cur.getDay())) {
      dates.push(cur.toISOString().split('T')[0]);
    }
    cur.setDate(cur.getDate() + 1);
    attempts++;
  }
  return dates;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

interface SpaceFormProps {
  initial?: Partial<GymSpace>;
  onSave: (data: { name: string; description: string; capacity: number }) => Promise<void>;
  onClose: () => void;
}

const SpaceForm: React.FC<SpaceFormProps> = ({ initial, onSave, onClose }) => {
  const [form, setForm] = useState({ name: initial?.name ?? '', description: initial?.description ?? '', capacity: initial?.capacity ?? 20 });
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-3 mt-2">
      <div><Label>Nombre</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Sala CrossFit" /></div>
      <div><Label>Descripción</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Opcional" /></div>
      <div><Label>Capacidad máxima</Label><Input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} /></div>
      <div className="flex gap-2 mt-4">
        <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
        <Button disabled={!form.name || saving} onClick={async () => { setSaving(true); await onSave(form); setSaving(false); }} className="flex-1">
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </div>
  );
};

interface ScheduleFormProps {
  spaces: GymSpace[];
  initial?: Partial<ClassSchedule>;
  onSave: (data: Omit<ClassSchedule, 'id' | 'gym_id' | 'created_at'>) => Promise<void>;
  onClose: () => void;
}

const ScheduleForm: React.FC<ScheduleFormProps> = ({ spaces, initial, onSave, onClose }) => {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    space_id: initial?.space_id ?? '',
    days: initial?.days ?? [],
    start_time: initial?.start_time ?? '09:00',
    end_time: initial?.end_time ?? '10:00',
    max_capacity: initial?.max_capacity ?? 20,
    instructor_name: initial?.instructor_name ?? '',
    color: initial?.color ?? '#f97316',
    is_active: initial?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const toggleDay = (d: number) =>
    setForm(f => ({ ...f, days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d].sort() }));

  return (
    <div className="space-y-3 mt-2">
      <div><Label>Nombre de la clase</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="CrossFit Mañana" /></div>
      <div>
        <Label>Espacio</Label>
        <Select value={form.space_id} onValueChange={v => setForm({ ...form, space_id: v })}>
          <SelectTrigger><SelectValue placeholder="Seleccionar espacio" /></SelectTrigger>
          <SelectContent>
            {spaces.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Días</Label>
        <div className="flex gap-2 mt-1 flex-wrap">
          {DAY_NAMES.map((d, i) => (
            <label key={i} className={`flex items-center gap-1 px-3 py-1 rounded-full border cursor-pointer text-sm transition-colors ${form.days.includes(i) ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}>
              <Checkbox checked={form.days.includes(i)} onCheckedChange={() => toggleDay(i)} className="hidden" />
              {d}
            </label>
          ))}
        </div>
      </div>
      <div className="flex gap-3">
        <div className="flex-1"><Label>Inicio</Label><Input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></div>
        <div className="flex-1"><Label>Fin</Label><Input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></div>
      </div>
      <div className="flex gap-3">
        <div className="flex-1"><Label>Cupos</Label><Input type="number" value={form.max_capacity} onChange={e => setForm({ ...form, max_capacity: Number(e.target.value) })} /></div>
        <div className="flex-1"><Label>Profe</Label><Input value={form.instructor_name} onChange={e => setForm({ ...form, instructor_name: e.target.value })} placeholder="Opcional" /></div>
      </div>
      <div>
        <Label>Color</Label>
        <div className="flex gap-2 mt-1">
          {COLORS.map(c => (
            <button key={c} onClick={() => setForm({ ...form, color: c })}
              className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
        <Button disabled={!form.name || form.days.length === 0 || saving} onClick={async () => { setSaving(true); await onSave(form as any); setSaving(false); }} className="flex-1">
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

const Classes: React.FC = () => {
  const { gymId } = useAuth();
  const [spaces, setSpaces] = useState<GymSpace[]>([]);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [students, setStudents] = useState<{ id: string; full_name: string }[]>([]);
  const [enrollments, setEnrollments] = useState<ClassEnrollment[]>([]);
  const [subscriptions, setSubscriptions] = useState<StudentClassSubscription[]>([]);

  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedSchedule, setSelectedSchedule] = useState<string>('');

  // Dialog states
  const [spaceDialog, setSpaceDialog] = useState<{ open: boolean; editing?: GymSpace }>({ open: false });
  const [scheduleDialog, setScheduleDialog] = useState<{ open: boolean; editing?: ClassSchedule }>({ open: false });
  const [subscribeDialog, setSubscribeDialog] = useState<{ open: boolean; scheduleId: string }>({ open: false, scheduleId: '' });
  const [subForm, setSubForm] = useState({ student_id: '', weekly_limit: 3 });
  const [subSaving, setSubSaving] = useState(false);

  useEffect(() => { if (gymId) fetchAll(); }, [gymId]);

  const fetchAll = async () => {
    setLoading(true);
    const [spacesRes, schedulesRes, studentsRes, enrollmentsRes, subsRes] = await Promise.all([
      supabase.from('gym_spaces').select('*').eq('gym_id', gymId).order('name'),
      supabase.from('class_schedules').select('*, gym_spaces(name)').eq('gym_id', gymId).order('name'),
      supabase.from('students').select('id, full_name').eq('gym_id', gymId).eq('status', 'active').order('full_name'),
      supabase.from('class_enrollments').select('*, students(full_name)').eq('gym_id', gymId).gte('date', getWeekStart(new Date())),
      supabase.from('student_class_subscriptions').select('*, students(full_name), class_schedules(name)').eq('gym_id', gymId).eq('is_active', true),
    ]);
    setSpaces(spacesRes.data || []);
    setSchedules((schedulesRes.data || []).map((s: any) => ({ ...s, space_name: s.gym_spaces?.name || null })));
    setStudents(studentsRes.data || []);
    setEnrollments((enrollmentsRes.data || []).map((e: any) => ({ ...e, student_name: e.students?.full_name || '' })));
    setSubscriptions((subsRes.data || []).map((s: any) => ({ ...s, student_name: s.students?.full_name || '', schedule_name: s.class_schedules?.name || '' })));
    setLoading(false);
  };

  // ── Spaces CRUD ────────────────────────────────────────────────────────────
  const saveSpace = async (data: { name: string; description: string; capacity: number }) => {
    if (spaceDialog.editing) {
      await supabase.from('gym_spaces').update(data).eq('id', spaceDialog.editing.id);
      toast.success('Espacio actualizado');
    } else {
      await supabase.from('gym_spaces').insert({ ...data, gym_id: gymId });
      toast.success('Espacio creado');
    }
    setSpaceDialog({ open: false });
    fetchAll();
  };

  const deleteSpace = async (id: string) => {
    await supabase.from('gym_spaces').delete().eq('id', id);
    toast.success('Espacio eliminado');
    fetchAll();
  };

  // ── Schedules CRUD ─────────────────────────────────────────────────────────
  const saveSchedule = async (data: Omit<ClassSchedule, 'id' | 'gym_id' | 'created_at'>) => {
    const payload = { ...data, space_id: data.space_id || null, gym_id: gymId };
    if (scheduleDialog.editing) {
      await supabase.from('class_schedules').update(payload).eq('id', scheduleDialog.editing.id);
      toast.success('Clase actualizada');
    } else {
      await supabase.from('class_schedules').insert(payload as any);
      toast.success('Clase creada');
    }
    setScheduleDialog({ open: false });
    fetchAll();
  };

  const deleteSchedule = async (id: string) => {
    await supabase.from('class_schedules').delete().eq('id', id);
    toast.success('Clase eliminada');
    fetchAll();
  };

  const toggleScheduleActive = async (s: ClassSchedule) => {
    await supabase.from('class_schedules').update({ is_active: !s.is_active }).eq('id', s.id);
    fetchAll();
  };

  // ── Subscriptions ──────────────────────────────────────────────────────────
  const saveSubscription = async () => {
    if (subSaving) return;
    setSubSaving(true);
    const { error } = await supabase.from('student_class_subscriptions').upsert({
      student_id: subForm.student_id,
      schedule_id: subscribeDialog.scheduleId,
      gym_id: gymId,
      weekly_limit: subForm.weekly_limit,
      is_active: true,
    }, { onConflict: 'student_id,schedule_id' });
    if (error) toast.error('Error al inscribir'); else toast.success('Alumno inscripto');
    setSubSaving(false);
    setSubscribeDialog({ open: false, scheduleId: '' });
    setSubForm({ student_id: '', weekly_limit: 3 });
    fetchAll();
  };

  const removeSubscription = async (id: string) => {
    await supabase.from('student_class_subscriptions').update({ is_active: false }).eq('id', id);
    toast.success('Inscripción removida');
    fetchAll();
  };

  // ── Attendance marking ─────────────────────────────────────────────────────
  const markAttendance = async (enrollmentId: string, attended: boolean) => {
    await supabase.from('class_enrollments').update({ status: attended ? 'attended' : 'absent' }).eq('id', enrollmentId);
    toast.success(attended ? 'Asistencia marcada' : 'Marcado como ausente');
    fetchAll();
  };

  // ── Filtered enrollments for selected date + schedule ──────────────────────
  const scheduleEnrollments = enrollments.filter(
    e => e.date === selectedDate && e.schedule_id === selectedSchedule
  );

  const selectedSched = schedules.find(s => s.id === selectedSchedule);

  // Students subscribed to selected schedule
  const scheduleSubscribers = subscriptions.filter(s => s.schedule_id === selectedSchedule);

  // Enrolled student IDs for quick lookup
  const enrolledStudentIds = new Set(scheduleEnrollments.map(e => e.student_id));

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Clases y Horarios</h1>

      <Tabs defaultValue="schedules">
        <TabsList className="mb-6">
          <TabsTrigger value="schedules">Clases</TabsTrigger>
          <TabsTrigger value="spaces">Espacios</TabsTrigger>
          <TabsTrigger value="attendance">Asistencia del día</TabsTrigger>
        </TabsList>

        {/* ── TAB: Clases ───────────────────────────────────────────────── */}
        <TabsContent value="schedules">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setScheduleDialog({ open: true })}><Plus className="mr-2 h-4 w-4" />Nueva clase</Button>
          </div>

          {loading ? <p className="text-muted-foreground">Cargando...</p> : schedules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="mx-auto h-10 w-10 mb-2 opacity-30" />
              <p>Todavía no hay clases. Creá la primera.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {schedules.map(s => {
                const subs = subscriptions.filter(sub => sub.schedule_id === s.id);
                return (
                  <Card key={s.id} className={`border-l-4 ${!s.is_active ? 'opacity-50' : ''}`} style={{ borderLeftColor: s.color }}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base">{s.name}</CardTitle>
                          {s.space_name && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" />{s.space_name}</p>}
                        </div>
                        <Badge variant="outline" className={s.is_active ? 'text-green-600 border-green-300' : 'text-gray-400'}>
                          {s.is_active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex gap-1 flex-wrap">
                        {s.days.map(d => <span key={d} className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: s.color }}>{DAY_NAMES[d]}</span>)}
                      </div>
                      <p className="text-muted-foreground"><Clock className="inline h-3 w-3 mr-1" />{s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}</p>
                      <p className="text-muted-foreground"><Users className="inline h-3 w-3 mr-1" />{subs.length}/{s.max_capacity} inscriptos</p>
                      {s.instructor_name && <p className="text-muted-foreground">Profe: {s.instructor_name}</p>}
                      <div className="flex gap-1 pt-1 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => { setSubscribeDialog({ open: true, scheduleId: s.id }); setSubForm({ student_id: '', weekly_limit: 3 }); }}>
                          <Plus className="h-3 w-3 mr-1" />Inscribir
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setScheduleDialog({ open: true, editing: s })}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => toggleScheduleActive(s)}>
                          {s.is_active ? <XCircle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteSchedule(s.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Alumnos inscriptos */}
                      {subs.length > 0 && (
                        <div className="pt-2 border-t mt-2 space-y-1">
                          {subs.map(sub => (
                            <div key={sub.id} className="flex items-center justify-between text-xs">
                              <span>{sub.student_name} <span className="text-muted-foreground">({sub.weekly_limit}x/sem)</span></span>
                              <button onClick={() => removeSubscription(sub.id)} className="text-destructive hover:underline">quitar</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── TAB: Espacios ─────────────────────────────────────────────── */}
        <TabsContent value="spaces">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setSpaceDialog({ open: true })}><Plus className="mr-2 h-4 w-4" />Nuevo espacio</Button>
          </div>
          {spaces.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MapPin className="mx-auto h-10 w-10 mb-2 opacity-30" />
              <p>Todavía no hay espacios cargados.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {spaces.map(sp => (
                <Card key={sp.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{sp.name}</CardTitle>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => setSpaceDialog({ open: true, editing: sp })}><Pencil className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteSpace(sp.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-1">
                    {sp.description && <p>{sp.description}</p>}
                    <p><Users className="inline h-3 w-3 mr-1" />Capacidad: {sp.capacity}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── TAB: Asistencia ───────────────────────────────────────────── */}
        <TabsContent value="attendance">
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex-1">
              <Label>Fecha</Label>
              <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
            </div>
            <div className="flex-1">
              <Label>Clase</Label>
              <Select value={selectedSchedule} onValueChange={setSelectedSchedule}>
                <SelectTrigger><SelectValue placeholder="Seleccionar clase" /></SelectTrigger>
                <SelectContent>
                  {schedules.filter(s => s.is_active).map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.start_time.slice(0, 5)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!selectedSchedule ? (
            <p className="text-muted-foreground text-center py-8">Seleccioná una clase para ver la asistencia.</p>
          ) : (
            <div>
              {selectedSched && (
                <div className="mb-4 p-3 rounded-lg bg-muted/40 flex items-center gap-3 flex-wrap">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedSched.color }} />
                  <span className="font-medium">{selectedSched.name}</span>
                  <span className="text-muted-foreground text-sm">{DAY_FULL[new Date(selectedDate + 'T12:00:00').getDay()]} {selectedDate}</span>
                  <span className="text-muted-foreground text-sm">{selectedSched.start_time.slice(0, 5)} – {selectedSched.end_time.slice(0, 5)}</span>
                  <Badge variant="outline">{scheduleEnrollments.filter(e => e.status === 'confirmed' || e.status === 'attended').length}/{selectedSched.max_capacity} cupos</Badge>
                </div>
              )}

              {scheduleEnrollments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No hay confirmaciones para esta clase en esta fecha.</p>
              ) : (
                <div className="border rounded-lg overflow-hidden bg-card">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">Alumno</th>
                        <th className="text-left p-3 font-medium">Estado</th>
                        <th className="text-right p-3 font-medium">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduleEnrollments.map(e => {
                        const st = STATUS_LABEL[e.status] || STATUS_LABEL.confirmed;
                        return (
                          <tr key={e.id} className="border-t">
                            <td className="p-3 font-medium">{e.student_name}</td>
                            <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span></td>
                            <td className="p-3 text-right">
                              {(e.status === 'confirmed' || e.status === 'absent') && (
                                <Button size="sm" variant="outline" onClick={() => markAttendance(e.id, true)} className="text-green-600 mr-1">
                                  <CheckCircle className="h-3 w-3 mr-1" />Asistió
                                </Button>
                              )}
                              {(e.status === 'confirmed' || e.status === 'attended') && (
                                <Button size="sm" variant="outline" onClick={() => markAttendance(e.id, false)} className="text-red-500">
                                  <XCircle className="h-3 w-3 mr-1" />Ausente
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Próximas fechas de esta clase */}
              {selectedSched && (
                <div className="mt-6">
                  <h3 className="font-semibold text-sm mb-3 text-muted-foreground">PRÓXIMAS CLASES DE "{selectedSched.name.toUpperCase()}"</h3>
                  <div className="flex gap-2 flex-wrap">
                    {getNextOccurrences(selectedSched, 7).map(date => {
                      const count = enrollments.filter(e => e.date === date && e.schedule_id === selectedSched.id && (e.status === 'confirmed' || e.status === 'attended')).length;
                      return (
                        <button key={date} onClick={() => setSelectedDate(date)}
                          className={`px-3 py-2 rounded-lg border text-sm transition-colors ${date === selectedDate ? 'border-primary bg-primary/10 font-medium' : 'border-border hover:border-primary/50'}`}>
                          <div>{DAY_NAMES[new Date(date + 'T12:00:00').getDay()]} {date.slice(8)}</div>
                          <div className="text-xs text-muted-foreground">{count}/{selectedSched.max_capacity}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Espacio ────────────────────────────────────────────────── */}
      <Dialog open={spaceDialog.open} onOpenChange={open => setSpaceDialog(s => ({ ...s, open }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>{spaceDialog.editing ? 'Editar espacio' : 'Nuevo espacio'}</DialogTitle></DialogHeader>
          <SpaceForm initial={spaceDialog.editing} onSave={saveSpace} onClose={() => setSpaceDialog({ open: false })} />
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Clase ─────────────────────────────────────────────────── */}
      <Dialog open={scheduleDialog.open} onOpenChange={open => setScheduleDialog(s => ({ ...s, open }))}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{scheduleDialog.editing ? 'Editar clase' : 'Nueva clase'}</DialogTitle></DialogHeader>
          <ScheduleForm spaces={spaces} initial={scheduleDialog.editing} onSave={saveSchedule} onClose={() => setScheduleDialog({ open: false })} />
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Inscribir alumno ───────────────────────────────────────── */}
      <Dialog open={subscribeDialog.open} onOpenChange={open => setSubscribeDialog(s => ({ ...s, open }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Inscribir alumno</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Alumno</Label>
              <Select value={subForm.student_id} onValueChange={v => setSubForm({ ...subForm, student_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar alumno" /></SelectTrigger>
                <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Clases por semana contratadas</Label>
              <Input type="number" min={1} max={7} value={subForm.weekly_limit} onChange={e => setSubForm({ ...subForm, weekly_limit: Number(e.target.value) })} />
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setSubscribeDialog({ open: false, scheduleId: '' })}>Cancelar</Button>
              <Button className="flex-1" disabled={!subForm.student_id || subSaving} onClick={saveSubscription}>
                {subSaving ? 'Guardando...' : 'Inscribir'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Classes;
