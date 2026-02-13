import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import Index from "./pages/Index";
import ReportPage from "./pages/ReportPage";
import DashboardPage from "./pages/DashboardPage";
import MapPage from "./pages/MapPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import ProfilePage from "./pages/ProfilePage";
import AdminReportsPage from "./pages/AdminReportsPage";
import AdminUsersPage from "./pages/AdminUsersPage";

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
            <Route path="/carte" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
            <Route path="/profil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/admin/signalements" element={<AdminRoute><AdminReportsPage /></AdminRoute>} />
            <Route path="/admin/utilisateurs" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
