import { lazy, Suspense, useEffect } from "react";
import PullToRefresh from "@/components/PullToRefresh";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import ProfileCompletionNotifier from "@/components/ProfileCompletionNotifier";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import OfflineBar from "@/components/OfflineBar";
import BottomNav from "@/components/BottomNav";
import OnboardingSlides from "@/components/OnboardingSlides";
import ErrorBoundary from "@/components/ErrorBoundary";

import { runAutoClosureCheck } from "@/lib/auto-closure";
import { App as CapApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";

/** Auto-recovery lazy wrapper that reloads the page once if a deployment invalidated stale chunk hashes */
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const component = await factory();
      // Reset retry flag on success
      window.sessionStorage.removeItem("signa_chunk_retry_refreshed");
      return component;
    } catch (error: any) {
      const isDynamicImportError =
        error?.message?.includes("Failed to fetch dynamically imported module") ||
        error?.message?.includes("Importing a module script failed") ||
        error?.message?.includes("error loading dynamically imported module") ||
        error?.message?.includes("Loading chunk") ||
        error?.name === "ChunkLoadError";

      if (isDynamicImportError) {
        const lastRetry = parseInt(window.sessionStorage.getItem("signa_chunk_retry_ts") || "0", 10);
        const now = Date.now();
        if (now - lastRetry > 8000) {
          window.sessionStorage.setItem("signa_chunk_retry_ts", now.toString());
          try {
            if ("caches" in window) {
              caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
            }
          } catch {}
          window.location.href = window.location.pathname + "?v=" + now;
          return new Promise<{ default: T }>(() => {});
        }
      }

      throw error;
    }
  });
}

const Index = lazyWithRetry(() => import("./pages/Index"));
const AuthPage = lazyWithRetry(() => import("./pages/AuthPage"));
const ReportPage = lazyWithRetry(() => import("./pages/ReportPage"));
const DashboardPage = lazyWithRetry(() => import("./pages/DashboardPage"));
const MapPage = lazyWithRetry(() => import("./pages/MapPage"));
const VerificationPage = lazyWithRetry(() => import("./pages/VerificationPage"));
const ProfilePage = lazyWithRetry(() => import("./pages/ProfilePage"));
const AdminLayout = lazyWithRetry(() => import("@/components/AdminLayout"));
const AdminReportsPage = lazyWithRetry(() => import("./pages/AdminReportsPage"));
const AdminUsersPage = lazyWithRetry(() => import("./pages/AdminUsersPage"));
const AdminPurgePage = lazyWithRetry(() => import("./pages/AdminPurgePage"));
const AdminStatsPage = lazyWithRetry(() => import("./pages/AdminStatsPage"));
const AdminOverviewPage = lazyWithRetry(() => import("./pages/AdminOverviewPage"));
const AdminDeletionsPage = lazyWithRetry(() => import("./pages/AdminDeletionsPage"));
const AdminAuditPage = lazyWithRetry(() => import("./pages/AdminAuditPage"));
const AdminVulnerablePage = lazyWithRetry(() => import("./pages/AdminVulnerablePage"));
const AdminMessagingPage = lazyWithRetry(() => import("./pages/AdminMessagingPage"));
const AdminQuartiersPage = lazyWithRetry(() => import("./pages/AdminQuartiersPage"));
const AdminRightsPage = lazyWithRetry(() => import("./pages/AdminRightsPage"));
const AdminRelayPage = lazyWithRetry(() => import("./pages/AdminRelayPage"));
const CommuneDetailPage = lazyWithRetry(() => import("./pages/CommuneDetailPage"));
const AboutPage = lazyWithRetry(() => import("./pages/AboutPage"));
const PrivacyPolicyPage = lazyWithRetry(() => import("./pages/PrivacyPolicyPage"));
const CguPage = lazyWithRetry(() => import("./pages/CguPage"));
const HistoryPage = lazyWithRetry(() => import("./pages/HistoryPage"));
const DonationPage = lazyWithRetry(() => import("./pages/DonationPage"));
const InfrastructurePage = lazyWithRetry(() => import("./pages/InfrastructurePage"));
const InstallPage = lazyWithRetry(() => import("./pages/InstallPage"));
const ConfirmationPage = lazyWithRetry(() => import("./pages/ConfirmationPage"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const PartnerDashboardPage = lazyWithRetry(() => import("./pages/PartnerDashboardPage"));
const PartnersPage = lazyWithRetry(() => import("./pages/PartnersPage"));
const ReportDetailPage = lazyWithRetry(() => import("./pages/ReportDetailPage"));
const TransparencyPage = lazyWithRetry(() => import("./pages/TransparencyPage"));
const UpdatePasswordPage = lazyWithRetry(() => import("./pages/UpdatePasswordPage"));
const SuiviPage = lazyWithRetry(() => import("./pages/SuiviPage"));
const CompteurPage = lazyWithRetry(() => import("./pages/CompteurPage"));
const BrandPage = lazyWithRetry(() => import("./pages/BrandPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes de mise en cache fluide
      gcTime: 1000 * 60 * 10,   // 10 minutes de mémoire tampon
      retry: 1,
      refetchOnWindowFocus: false, // Évite les saccades et surcharges lors du basculement d'onglets
    },
  },
});

// Ensure official brand theme is active on startup
localStorage.removeItem("signa_brand_theme");
document.documentElement.classList.remove("theme-ivoire");

const App = () => {
  useEffect(() => {
    runAutoClosureCheck();

    // Native Android Status Bar Styling
    try {
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setBackgroundColor({ color: "#0F172A" }).catch(() => {});
    } catch {
      // Ignoré en environnement Web pur
    }

    // Native Android Hardware Back Button Handler
    const backListener = CapApp.addListener("backButton", ({ canGoBack }) => {
      if (!canGoBack || window.location.pathname === "/" || window.location.pathname === "") {
        CapApp.minimizeApp();
      } else {
        window.history.back();
      }
    });

    return () => {
      backListener.then((l) => l.remove()).catch(() => {});
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <PullToRefresh>
              <OfflineBar />
              <ProfileCompletionNotifier />
              <PWAInstallBanner />
              <OnboardingSlides />
              <ErrorBoundary>
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
                    <Route path="/cgu" element={<CguPage />} />
                    <Route path="/faire-un-don" element={<DonationPage />} />
                    <Route path="/infrastructures" element={<InfrastructurePage />} />
                    <Route path="/installer" element={<InstallPage />} />
                    <Route path="/install" element={<InstallPage />} />
                    <Route path="/confirmation" element={<ConfirmationPage />} />
                    <Route path="/signalement/:id" element={<ReportDetailPage />} />
                    <Route path="/transparence" element={<TransparencyPage />} />
                    <Route path="/update-password" element={<UpdatePasswordPage />} />
                    <Route path="/suivi" element={<SuiviPage />} />
                    <Route path="/compteur" element={<CompteurPage />} />
                    <Route path="/brand" element={<BrandPage />} />
                    <Route path="/logo" element={<BrandPage />} />

                    {/* Admin routes */}
                    <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                      <Route index element={<AdminOverviewPage />} />
                      <Route path="signalements" element={<AdminReportsPage />} />
                      <Route path="reports" element={<AdminReportsPage />} />
                      <Route path="utilisateurs" element={<AdminUsersPage />} />
                      <Route path="users" element={<AdminUsersPage />} />
                      <Route path="purge" element={<AdminPurgePage />} />
                      <Route path="statistiques" element={<AdminStatsPage />} />
                      <Route path="stats" element={<AdminStatsPage />} />
                      <Route path="suppressions" element={<AdminDeletionsPage />} />
                      <Route path="deletions" element={<AdminDeletionsPage />} />
                      <Route path="audit" element={<AdminAuditPage />} />
                      <Route path="journal" element={<AdminAuditPage />} />
                      <Route path="vulnerables" element={<AdminVulnerablePage />} />
                      <Route path="messagerie" element={<AdminMessagingPage />} />
                      <Route path="quartiers" element={<AdminQuartiersPage />} />
                      <Route path="droits" element={<AdminRightsPage />} />
                      <Route path="relay" element={<AdminRelayPage />} />
                      <Route path="relais" element={<AdminRelayPage />} />
                    </Route>

                    <Route path="/partner/dashboard" element={<ProtectedRoute><PartnerDashboardPage /></ProtectedRoute>} />
                    <Route path="/partenaires" element={<PartnersPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
              <BottomNav />
            </PullToRefresh>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
