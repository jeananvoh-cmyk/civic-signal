import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock Leaflet
vi.mock("leaflet", () => {
  const L = {
    map: vi.fn(() => ({
      setView: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
      remove: vi.fn(),
      addLayer: vi.fn().mockReturnThis(),
      fitBounds: vi.fn().mockReturnThis(),
    })),
    tileLayer: vi.fn(() => ({ addTo: vi.fn().mockReturnThis() })),
    marker: vi.fn(() => ({
      addTo: vi.fn().mockReturnThis(),
      bindPopup: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
    })),
    divIcon: vi.fn(() => ({})),
    latLngBounds: vi.fn(() => ({ extend: vi.fn(), isValid: () => true })),
    polygon: vi.fn(() => ({ addTo: vi.fn().mockReturnThis(), bindPopup: vi.fn().mockReturnThis() })),
    layerGroup: vi.fn(() => ({ addTo: vi.fn().mockReturnThis(), clearLayers: vi.fn(), addLayer: vi.fn() })),
    control: {
      zoom: vi.fn(() => ({ addTo: vi.fn().mockReturnThis() })),
    },
  };
  return { default: L, ...L };
});

const mockReports = [
  {
    id: "rep-1",
    status: "open",
    service_type: "electricity",
    description: "Poteau électrique tombé à terre",
    commune: "Cocody",
    quartier: "Angré 8è Tranche",
    latitude: 5.35,
    longitude: -4.01,
    support_count: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_vulnerable_zone: false,
    user_id: "usr-1",
  },
  {
    id: "rep-2",
    status: "resolved",
    service_type: "water",
    description: "Coupure d'eau au robinet",
    commune: "Yopougon",
    quartier: "Siporex",
    latitude: 5.32,
    longitude: -4.08,
    support_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_vulnerable_zone: true,
    user_id: "usr-2",
  }
];

// Mock Supabase client returning mock data to trigger rendering logic loops
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signUp: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      signInWithPassword: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
    },
    from: vi.fn(() => {
      const builder: any = {
        select: vi.fn(() => builder),
        insert: vi.fn(() => builder),
        update: vi.fn(() => builder),
        delete: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        neq: vi.fn(() => builder),
        in: vi.fn(() => builder),
        or: vi.fn(() => builder),
        order: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        range: vi.fn(() => builder),
        single: vi.fn(() => Promise.resolve({ data: mockReports[0], error: null })),
        maybeSingle: vi.fn(() => Promise.resolve({ data: mockReports[0], error: null })),
        then: (resolve: any) => resolve({ data: mockReports, error: null, count: mockReports.length }),
      };
      return builder;
    }),
    rpc: vi.fn(() => Promise.resolve({ data: mockReports, error: null })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: { path: "test.jpg" }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.com/test.jpg" } })),
        createSignedUrl: vi.fn(() => Promise.resolve({ data: { signedUrl: "https://example.com/test.jpg" }, error: null })),
      })),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

import AboutPage from "../pages/AboutPage";
import AdminAuditPage from "../pages/AdminAuditPage";
import AdminDeletionsPage from "../pages/AdminDeletionsPage";
import AdminMessagingPage from "../pages/AdminMessagingPage";
import AdminOverviewPage from "../pages/AdminOverviewPage";
import AdminPurgePage from "../pages/AdminPurgePage";
import AdminQuartiersPage from "../pages/AdminQuartiersPage";
import AdminRelayPage from "../pages/AdminRelayPage";
import AdminReportsPage from "../pages/AdminReportsPage";
import AdminRightsPage from "../pages/AdminRightsPage";
import AdminStatsPage from "../pages/AdminStatsPage";
import AdminUsersPage from "../pages/AdminUsersPage";
import AdminVulnerablePage from "../pages/AdminVulnerablePage";
import AuthPage from "../pages/AuthPage";
import BrandPage from "../pages/BrandPage";
import CguPage from "../pages/CguPage";
import CommuneDetailPage from "../pages/CommuneDetailPage";
import CompteurPage from "../pages/CompteurPage";
import ConfirmationPage from "../pages/ConfirmationPage";
import DashboardPage from "../pages/DashboardPage";
import DonationPage from "../pages/DonationPage";
import HistoryPage from "../pages/HistoryPage";
import Index from "../pages/Index";
import InfrastructurePage from "../pages/InfrastructurePage";
import InstallPage from "../pages/InstallPage";
import MairieDashboardPage from "../pages/MairieDashboardPage";
import MapPage from "../pages/MapPage";
import NotFound from "../pages/NotFound";
import PartnerDashboardPage from "../pages/PartnerDashboardPage";
import PartnersPage from "../pages/PartnersPage";
import PostersPage from "../pages/PostersPage";
import PrivacyPolicyPage from "../pages/PrivacyPolicyPage";
import ProfilePage from "../pages/ProfilePage";
import RegulateursPage from "../pages/RegulateursPage";
import ReportDetailPage from "../pages/ReportDetailPage";
import ReportPage from "../pages/ReportPage";
import SuiviPage from "../pages/SuiviPage";
import TransparencyPage from "../pages/TransparencyPage";
import UpdatePasswordPage from "../pages/UpdatePasswordPage";
import VerificationPage from "../pages/VerificationPage";

const pagesToTest = [
  { name: "AboutPage", component: AboutPage, path: "/a-propos" },
  { name: "AdminAuditPage", component: AdminAuditPage, path: "/admin/audit" },
  { name: "AdminDeletionsPage", component: AdminDeletionsPage, path: "/admin/suppressions" },
  { name: "AdminMessagingPage", component: AdminMessagingPage, path: "/admin/messagerie" },
  { name: "AdminOverviewPage", component: AdminOverviewPage, path: "/admin" },
  { name: "AdminPurgePage", component: AdminPurgePage, path: "/admin/purge" },
  { name: "AdminQuartiersPage", component: AdminQuartiersPage, path: "/admin/quartiers" },
  { name: "AdminRelayPage", component: AdminRelayPage, path: "/admin/relay" },
  { name: "AdminReportsPage", component: AdminReportsPage, path: "/admin/signalements" },
  { name: "AdminRightsPage", component: AdminRightsPage, path: "/admin/droits" },
  { name: "AdminStatsPage", component: AdminStatsPage, path: "/admin/statistiques" },
  { name: "AdminUsersPage", component: AdminUsersPage, path: "/admin/utilisateurs" },
  { name: "AdminVulnerablePage", component: AdminVulnerablePage, path: "/admin/vulnerables" },
  { name: "AuthPage", component: AuthPage, path: "/auth" },
  { name: "BrandPage", component: BrandPage, path: "/brand" },
  { name: "CguPage", component: CguPage, path: "/cgu" },
  { name: "CommuneDetailPage", component: CommuneDetailPage, path: "/commune/Cocody" },
  { name: "CompteurPage", component: CompteurPage, path: "/compteur" },
  { name: "ConfirmationPage", component: ConfirmationPage, path: "/confirmation" },
  { name: "DashboardPage", component: DashboardPage, path: "/tableau-de-bord" },
  { name: "DonationPage", component: DonationPage, path: "/faire-un-don" },
  { name: "HistoryPage", component: HistoryPage, path: "/historique" },
  { name: "Index", component: Index, path: "/" },
  { name: "InfrastructurePage", component: InfrastructurePage, path: "/infrastructures" },
  { name: "InstallPage", component: InstallPage, path: "/installer" },
  { name: "MairieDashboardPage", component: MairieDashboardPage, path: "/mairie" },
  { name: "MapPage", component: MapPage, path: "/carte" },
  { name: "NotFound", component: NotFound, path: "/404-test" },
  { name: "PartnerDashboardPage", component: PartnerDashboardPage, path: "/partner/dashboard" },
  { name: "PartnersPage", component: PartnersPage, path: "/partenaires" },
  { name: "PostersPage", component: PostersPage, path: "/affiches" },
  { name: "PrivacyPolicyPage", component: PrivacyPolicyPage, path: "/confidentialite" },
  { name: "ProfilePage", component: ProfilePage, path: "/profil" },
  { name: "RegulateursPage", component: RegulateursPage, path: "/regulateurs" },
  { name: "ReportDetailPage", component: ReportDetailPage, path: "/signalement/123" },
  { name: "ReportPage", component: ReportPage, path: "/signaler" },
  { name: "SuiviPage", component: SuiviPage, path: "/suivi" },
  { name: "TransparencyPage", component: TransparencyPage, path: "/transparence" },
  { name: "UpdatePasswordPage", component: UpdatePasswordPage, path: "/update-password" },
  { name: "VerificationPage", component: VerificationPage, path: "/verification" },
];

describe("All pages render test suite", () => {
  pagesToTest.forEach(({ name, component: Component, path }) => {
    it(`renders ${name} with mock data without throwing a runtime render crash`, async () => {
      cleanup();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path={path} element={<Component />} />
              <Route path="*" element={<Component />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );
    }, 5000);
  });
});
