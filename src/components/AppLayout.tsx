import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import { LayoutDashboard, Users, CreditCard, Dumbbell, Apple, Settings, LogOut, Menu, User, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ownerNav = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Alumnos', url: '/students', icon: Users },
  { title: 'Cuotas y Pagos', url: '/payments', icon: CreditCard },
  { title: 'Rutinas', url: '/routines', icon: Dumbbell },
  { title: 'Alimentación', url: '/nutrition', icon: Apple },
];

const managerNav = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Alumnos', url: '/students', icon: Users },
  { title: 'Cuotas y Pagos', url: '/payments', icon: CreditCard },
  { title: 'Rutinas', url: '/routines', icon: Dumbbell },
  { title: 'Alimentación', url: '/nutrition', icon: Apple },
];

const studentNav = [
  { title: 'Mi Panel', url: '/my-portal', icon: User },
];

const adminItems = [
  { title: 'Usuarios', url: '/users', icon: Settings },
  { title: 'Configuración', url: '/settings', icon: Wrench },
];

function AppSidebarContent() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { role, signOut, user, isOwner, isStaffOrOwner, isStudent, gymName } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = isStudent ? studentNav : isOwner ? ownerNav : managerNav;
  const roleLabel = isOwner ? 'Dueño' : isStudent ? 'Alumno' : 'Encargado';

  return (
    <Sidebar collapsible="icon" className="sidebar-gradient border-r-0">
      <SidebarContent className="flex flex-col h-full">
        <div className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 gym-gradient rounded-lg flex items-center justify-center flex-shrink-0">
            <Dumbbell className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && <span className="font-bold text-lg text-sidebar-accent-foreground truncate">{gymName || 'GymManager'}</span>}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted text-xs uppercase tracking-wider">
            {!collapsed && 'Menú Principal'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="text-sidebar-foreground hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isOwner && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-muted text-xs uppercase tracking-wider">
              {!collapsed && 'Administración'}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map(item => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} end className="text-sidebar-foreground hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <div className="mt-auto p-4 border-t border-sidebar-border">
          {!collapsed && (
            <div className="mb-3">
              <p className="text-sm text-sidebar-accent-foreground truncate">{user?.email}</p>
              <p className="text-xs text-sidebar-muted">{roleLabel}</p>
            </div>
          )}
          <Button variant="ghost" size={collapsed ? 'icon' : 'default'} onClick={handleSignOut} className="w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive">
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Cerrar Sesión</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SidebarProvider>
    <div className="min-h-screen flex w-full">
      <AppSidebarContent />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center border-b bg-card px-4 sticky top-0 z-10">
          <SidebarTrigger className="mr-4"><Menu className="h-5 w-5" /></SidebarTrigger>
          <h2 className="font-semibold text-foreground">Sistema de Gestión</h2>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  </SidebarProvider>
);

export default AppLayout;
