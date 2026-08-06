import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { Plus, Edit, Trash2, Apple, Flame, Beef, Sparkles, Leaf } from 'lucide-react';
import { toast } from 'sonner';

const emptyPlan = { name: '', goal: 'muscle_gain', estimated_calories: '', daily_protein: '', suggested_meals: '', suggested_supplements: '', description: '' };

const NutritionPlans: React.FC = () => {
  const { isOwner, gymId } = useAuth();
  const [plans, setPlans] = useState<NutritionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NutritionPlan | null>(null);
  const [form, setForm] = useState(emptyPlan);

  useEffect(() => { if (gymId) fetchPlans(); }, [gymId]);

  const fetchPlans = async () => {
    const { data } = await supabase.from('nutrition_plans').select('*').eq('gym_id', gymId).order('name');
    setPlans(data || []); setLoading(false);
  };

  const handleSave = async () => {
    const payload: any = {
      name: form.name, goal: form.goal,
      estimated_calories: form.estimated_calories ? Number(form.estimated_calories) : null,
      daily_protein: form.daily_protein || null, suggested_meals: form.suggested_meals || null,
      suggested_supplements: form.suggested_supplements || null, description: form.description || null,
    };
    if (editing) { await supabase.from('nutrition_plans').update(payload).eq('id', editing.id); toast.success('Plan actualizado'); }
    else { await supabase.from('nutrition_plans').insert({ ...payload, gym_id: gymId }); toast.success('Plan creado'); }
    resetForm(); fetchPlans();
  };

  const handleEdit = (plan: NutritionPlan) => {
    setEditing(plan);
    setForm({
      name: plan.name, goal: plan.goal, estimated_calories: plan.estimated_calories?.toString() || '',
      daily_protein: plan.daily_protein || '', suggested_meals: plan.suggested_meals || '',
      suggested_supplements: plan.suggested_supplements || '', description: plan.description || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este plan?')) return;
    await supabase.from('nutrition_plans').delete().eq('id', id);
    toast.success('Plan eliminado'); fetchPlans();
  };

  const resetForm = () => { setDialogOpen(false); setEditing(null); setForm(emptyPlan); };
  const goalLabels: Record<string, string> = { muscle_gain: 'Masa Muscular', fat_loss: 'Pérdida de Grasa', maintenance: 'Mantenimiento' };

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[28px] border border-emerald-500/20 bg-gradient-to-br from-lime-500/10 via-card to-card p-6 lg:p-8">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-lime-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-lime-400/20 bg-lime-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-lime-300"><Leaf className="h-3.5 w-3.5" /> Nutrición</div><h1 className="text-3xl font-black tracking-tight text-foreground lg:text-4xl">Planes de alimentación</h1><p className="mt-2 text-sm text-muted-foreground lg:text-base">Biblioteca nutricional clara, visual y lista para asignar.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={o => { if (!o) resetForm(); else setDialogOpen(true); }}>
          <DialogTrigger asChild><Button className="h-11 rounded-xl bg-lime-400 px-5 font-bold text-slate-950 hover:bg-lime-300"><Plus className="mr-2 h-4 w-4" />Nuevo plan</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? 'Editar Plan' : 'Nuevo Plan'}</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-4">
              <div><Label>Nombre *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
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
                <div><Label>Calorías estimadas</Label><Input type="number" value={form.estimated_calories} onChange={e => setForm({ ...form, estimated_calories: e.target.value })} /></div>
                <div><Label>Proteína diaria</Label><Input value={form.daily_protein} onChange={e => setForm({ ...form, daily_protein: e.target.value })} placeholder="Ej: 120g" /></div>
              </div>
              <div><Label>Comidas sugeridas</Label><Textarea value={form.suggested_meals} onChange={e => setForm({ ...form, suggested_meals: e.target.value })} rows={4} /></div>
              <div><Label>Suplementos sugeridos</Label><Input value={form.suggested_supplements} onChange={e => setForm({ ...form, suggested_supplements: e.target.value })} /></div>
              <div><Label>Descripción</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            </div>
            <Button onClick={handleSave} className="w-full mt-4" disabled={!form.name}>{editing ? 'Guardar Cambios' : 'Crear Plan'}</Button>
          </DialogContent>
        </Dialog>
        </div>
      </section>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Cargando...</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><Apple className="h-12 w-12 mx-auto mb-4 opacity-30" /><p>No hay planes de alimentación creados aún</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => (
            <Card key={plan.id} className="group relative overflow-hidden rounded-3xl border-border/70 bg-card/80 shadow-xl shadow-black/10 transition-all duration-300 hover:-translate-y-1 hover:border-lime-400/30">
              <div className="h-1.5 bg-gradient-to-r from-lime-400 via-emerald-400 to-cyan-400" /><CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div><CardTitle className="text-lg">{plan.name}</CardTitle><Badge variant="outline" className="mt-1 text-xs">{goalLabels[plan.goal] || plan.goal}</Badge></div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(plan)}><Edit className="h-4 w-4" /></Button>
                    {isOwner && <Button variant="ghost" size="icon" onClick={() => handleDelete(plan.id)} className="hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {plan.estimated_calories && <div className="rounded-2xl border border-orange-400/15 bg-orange-400/[0.06] p-3"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-300"><Flame className="h-4 w-4" /> Energía diaria</div><div className="mt-1 text-2xl font-black">{plan.estimated_calories}<span className="ml-1 text-sm font-medium text-muted-foreground">kcal</span></div></div>}
                {plan.daily_protein && <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm"><span className="flex items-center gap-2 text-muted-foreground"><Beef className="h-4 w-4 text-rose-300" /> Proteína</span><span className="font-bold">{plan.daily_protein}</span></div>}
                {plan.suggested_meals && <div className="text-sm mt-2"><p className="text-muted-foreground font-medium mb-1">Comidas:</p><p className="text-foreground whitespace-pre-line text-xs">{plan.suggested_meals}</p></div>}
                {plan.suggested_supplements && <div className="text-sm"><span className="text-muted-foreground">Suplementos: </span><span>{plan.suggested_supplements}</span></div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default NutritionPlans;
