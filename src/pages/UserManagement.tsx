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
import { Plus, Shield, UsersRound, Crown, UserCog, LockKeyhole } from 'lucide-react';
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
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[28px] border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-card to-card p-6 lg:p-8"><div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl"/><div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300"><LockKeyhole className="h-3.5 w-3.5"/> Accesos</div><h1 className="text-3xl font-black tracking-tight lg:text-4xl">Equipo y permisos</h1><p className="mt-2 text-sm text-muted-foreground lg:text-base">Administrá quién entra, qué puede hacer y con qué responsabilidad.</p></div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button className="h-11 rounded-xl bg-cyan-400 px-5 font-bold text-slate-950 hover:bg-cyan-300"><Plus className="mr-2 h-4 w-4" />Nuevo usuario</Button></DialogTrigger>
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
        </div></section>

      <div className="grid gap-4 md:grid-cols-3"><div className="rounded-2xl border border-border/70 bg-card/70 p-5"><UsersRound className="h-5 w-5 text-cyan-300"/><div className="mt-4 text-3xl font-black">{users.length}</div><p className="text-sm text-muted-foreground">Usuarios del equipo</p></div><div className="rounded-2xl border border-border/70 bg-card/70 p-5"><Crown className="h-5 w-5 text-amber-300"/><div className="mt-4 text-3xl font-black">{users.filter(u => u.role === 'owner' || u.role === 'admin').length}</div><p className="text-sm text-muted-foreground">Propietarios</p></div><div className="rounded-2xl border border-border/70 bg-card/70 p-5"><UserCog className="h-5 w-5 text-emerald-300"/><div className="mt-4 text-3xl font-black">{users.filter(u => u.role === 'manager' || u.role === 'staff').length}</div><p className="text-sm text-muted-foreground">Gestión operativa</p></div></div>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/70 shadow-2xl shadow-black/10">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
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
              <TableRow key={user.id} className="border-border/60 transition-colors hover:bg-cyan-400/[0.04]">
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
