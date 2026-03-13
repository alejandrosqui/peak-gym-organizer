import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Routine } from '@/types/gym';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Dumbbell, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

const emptyRoutine = { name: '', goal: 'muscle_gain', level: 'beginner', days_per_week: '3', description: '' };
const emptyExercise = { exercise_name: '', sets: '3', reps: '12', rest_seconds: '60', observations: '' };

const Routines: React.FC = () => {
  const { isOwner, gymId } = useAuth();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Routine | null>(null);
  const [form, setForm] = useState(emptyRoutine);
  const [exercises, setExercises] = useState<typeof emptyExercise[]>([{ ...emptyExercise }]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { fetchRoutines(); }, []);

  const fetchRoutines = async () => {
    const { data } = await supabase.from('routines').select('*, routine_exercises(*)').order('name');
    setRoutines((data || []).map((r: any) => ({ ...r, exercises: r.routine_exercises || [] })));
    setLoading(false);
  };

  const handleSave = async () => {
    if (editing) {
      await supabase.from('routines').update({
        name: form.name, goal: form.goal, level: form.level,
        days_per_week: Number(form.days_per_week), description: form.description || null,
      }).eq('id', editing.id);
      await supabase.from('routine_exercises').delete().eq('routine_id', editing.id);
      if (exercises.filter(e => e.exercise_name).length > 0) {
        await supabase.from('routine_exercises').insert(
          exercises.filter(e => e.exercise_name).map((e, i) => ({
            routine_id: editing.id, exercise_name: e.exercise_name,
            sets: Number(e.sets), reps: e.reps, rest_seconds: Number(e.rest_seconds),
            sort_order: i, observations: e.observations || null,
          }))
        );
      }
      toast.success('Rutina actualizada');
    } else {
      const { data } = await supabase.from('routines').insert({
        name: form.name, goal: form.goal, level: form.level,
        days_per_week: Number(form.days_per_week), description: form.description || null,
        gym_id: gymId,
      } as any).select().single();
      if (data && exercises.filter(e => e.exercise_name).length > 0) {
        await supabase.from('routine_exercises').insert(
          exercises.filter(e => e.exercise_name).map((e, i) => ({
            routine_id: data.id, exercise_name: e.exercise_name,
            sets: Number(e.sets), reps: e.reps, rest_seconds: Number(e.rest_seconds),
            sort_order: i, observations: e.observations || null,
          }))
        );
      }
      toast.success('Rutina creada');
    }
    resetForm(); fetchRoutines();
  };

  const handleEdit = (routine: Routine) => {
    setEditing(routine);
    setForm({ name: routine.name, goal: routine.goal, level: routine.level, days_per_week: routine.days_per_week.toString(), description: routine.description || '' });
    setExercises(routine.exercises?.length ? routine.exercises.map(e => ({
      exercise_name: e.exercise_name, sets: e.sets.toString(), reps: e.reps,
      rest_seconds: e.rest_seconds.toString(), observations: e.observations || '',
    })) : [{ ...emptyExercise }]);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta rutina?')) return;
    await supabase.from('routines').delete().eq('id', id);
    toast.success('Rutina eliminada'); fetchRoutines();
  };

  const resetForm = () => { setDialogOpen(false); setEditing(null); setForm(emptyRoutine); setExercises([{ ...emptyExercise }]); };
  const addExercise = () => setExercises([...exercises, { ...emptyExercise }]);
  const removeExercise = (i: number) => setExercises(exercises.filter((_, idx) => idx !== i));
  const updateExercise = (i: number, field: string, value: string) => { const updated = [...exercises]; (updated[i] as any)[field] = value; setExercises(updated); };

  const goalLabels: Record<string, string> = { muscle_gain: 'Masa Muscular', fat_loss: 'Pérdida de Grasa', maintenance: 'Mantenimiento', beginner: 'Principiante' };
  const levelLabels: Record<string, string> = { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado' };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-foreground">Biblioteca de Rutinas</h1>
        <Dialog open={dialogOpen} onOpenChange={o => { if (!o) resetForm(); else setDialogOpen(true); }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Nueva Rutina</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? 'Editar Rutina' : 'Nueva Rutina'}</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Nombre *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div>
                  <Label>Objetivo</Label>
                  <Select value={form.goal} onValueChange={v => setForm({ ...form, goal: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="muscle_gain">Masa Muscular</SelectItem>
                      <SelectItem value="fat_loss">Pérdida de Grasa</SelectItem>
                      <SelectItem value="maintenance">Mantenimiento</SelectItem>
                      <SelectItem value="beginner">Principiante</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nivel</Label>
                  <Select value={form.level} onValueChange={v => setForm({ ...form, level: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Principiante</SelectItem>
                      <SelectItem value="intermediate">Intermedio</SelectItem>
                      <SelectItem value="advanced">Avanzado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Días/semana</Label><Input type="number" min="1" max="7" value={form.days_per_week} onChange={e => setForm({ ...form, days_per_week: e.target.value })} /></div>
                <div><Label>Descripción</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base font-semibold">Ejercicios</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addExercise}><Plus className="h-3 w-3 mr-1" />Agregar</Button>
                </div>
                <div className="space-y-3">
                  {exercises.map((ex, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg bg-muted/50">
                      <div className="col-span-12 sm:col-span-4"><Label className="text-xs">Ejercicio</Label><Input value={ex.exercise_name} onChange={e => updateExercise(i, 'exercise_name', e.target.value)} placeholder="Nombre" /></div>
                      <div className="col-span-3 sm:col-span-2"><Label className="text-xs">Series</Label><Input type="number" value={ex.sets} onChange={e => updateExercise(i, 'sets', e.target.value)} /></div>
                      <div className="col-span-3 sm:col-span-2"><Label className="text-xs">Reps</Label><Input value={ex.reps} onChange={e => updateExercise(i, 'reps', e.target.value)} /></div>
                      <div className="col-span-3 sm:col-span-2"><Label className="text-xs">Descanso (s)</Label><Input type="number" value={ex.rest_seconds} onChange={e => updateExercise(i, 'rest_seconds', e.target.value)} /></div>
                      <div className="col-span-3 sm:col-span-2 flex justify-end">
                        {exercises.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removeExercise(i)} className="hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <Button onClick={handleSave} className="w-full mt-4" disabled={!form.name}>{editing ? 'Guardar Cambios' : 'Crear Rutina'}</Button>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Cargando...</div>
      ) : routines.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><Dumbbell className="h-12 w-12 mx-auto mb-4 opacity-30" /><p>No hay rutinas creadas aún</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {routines.map(routine => (
            <Card key={routine.id} className="border shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{routine.name}</CardTitle>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{goalLabels[routine.goal] || routine.goal}</Badge>
                      <Badge variant="secondary" className="text-xs">{levelLabels[routine.level]}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(routine)}><Edit className="h-4 w-4" /></Button>
                    {isOwner && <Button variant="ghost" size="icon" onClick={() => handleDelete(routine.id)} className="hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">{routine.days_per_week} días/semana</p>
                {routine.description && <p className="text-sm text-muted-foreground mb-3">{routine.description}</p>}
                <Button variant="ghost" size="sm" onClick={() => setExpandedId(expandedId === routine.id ? null : routine.id)} className="w-full justify-between">
                  <span>{routine.exercises?.length || 0} ejercicios</span>
                  {expandedId === routine.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                {expandedId === routine.id && routine.exercises && (
                  <div className="mt-2 space-y-1">
                    {routine.exercises.sort((a, b) => a.sort_order - b.sort_order).map(ex => (
                      <div key={ex.id} className="text-sm p-2 rounded bg-muted/50 flex justify-between">
                        <span className="font-medium">{ex.exercise_name}</span>
                        <span className="text-muted-foreground">{ex.sets}x{ex.reps} · {ex.rest_seconds}s</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Routines;
