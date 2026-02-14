import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import AdminLayout from "@/components/AdminLayout";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import ReportPage from "./pages/ReportPage";
import DashboardPage from "./pages/DashboardPage";
import MapPage from "./pages/MapPage";
import VerificationPage from "./pages/VerificationPage";
import ProfilePage from "./pages/ProfilePage";
import AdminReportsPage from "./pages/AdminReportsPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminPurgePage from "./pages/AdminPurgePage";
import AdminStatsPage from "./pages/AdminStatsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/signaler" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
            <Route path="/tableau-de-bord" element={<DashboardPage />} />
            <Route path="/carte" element={<MapPage />} />
            <Route path="/verification" element={<ProtectedRoute><VerificationPage /></ProtectedRoute>} />
            <Route path="/profil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            
            {/* Admin routes */}
            <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<Navigate to="/admin/signalements" replace />} />
              <Route path="signalements" element={<AdminReportsPage />} />
              <Route path="utilisateurs" element={<AdminUsersPage />} />
              <Route path="purge" element={<AdminPurgePage />} />
              <Route path="stats" element={<AdminStatsPage />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
