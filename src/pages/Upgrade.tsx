import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Users, MessageCircle, BarChart3, Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const features = [
  { icon: Users, label: 'Alumnos ilimitados', free: '25 máx.', pro: 'Ilimitados' },
  { icon: MessageCircle, label: 'Recordatorios WhatsApp', free: 'Básico', pro: 'Completo' },
  { icon: Shield, label: 'Portal del alumno', free: 'Limitado', pro: 'Completo' },
  { icon: BarChart3, label: 'Reportes y estadísticas', free: '—', pro: 'Incluido' },
];

const Upgrade: React.FC = () => {
  const { gymId } = useAuth();
  const navigate = useNavigate();
  const [paymentLink, setPaymentLink] = useState('');
  const [currentPlan, setCurrentPlan] = useState('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!gymId) return;
      const [gymRes, settingsRes] = await Promise.all([
        supabase.from('gyms').select('plan').eq('id', gymId).single(),
        supabase.from('gym_settings').select('value').eq('key', 'payment_link').single(),
      ]);
      setCurrentPlan((gymRes.data as any)?.plan || 'free');
      setPaymentLink(settingsRes.data?.value || '');
      setLoading(false);
    };
    fetchData();
  }, [gymId]);

  const handleSubscribe = () => {
    if (paymentLink) {
      window.open(paymentLink, '_blank');
    } else {
      toast.info('Configurá tu link de pago en Ajustes para activar suscripciones.');
      navigate('/settings');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Cargando...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" /> Volver
      </Button>

      <div className="text-center mb-10">
        <Crown className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Actualizá tu plan
        </h1>
        <p className="text-muted-foreground text-lg">
          Desbloqueá todo el potencial de tu gimnasio con el plan Pro.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Free plan */}
        <Card className={`relative ${currentPlan === 'free' ? 'border-primary/40' : ''}`}>
          {currentPlan === 'free' && (
            <Badge className="absolute -top-3 left-4 bg-muted text-muted-foreground border border-border">
              Tu plan actual
            </Badge>
          )}
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl text-foreground">Free</CardTitle>
            <div className="mt-2">
              <span className="text-4xl font-extrabold text-foreground">$0</span>
              <span className="text-muted-foreground ml-1">/ mes</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {features.map((f) => (
                <li key={f.label} className="flex items-center gap-3 text-sm">
                  <f.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-foreground flex-1">{f.label}</span>
                  <span className="text-muted-foreground font-medium">{f.free}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Pro plan */}
        <Card className="relative border-2 border-primary shadow-lg">
          <Badge className="absolute -top-3 left-4 bg-primary text-primary-foreground">
            Recomendado
          </Badge>
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl text-foreground">Pro</CardTitle>
            <div className="mt-2">
              <span className="text-4xl font-extrabold text-foreground">$19</span>
              <span className="text-muted-foreground ml-1">USD / mes</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <ul className="space-y-3">
              {features.map((f) => (
                <li key={f.label} className="flex items-center gap-3 text-sm">
                  <Check className="h-4 w-4 text-success shrink-0" />
                  <span className="text-foreground flex-1">{f.label}</span>
                  <span className="font-semibold text-foreground">{f.pro}</span>
                </li>
              ))}
            </ul>

            {currentPlan === 'free' ? (
              <Button onClick={handleSubscribe} className="w-full" size="lg">
                <Crown className="h-4 w-4 mr-2" /> Suscribirse
              </Button>
            ) : (
              <Button disabled className="w-full" size="lg" variant="outline">
                Ya tenés este plan
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Upgrade;
