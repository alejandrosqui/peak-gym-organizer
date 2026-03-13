import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, Link, Building2 } from 'lucide-react';
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
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Configuración</h1>

      <div className="space-y-6 max-w-xl">
        <Card>
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

        <Card>
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

        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="h-4 w-4 mr-2" /> {saving ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </div>
    </div>
  );
};

export default Settings;
