import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import { LayoutDashboard, Users, CreditCard, Dumbbell, Apple, Settings, LogOut, Menu, User, Wrench, CalendarDays, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ownerNav = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Alumnos', url: '/students', icon: Users },
  { title: 'Cuotas y Pagos', url: '/payments', icon: CreditCard },
  { title: 'Clases', url: '/classes', icon: CalendarDays },
  { title: 'Rutinas', url: '/routines', icon: Dumbbell },
  { title: 'Alimentación', url: '/nutrition', icon: Apple },
];

const managerNav = ownerNav;
const studentNav = [{ title: 'Mi Panel', url: '/my-portal', icon: User }];
const adminItems = [
  { title: 'Usuarios', url: '/users', icon: Settings },
  { title: 'Configuración', url: '/settings', icon: Wrench },
];

function AppSidebarContent() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { role, signOut, user, isOwner, isStudent, gymName } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = isStudent ? studentNav : isOwner ? ownerNav : managerNav;
  const roleLabel = isOwner ? 'Dueño' : isStudent ? 'Alumno' : role === 'admin' ? 'Administrador' : 'Encargado';

  const renderItem = (item: typeof ownerNav[number]) => (
    <SidebarMenuItem key={item.url}>
      <SidebarMenuButton asChild tooltip={item.title}>
        <NavLink
          to={item.url}
          end
          className="group h-10 rounded-xl px-3 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold shadow-[inset_3px_0_0_hsl(var(--sidebar-primary))]"
        >
          <item.icon className="mr-2 h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-105" />
          {!collapsed && <span>{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon" className="sidebar-gradient border-r border-sidebar-border">
      <SidebarContent className="flex h-full flex-col">
        <div className="flex h-[72px] items-center gap-3 border-b border-sidebar-border px-4">
          <div className="gym-gradient flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl shadow-lg shadow-emerald-950/30">
            <Dumbbell className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-sidebar-accent-foreground">GymHub</p>
              <p className="truncate text-xs text-sidebar-muted">{gymName || 'Gestión inteligente'}</p>
            </div>
          )}
        </div>

        <SidebarGroup className="pt-5">
          <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-muted">
            {!collapsed && 'Operación'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">{navItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isOwner && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-muted">
              {!collapsed && 'Administración'}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">{adminItems.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {role === 'admin' && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-muted">
              {!collapsed && 'Superadmin'}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Panel Global">
                    <NavLink to="/superadmin" end className="h-10 rounded-xl px-3 text-sidebar-foreground hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold">
                      <ShieldCheck className="mr-2 h-[18px] w-[18px]" />
                      {!collapsed && <span>Panel Global</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <div className="mt-auto border-t border-sidebar-border p-3">
          {!collapsed && (
            <div className="mb-3 rounded-xl border border-sidebar-border bg-white/[0.025] p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-sidebar-primary">
                <Sparkles className="h-3.5 w-3.5" /> Sesión activa
              </div>
              <p className="truncate text-sm text-sidebar-accent-foreground">{user?.email}</p>
              <p className="mt-0.5 text-xs text-sidebar-muted">{roleLabel}</p>
            </div>
          )}
          <Button variant="ghost" size={collapsed ? 'icon' : 'default'} onClick={handleSignOut} className="w-full rounded-xl text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive">
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Cerrar sesión</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SidebarProvider>
    <div className="app-background flex min-h-screen w-full">
      <AppSidebarContent />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-[72px] items-center border-b border-border/70 bg-background/80 px-4 backdrop-blur-xl md:px-6">
          <SidebarTrigger className="mr-4 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground">
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
          <div>
            <p className="text-sm font-semibold text-foreground">Panel de gestión</p>
            <p className="hidden text-xs text-muted-foreground sm:block">Controlá tu gimnasio desde un solo lugar</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary sm:inline-flex">Sistema en línea</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  </SidebarProvider>
);

export default AppLayout;
