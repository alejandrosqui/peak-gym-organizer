import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dumbbell, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const RegisterGym: React.FC = () => {
  const navigate = useNavigate();
  const [gymName, setGymName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('register-gym', {
        body: { gym_name: gymName, email, password },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      toast.success('¡Gimnasio creado! Ya podés iniciar sesión.');
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Error al registrar el gimnasio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 gym-gradient rounded-2xl flex items-center justify-center mb-4">
            <Dumbbell className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Registrar Gimnasio</h1>
          <p className="text-muted-foreground text-sm">Creá tu cuenta y empezá a gestionar tu gym</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gymName">Nombre del gimnasio</Label>
              <Input id="gymName" value={gymName} onChange={e => setGymName(e.target.value)} placeholder="Ej: Power Gym" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email del dueño</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : 'Crear gimnasio'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              ¿Ya tenés cuenta?{' '}
              <a href="/login" className="text-primary hover:underline font-medium">Iniciar sesión</a>
            </p>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-muted">
            <p className="text-xs text-muted-foreground text-center">
              <strong>Plan Free:</strong> Hasta 25 alumnos · <strong>Plan Pro:</strong> Ilimitado
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterGym;
