import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserCheck, Copy, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

export interface StudentCredentials {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

interface CredentialsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credentials: StudentCredentials | null;
}

const CredentialsModal: React.FC<CredentialsModalProps> = ({ open, onOpenChange, credentials }) => {
  const handleCopy = () => {
    if (!credentials) return;
    const text = `Credenciales del portal\nAlumno: ${credentials.name}\nEmail: ${credentials.email}\nContraseña: ${credentials.password}`;
    navigator.clipboard.writeText(text);
    toast.success('Credenciales copiadas');
  };

  const handleWhatsApp = () => {
    if (!credentials?.phone) { toast.error('El alumno no tiene teléfono'); return; }
    const phone = credentials.phone.replace(/\D/g, '');
    const msg = `Hola ${credentials.name}, te creamos acceso al portal del gimnasio 💪\n\n📧 Email: ${credentials.email}\n🔑 Contraseña: ${credentials.password}\n\nAl ingresar por primera vez vas a tener que cambiar tu contraseña.\n\n¡Nos vemos en el gym!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-success">
            <UserCheck className="h-5 w-5" /> Credenciales del portal
          </DialogTitle>
        </DialogHeader>
        {credentials && (
          <div className="space-y-4 mt-2">
            <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Alumno</span>
                <span className="font-medium text-foreground">{credentials.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium text-foreground">{credentials.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Contraseña</span>
                <span className="font-mono font-bold text-foreground text-base">{credentials.password}</span>
              </div>
            </div>
            <p className="text-xs text-warning font-medium">
              Copiá las credenciales ahora — no se van a mostrar de nuevo.
            </p>
            <p className="text-xs text-muted-foreground">
              El alumno deberá cambiar su contraseña en el primer inicio de sesión.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-2" /> Copiar
              </Button>
              <Button className="flex-1" onClick={handleWhatsApp} disabled={!credentials.phone}>
                <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CredentialsModal;
