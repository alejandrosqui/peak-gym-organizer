import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, TrendingUp, Calendar } from 'lucide-react';

interface GymRow {
  id: string; name: string; created_at: string;
  owner_email: string; student_count: number;
}

const SuperAdmin: React.FC = () => {
  const [gyms, setGyms] = useState<GymRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: gymsData, error: gymsError } = await supabase
          .from('gyms' as any).select('id, name, created_at').order('created_at', { ascending: false });
        if (gymsError) throw gymsError;
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles' as any).select('gym_id, user_id').eq('role', 'owner');
        if (rolesError) throw rolesError;
        const { data: studentData, error: studentError } = await supabase
          .from('user_roles' as any).select('gym_id').eq('role', 'student');
        if (studentError) throw studentError;
        const studentCount: Record<string, number> = {};
        (studentData as any[]).forEach((r: any) => { studentCount[r.gym_id] = (studentCount[r.gym_id] || 0) + 1; });
        const ownerByGym: Record<string, string> = {};
        (rolesData as any[]).forEach((r: any) => { ownerByGym[r.gym_id] = r.user_id; });
        const ownerUserIds = [...new Set((rolesData as any[]).map((r: any) => r.user_id))];
        const emailMap: Record<string, string> = {};
        for (const userId of ownerUserIds) {
          const { data: emailData } = await supabase.rpc('get_user_email' as any, { _user_id: userId });
          if (emailData) emailMap[userId] = emailData;
        }
        setGyms((gymsData as any[]).map((g: any) => ({
          id: g.id, name: g.name, created_at: g.created_at,
          owner_email: emailMap[ownerByGym[g.id]] || '—',
          student_count: studentCount[g.id] || 0,
        })));
      } catch (err: any) { setError(err.message || 'Error'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const totalStudents = gyms.reduce((acc, g) => acc + g.student_count, 0);
  const activeGyms = gyms.filter(g => g.student_count > 0).length;
  const fmt = (iso: string) => new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando...</div>;
  if (error) return <div className="p-6 bg-destructive/10 text-destructive rounded-lg p-4"><p>{error}</p><p className="text-sm mt-1 text-muted-foreground">Revisar políticas RLS para rol admin.</p></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel Superadmin</h1>
        <p className="text-muted-foreground text-sm mt-1">Vista global de todos los gimnasios en GymHub</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Gimnasios</CardTitle><Building2 className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><p className="text-3xl font-bold">{gyms.length}</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Alumnos totales</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><p className="text-3xl font-bold">{totalStudents}</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Gyms activos</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><p className="text-3xl font-bold">{activeGyms}</p><p className="text-xs text-muted-foreground">con al menos 1 alumno</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Gimnasios registrados</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nombre</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Owner</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Alumnos</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Registrado</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Estado</th>
              </tr></thead>
              <tbody>{gyms.map((gym, i) => (
                <tr key={gym.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                  <td className="py-3 px-4 font-medium">{gym.name}</td>
                  <td className="py-3 px-4 text-muted-foreground truncate max-w-[200px]">{gym.owner_email}</td>
                  <td className="py-3 px-4 text-center font-semibold">{gym.student_count}</td>
                  <td className="py-3 px-4 text-muted-foreground"><span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmt(gym.created_at)}</span></td>
                  <td className="py-3 px-4 text-center"><Badge variant={gym.student_count > 0 ? 'default' : 'secondary'}>{gym.student_count > 0 ? 'Activo' : 'Sin alumnos'}</Badge></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdmin;
