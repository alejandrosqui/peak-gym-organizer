import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { NutritionPlan } from '@/types/gym';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Apple } from 'lucide-react';
import { toast } from 'sonner';

const emptyPlan = {
  name: '', goal: 'muscle_gain', estimated_calories: '', daily_protein: '',
  suggested_meals: '', suggested_supplements: '', description: '',
};

const NutritionPlans: React.FC = () => {
  const { isAdmin } = useAuth();
  const [plans, setPlans] = useState<NutritionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NutritionPlan | null>(null);
  const [form, setForm] = useState(emptyPlan);

  useEffect(() => { fetchPlans(); }, []);

  const fetchPlans = async () => {
    const { data } = await supabase.from('nutrition_plans').select('*').order('name');
    setPlans(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    const payload = {
      name: form.name, goal: form.goal,
      estimated_calories: form.estimated_calories ? Number(form.estimated_calories) : null,
      daily_protein: form.daily_protein || null,
      suggested_meals: form.suggested_meals || null,
      suggested_supplements: form.suggested_supplements || null,
      description: form.description || null,
    };
    if (editing) {
      await supabase.from('nutrition_plans').update(payload).eq('id', editing.id);
      toast.success('Plan actualizado');
    } else {
      await supabase.from('nutrition_plans').insert(payload);
      toast.success('Plan creado');
    }
    resetForm();
    fetchPlans();
  };

  const handleEdit = (plan: NutritionPlan) => {
    setEditing(plan);
    setForm({
      name: plan.name, goal: plan.goal,
      estimated_calories: plan.estimated_calories?.toString() || '',
      daily_protein: plan.daily_protein || '',
      suggested_meals: plan.suggested_meals || '',
      suggested_supplements: plan.suggested_supplements || '',
      description: plan.description || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este plan?')) return;
    await supabase.from('nutrition_plans').delete().eq('id', id);
    toast.success('Plan eliminado');
    fetchPlans();
  };

  const resetForm = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyPlan);
  };

  const goalLabels: Record<string, string> = {
    muscle_gain: 'Masa Muscular', fat_loss: 'Pérdida de Grasa', maintenance: 'Mantenimiento',
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planes de Alimentación</h1>
          <p className="text-sm text-muted-foreground mt-1">Orientativo — no reemplaza la consulta con un nutricionista</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={o => { if (!o) resetForm(); else setDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nuevo Plan</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? 'Editar Plan' : 'Nuevo Plan'}</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-4">
              <div>
                <Label>Nombre *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Objetivo</Label>
                <Select value={form.goal} onValueChange={v => setForm({ ...form, goal: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="muscle_gain">Masa Muscular</SelectItem>
                    <SelectItem value="fat_loss">Pérdida de Grasa</SelectItem>
                    <SelectItem value="maintenance">Mantenimiento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Calorías estimadas</Label>
                  <Input type="number" value={form.estimated_calories} onChange={e => setForm({ ...form, estimated_calories: e.target.value })} />
                </div>
                <div>
                  <Label>Proteína diaria</Label>
                  <Input value={form.daily_protein} onChange={e => setForm({ ...form, daily_protein: e.target.value })} placeholder="Ej: 120g" />
                </div>
              </div>
              <div>
                <Label>Comidas sugeridas</Label>
                <Textarea value={form.suggested_meals} onChange={e => setForm({ ...form, suggested_meals: e.target.value })} rows={4} />
              </div>
              <div>
                <Label>Suplementos sugeridos</Label>
                <Input value={form.suggested_supplements} onChange={e => setForm({ ...form, suggested_supplements: e.target.value })} />
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
            </div>
            <Button onClick={handleSave} className="w-full mt-4" disabled={!form.name}>
              {editing ? 'Guardar Cambios' : 'Crear Plan'}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Cargando...</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Apple className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No hay planes de alimentación creados aún</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => (
            <Card key={plan.id} className="border shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <Badge variant="outline" className="mt-1 text-xs">{goalLabels[plan.goal] || plan.goal}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(plan)}><Edit className="h-4 w-4" /></Button>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(plan.id)} className="hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {plan.estimated_calories && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Calorías</span>
                    <span className="font-medium">{plan.estimated_calories} kcal</span>
                  </div>
                )}
                {plan.daily_protein && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Proteína</span>
                    <span className="font-medium">{plan.daily_protein}</span>
                  </div>
                )}
                {plan.suggested_meals && (
                  <div className="text-sm mt-2">
                    <p className="text-muted-foreground font-medium mb-1">Comidas:</p>
                    <p className="text-foreground whitespace-pre-line text-xs">{plan.suggested_meals}</p>
                  </div>
                )}
                {plan.suggested_supplements && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Suplementos: </span>
                    <span>{plan.suggested_supplements}</span>
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

export default NutritionPlans;
