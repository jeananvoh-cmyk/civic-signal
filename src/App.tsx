import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import AuthCTABar from "@/components/AuthCTABar";
import WhatsAppButton from "@/components/WhatsAppButton";
import Index from "./pages/Index";

const AuthPage = lazy(() => import("./pages/AuthPage"));
const ReportPage = lazy(() => import("./pages/ReportPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const MapPage = lazy(() => import("./pages/MapPage"));
const VerificationPage = lazy(() => import("./pages/VerificationPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const AdminLayout = lazy(() => import("@/components/AdminLayout"));
const AdminReportsPage = lazy(() => import("./pages/AdminReportsPage"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));
const AdminPurgePage = lazy(() => import("./pages/AdminPurgePage"));
const AdminStatsPage = lazy(() => import("./pages/AdminStatsPage"));
const AdminOverviewPage = lazy(() => import("./pages/AdminOverviewPage"));
const AdminDeletionsPage = lazy(() => import("./pages/AdminDeletionsPage"));
const AdminAuditPage = lazy(() => import("./pages/AdminAuditPage"));
const AdminVulnerablePage = lazy(() => import("./pages/AdminVulnerablePage"));
const AdminMessagingPage = lazy(() => import("./pages/AdminMessagingPage"));
const AdminQuartiersPage = lazy(() => import("./pages/AdminQuartiersPage"));
const CommuneDetailPage = lazy(() => import("./pages/CommuneDetailPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const DonationPage = lazy(() => import("./pages/DonationPage"));
const InfrastructurePage = lazy(() => import("./pages/InfrastructurePage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthCTABar />
          <WhatsAppButton />
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/signaler" element={<ReportPage />} />
              <Route path="/tableau-de-bord" element={<DashboardPage />} />
              <Route path="/carte" element={<MapPage />} />
              <Route path="/commune/:communeName" element={<CommuneDetailPage />} />
              <Route path="/verification" element={<ProtectedRoute><VerificationPage /></ProtectedRoute>} />
              <Route path="/profil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/historique" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
              <Route path="/a-propos" element={<AboutPage />} />
              <Route path="/confidentialite" element={<PrivacyPolicyPage />} />
              <Route path="/dons" element={<DonationPage />} />
              <Route path="/infrastructures" element={<InfrastructurePage />} />
              
              {/* Admin routes */}
              <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                <Route index element={<AdminOverviewPage />} />
                <Route path="signalements" element={<AdminReportsPage />} />
                <Route path="utilisateurs" element={<AdminUsersPage />} />
                <Route path="suppressions" element={<AdminDeletionsPage />} />
                <Route path="purge" element={<AdminPurgePage />} />
                <Route path="stats" element={<AdminStatsPage />} />
                <Route path="journal" element={<AdminAuditPage />} />
                <Route path="vulnerables" element={<AdminVulnerablePage />} />
                <Route path="messagerie" element={<AdminMessagingPage />} />
                <Route path="quartiers" element={<AdminQuartiersPage />} />
              </Route>
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
