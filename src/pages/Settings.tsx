import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, Link, Building2, Sparkles, CreditCard, ShieldCheck, Gauge } from 'lucide-react';
import { toast } from 'sonner';

const Settings: React.FC = () => {
  const { gymId } = useAuth();
  const [gymName, setGymName] = useState('');
  const [plan, setPlan] = useState('free');
  const [maxStudents, setMaxStudents] = useState(25);
  const [paymentLink, setPaymentLink] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!gymId) return;
      const [gymRes, settingsRes] = await Promise.all([
        supabase.from('gyms' as any).select('name, plan, max_students').eq('id', gymId).single(),
        supabase.from('gym_settings').select('value').eq('key', 'payment_link').single(),
      ]);
      const gym = gymRes.data as any;
      if (gym) {
        setGymName(gym.name || '');
        setPlan(gym.plan || 'free');
        setMaxStudents(gym.max_students || 25);
      }
      setPaymentLink(settingsRes.data?.value || '');
      setLoading(false);
    };
    fetchSettings();
  }, [gymId]);

  const handleSave = async () => {
    if (!gymId) return;
    setSaving(true);

    await Promise.all([
      supabase.from('gyms' as any).update({ name: gymName } as any).eq('id', gymId),
      supabase.from('gym_settings')
        .upsert({ key: 'payment_link', value: paymentLink, gym_id: gymId } as any, { onConflict: 'key,gym_id' })
    ]);

    setSaving(false);
    toast.success('Configuración guardada');
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[28px] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card to-card p-6 lg:p-8"><div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl"/><div className="relative"><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300"><Sparkles className="h-3.5 w-3.5"/> Personalización</div><h1 className="text-3xl font-black tracking-tight lg:text-4xl">Configuración del gimnasio</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground lg:text-base">Tu marca, tus cobros y los datos principales del negocio en un solo lugar.</p></div></section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <div className="space-y-6">
        <Card className="rounded-3xl border-border/70 bg-card/80 shadow-xl shadow-black/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Datos del Gimnasio</CardTitle>
            <CardDescription>Configuración general de tu gimnasio.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nombre del gimnasio</Label>
              <Input value={gymName} onChange={e => setGymName(e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
              <Label>Plan actual:</Label>
              <Badge variant={plan === 'pro' ? 'default' : 'secondary'} className="uppercase">
                {plan}
              </Badge>
              <span className="text-sm text-muted-foreground">
                (máx. {maxStudents === -1 ? '∞' : maxStudents} alumnos)
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/70 bg-card/80 shadow-xl shadow-black/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Link className="h-5 w-5" /> Link de Pago</CardTitle>
            <CardDescription>Este link se incluirá automáticamente en los recordatorios de WhatsApp.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>URL del link de pago (MercadoPago, transferencia, etc.)</Label>
              <Input
                value={paymentLink}
                onChange={e => setPaymentLink(e.target.value)}
                placeholder="https://mpago.la/tu-link"
                type="url"
              />
            </div>
          </CardContent>
        </Card>

        </div>
        <aside className="space-y-4">
          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.06] p-6">
            <Gauge className="h-6 w-6 text-emerald-300" />
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Plan actual</p>
            <div className="mt-2 text-3xl font-black uppercase">{plan}</div>
            <p className="mt-2 text-sm text-muted-foreground">Capacidad para {maxStudents === -1 ? 'alumnos ilimitados' : `${maxStudents} alumnos`}.</p>
          </div>
          <div className="rounded-3xl border border-border/70 bg-card/70 p-6">
            <ShieldCheck className="h-6 w-6 text-cyan-300" />
            <h3 className="mt-4 font-bold">Configuración segura</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Los cambios se guardan únicamente para este gimnasio y respetan el aislamiento multi-tenant.</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="h-12 w-full rounded-xl bg-emerald-500 font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400">
            <Save className="mr-2 h-4 w-4" /> {saving ? 'Guardando...' : 'Guardar configuración'}
          </Button>
        </aside>
      </div>
    </div>
  );
};

export default Settings;
