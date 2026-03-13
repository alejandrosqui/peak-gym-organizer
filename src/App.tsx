import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Payments from "./pages/Payments";
import Routines from "./pages/Routines";
import NutritionPlans from "./pages/NutritionPlans";
import UserManagement from "./pages/UserManagement";
import StudentPortal from "./pages/StudentPortal";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { user, loading, role, isOwner, isManager, isStudent } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  // Check role-based access
  if (allowedRoles && role) {
    const normalizedRole = isOwner ? 'owner' : isManager ? 'manager' : isStudent ? 'student' : role;
    if (!allowedRoles.includes(normalizedRole)) {
      // Redirect to appropriate default page
      if (isStudent) return <Navigate to="/my-portal" replace />;
      return <Navigate to="/dashboard" replace />;
    }
  }
  
  return <AppLayout>{children}</AppLayout>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, isStudent } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Cargando...</div>;
  if (user) {
    if (isStudent) return <Navigate to="/my-portal" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const DefaultRedirect: React.FC = () => {
  const { user, loading, isStudent } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isStudent) return <Navigate to="/my-portal" replace />;
  return <Navigate to="/dashboard" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/" element={<DefaultRedirect />} />
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><Dashboard /></ProtectedRoute>} />
            <Route path="/students" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><Students /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><Payments /></ProtectedRoute>} />
            <Route path="/routines" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><Routines /></ProtectedRoute>} />
            <Route path="/nutrition" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><NutritionPlans /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute allowedRoles={['owner']}><UserManagement /></ProtectedRoute>} />
            <Route path="/my-portal" element={<ProtectedRoute allowedRoles={['student']}><StudentPortal /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
