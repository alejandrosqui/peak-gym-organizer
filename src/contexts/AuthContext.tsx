import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from '@/types/gym';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isOwner: boolean;
  isManager: boolean;
  isStudent: boolean;
  isStaffOrOwner: boolean;
  studentId: string | null;
  gymId: string | null;
  gymName: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [gymId, setGymId] = useState<string | null>(null);
  const [gymName, setGymName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId: string) => {
    const [roleRes, gymRes] = await Promise.all([
      supabase.rpc('get_user_role', { _user_id: userId }),
      supabase.rpc('get_gym_id_for_user', { _user_id: userId }),
    ]);

    const userRole = roleRes.data as AppRole | null;
    setRole(userRole);

    const userGymId = gymRes.data as string | null;
    setGymId(userGymId);

    if (userGymId) {
      const { data: gym } = await supabase.from('gyms' as any).select('name').eq('id', userGymId).single();
      setGymName((gym as any)?.name || null);
    }

    if (userRole === 'student') {
      const { data: sid } = await supabase.rpc('get_student_id_for_user', { _user_id: userId });
      setStudentId(sid as string | null);
    } else {
      setStudentId(null);
    }
  };

  useEffect(() => {
    let initialSessionHandled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Avoid duplicate fetch when both getSession and onAuthStateChange fire
          if (!initialSessionHandled) {
            initialSessionHandled = true;
            setTimeout(() => fetchRole(session.user.id), 0);
          } else {
            setTimeout(() => fetchRole(session.user.id), 0);
          }
        } else {
          setRole(null);
          setStudentId(null);
          setGymId(null);
          setGymName(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!initialSessionHandled) {
        initialSessionHandled = true;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchRole(session.user.id);
        }
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setStudentId(null);
    setGymId(null);
    setGymName(null);
  };

  const isOwner = role === 'owner' || role === 'admin';
  const isManager = role === 'manager' || role === 'staff';
  const isStudent = role === 'student';
  const isStaffOrOwner = isOwner || isManager;

  return (
    <AuthContext.Provider value={{
      user, session, role, loading, signIn, signOut,
      isOwner, isManager, isStudent, isStaffOrOwner, studentId,
      gymId, gymName,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
