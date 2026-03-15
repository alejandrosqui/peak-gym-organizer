import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dumbbell, Apple } from 'lucide-react';
import { toast } from 'sonner';
import type { Student, Routine, NutritionPlan } from '@/types/gym';

const NONE = '__none__';

interface AssignmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  gymId: string | null;
  onSaved: () => void;
}

const AssignmentsDialog: React.FC<AssignmentsDialogProps> = ({
  open, onOpenChange, student, gymId, onSaved,
}) => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [plans, setPlans] = useState<NutritionPlan[]>([]);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>(NONE);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(NONE);
  const [originalRoutineId, setOriginalRoutineId] = useState<string>(NONE);
  const [originalPlanId, setOriginalPlanId] = useState<string>(NONE);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && student && gymId) fetchData();
  }, [open, student, gymId]);

  const fetchData = async () => {
    setLoading(true);
    const [routinesRes, plansRes, currentRoutineRes, currentPlanRes] = await Promise.all([
      supabase.from('routines').select('id, name, goal, level, days_per_week, description, gym_id, created_at, updated_at').eq('gym_id', gymId).order('name'),
      supabase.from('nutrition_plans').select('id, name, goal, estimated_calories, daily_protein, suggested_meals, suggested_supplements, description, gym_id, created_at, updated_at').eq('gym_id', gymId).order('name'),
      supabase.from('student_routines').select('routine_id').eq('student_id', student!.id).maybeSingle(),
      supabase.from('student_nutrition_plans').select('nutrition_plan_id').eq('student_id', student!.id).maybeSingle(),
    ]);

    setRoutines((routinesRes.data || []) as Routine[]);
    setPlans((plansRes.data || []) as NutritionPlan[]);

    const routineId = (currentRoutineRes.data as any)?.routine_id || NONE;
    const planId = (currentPlanRes.data as any)?.nutrition_plan_id || NONE;

    setSelectedRoutineId(routineId);
    setOriginalRoutineId(routineId);
    setSelectedPlanId(planId);
    setOriginalPlanId(planId);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!student) return;
    setSaving(true);
    try {
      // Handle routine assignment
      if (selectedRoutineId !== originalRoutineId) {
        if (selectedRoutineId === NONE) {
          await supabase.from('student_routines').delete().eq('student_id', student.id);
        } else {
          const { error } = await supabase.from('student_routines')
            .upsert({ student_id: student.id, routine_id: selectedRoutineId }, { onConflict: 'student_id' });
          if (error) throw error;
        }
      }

      // Handle nutrition plan assignment
      if (selectedPlanId !== originalPlanId) {
        if (selectedPlanId === NONE) {
          await supabase.from('student_nutrition_plans').delete().eq('student_id', student.id);
        } else {
          const { error } = await supabase.from('student_nutrition_plans')
            .upsert({ student_id: student.id, nutrition_plan_id: selectedPlanId }, { onConflict: 'student_id' });
          if (error) throw error;
        }
      }

      toast.success('Asignaciones guardadas');
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar asignaciones');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = selectedRoutineId !== originalRoutineId || selectedPlanId !== originalPlanId;

  const goalLabels: Record<string, string> = {
    muscle_gain: 'Masa Muscular',
    fat_loss: 'Pérdida de Grasa',
    maintenance: 'Mantenimiento',
    beginner: 'Principiante',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Asignaciones — {student?.full_name}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Cargando...</div>
        ) : (
          <div className="space-y-6 mt-2">

            {/* Routine */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <Dumbbell className="h-4 w-4 text-primary" /> Rutina
              </Label>
              <Select value={selectedRoutineId} onValueChange={setSelectedRoutineId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin rutina asignada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>
                    <span className="text-muted-foreground">Sin rutina</span>
                  </SelectItem>
                  {routines.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      <span className="font-medium">{r.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {goalLabels[r.goal] || r.goal} · {r.days_per_week}d/sem
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {routines.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No hay rutinas creadas. Creá una en la sección Rutinas.
                </p>
              )}
            </div>

            {/* Nutrition plan */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <Apple className="h-4 w-4 text-primary" /> Plan Alimentario
              </Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin plan asignado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>
                    <span className="text-muted-foreground">Sin plan</span>
                  </SelectItem>
                  {plans.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="font-medium">{p.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {goalLabels[p.goal] || p.goal}
                        {p.estimated_calories ? ` · ${p.estimated_calories} kcal` : ''}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {plans.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No hay planes creados. Creá uno en la sección Alimentación.
                </p>
              )}
            </div>

            <Button
              onClick={handleSave}
              className="w-full"
              disabled={!hasChanges || saving}
            >
              {saving ? 'Guardando...' : 'Guardar asignaciones'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AssignmentsDialog;
