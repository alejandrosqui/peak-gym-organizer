import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { Student } from '@/types/gym';
import type { StudentCredentials } from './CredentialsModal';
import { generatePassword } from '@/lib/passwordUtils';

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  onPortalCreated: (credentials: StudentCredentials) => void;
}

const ResetPasswordDialog: React.FC<ResetPasswordDialogProps> = ({
  open, onOpenChange, student, onPortalCreated,
}) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) setPassword(generatePassword());
    onOpenChange(isOpen);
  };

  const handleConfirm = async () => {
    if (!student || !password) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-student-password', {
        body: { student_id: student.id, new_password: password },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      onPortalCreated({
        name: student.full_name,
        email: student.email || '',
        password,
        phone: student.phone || undefined,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Error al regenerar contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" /> Regenerar contraseña
          </DialogTitle>
        </DialogHeader>
        {student && (
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Nueva contraseña para <strong className="text-foreground">{student.full_name}</strong>
            </p>
            <div>
              <Label>Nueva contraseña temporal</Label>
              <div className="flex gap-1">
                <Input value={password} onChange={e => setPassword(e.target.value)} />
                <Button variant="outline" size="icon" onClick={() => setPassword(generatePassword())} title="Generar nueva">🎲</Button>
              </div>
            </div>
            <Button onClick={handleConfirm} className="w-full" disabled={!password || loading}>
              {loading ? 'Regenerando...' : 'Regenerar contraseña'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ResetPasswordDialog;
