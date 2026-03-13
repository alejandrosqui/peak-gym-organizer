import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AppRole } from '@/types/gym';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

interface UserItem { id: string; role: AppRole; }

const roleLabels: Record<string, string> = {
  owner: 'Dueño', manager: 'Encargado', student: 'Alumno', admin: 'Dueño', staff: 'Encargado',
};

const UserManagement: React.FC = () => {
  const { isOwner, gymId } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', role: 'manager' as AppRole });

  useEffect(() => { if (isOwner && gymId) fetchUsers(); }, [isOwner, gymId]);

  const fetchUsers = async () => {
    if (!gymId) { setLoading(false); return; }
    const { data } = await supabase.from('user_roles').select('user_id, role').eq('gym_id', gymId);
    if (data) setUsers(data.map(d => ({ id: d.user_id, role: d.role as AppRole })));
    setLoading(false);
  };

  if (!isOwner) return <Navigate to="/dashboard" replace />;

  const handleCreateUser = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-staff-user', {
        body: { email: form.email, password: form.password, role: form.role, gym_id: gymId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast.success('Usuario creado');
    } catch (err: any) {
      toast.error(err.message || 'Error al crear usuario');
      return;
    }
    setDialogOpen(false); setForm({ email: '', password: '', role: 'manager' }); fetchUsers();
  };

  const handleUpdateRole = async (userId: string, newRole: AppRole) => {
    await supabase.from('user_roles').update({ role: newRole }).eq('user_id', userId);
    toast.success('Rol actualizado'); fetchUsers();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-foreground">Gestión de Usuarios</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Nuevo Usuario</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Crear Usuario</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-4">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Contraseña</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
              <div>
                <Label>Rol</Label>
                <Select value={form.role} onValueChange={v => setForm({ ...form, role: v as AppRole })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Encargado</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleCreateUser} className="w-full mt-4" disabled={!form.email || !form.password}>Crear Usuario</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-auto bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>ID de Usuario</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead className="text-right">Cambiar Rol</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No hay usuarios</TableCell></TableRow>
            ) : users.map(user => (
              <TableRow key={user.id} className="table-row-striped">
                <TableCell className="font-mono text-sm">{user.id.substring(0, 8)}...</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'owner' || user.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                    <Shield className="h-3 w-3 mr-1" />{roleLabels[user.role] || user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Select value={user.role} onValueChange={v => handleUpdateRole(user.id, v as AppRole)}>
                    <SelectTrigger className="w-36 inline-flex"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Dueño</SelectItem>
                      <SelectItem value="manager">Encargado</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default UserManagement;
