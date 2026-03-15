import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import type { Student } from '@/types/gym';
import type { StudentCredentials } from './CredentialsModal';
import { generatePassword } from '@/lib/passwordUtils';

interface PortalAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  onPortalCreated: (credentials: StudentCredentials) => void;
  onSuccess: () => void;
}

const PortalAccessDialog: React.FC<PortalAccessDialogProps> = ({
  open, onOpenChange, student, onPortalCreated, onSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && student) {
      setEmail(student.email || '');
      setPassword(generatePassword());
    }
    onOpenChange(isOpen);
  };

  const handleConfirm = async () => {
    if (!student || !email || !password) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-student-portal', {
        body: { student_id: student.id, email, password },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      onPortalCreated({ name: student.full_name, email, password, phone: student.phone || undefined });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Error al crear portal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" /> Crear acceso al portal
          </DialogTitle>
        </DialogHeader>
        {student && (
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Crear acceso para <strong className="text-foreground">{student.full_name}</strong>
            </p>
            <div>
              <Label>Email de acceso *</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Contraseña temporal</Label>
              <div className="flex gap-1">
                <Input value={password} onChange={e => setPassword(e.target.value)} />
                <Button variant="outline" size="icon" onClick={() => setPassword(generatePassword())} title="Generar nueva">🎲</Button>
              </div>
            </div>
            <Button onClick={handleConfirm} className="w-full" disabled={!email || !password || loading}>
              {loading ? 'Creando...' : 'Crear acceso'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PortalAccessDialog;
