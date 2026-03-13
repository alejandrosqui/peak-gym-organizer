import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, Link } from 'lucide-react';
import { toast } from 'sonner';

const Settings: React.FC = () => {
  const [paymentLink, setPaymentLink] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('gym_settings').select('value').eq('key', 'payment_link').single()
      .then(({ data }) => { setPaymentLink(data?.value || ''); setLoading(false); });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('gym_settings')
      .update({ value: paymentLink, updated_at: new Date().toISOString() })
      .eq('key', 'payment_link');
    setSaving(false);
    if (error) { toast.error('Error al guardar'); return; }
    toast.success('Configuración guardada');
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Cargando...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Configuración</h1>

      <Card className="max-w-xl">
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
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
