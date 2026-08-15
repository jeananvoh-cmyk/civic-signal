import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

const LAST_ADMIN_PAGE_KEY = "admin_last_page";
import {
  FileText, Users, Trash2, Eraser, BarChart3, Shield, ScrollText, Heart, Megaphone, MapPin,
  ArrowLeft, Zap, ChevronDown, ChevronRight, Menu, X, Scale, MailCheck, Moon, Sun, Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { useTheme } from "@/hooks/useTheme";

// ─── Structure de navigation ──────────────────────────────────────────────────
const NAV_FLAT = [
  { label: "Vue d'ensemble", path: "/admin", icon: Shield },
];

const NAV_GROUPS = [
  {
    label: "Contenu",
    items: [
      { label: "Signalements", path: "/admin/signalements", icon: FileText },
      { label: "Quartiers", path: "/admin/quartiers", icon: MapPin },
      { label: "Vulnérables", path: "/admin/vulnerables", icon: Heart },
    ],
  },
  {
    label: "Utilisateurs",
    items: [
      { label: "Utilisateurs", path: "/admin/utilisateurs", icon: Users },
      { label: "Suppressions", path: "/admin/suppressions", icon: Trash2 },
      { label: "Purge données", path: "/admin/purge", icon: Eraser },
    ],
  },
  {
    label: "Analyse",
    items: [
      { label: "Statistiques", path: "/admin/stats", icon: BarChart3 },
      { label: "Journal d'audit", path: "/admin/journal", icon: ScrollText },
      { label: "Relais opérateurs", path: "/admin/relay", icon: MailCheck },
    ],
  },
];

const NAV_SOLO = [
  { label: "Messagerie", path: "/admin/messagerie", icon: Megaphone },
  { label: "Droits & Conseils", path: "/admin/droits", icon: Scale },
];

// Tous les items à plat (pour le sheet mobile et la détection active)
const ALL_ITEMS = [
  ...NAV_FLAT,
  ...NAV_GROUPS.flatMap((g) => g.items),
  ...NAV_SOLO,
];

// ─── Composant principal ──────────────────────────────────────────────────────
const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const themeIcon = theme === "dark" ? <Moon className="h-4 w-4" /> : theme === "light" ? <Sun className="h-4 w-4" /> : <Monitor className="h-4 w-4" />;

  const isActive = (path: string) => location.pathname === path;
  const currentLabel = ALL_ITEMS.find((n) => n.path === location.pathname)?.label ?? "Admin";

  // Mémoriser la dernière page admin visitée (hors index /admin)
  useEffect(() => {
    if (location.pathname !== "/admin") {
      localStorage.setItem(LAST_ADMIN_PAGE_KEY, location.pathname + location.search);
    }
  }, [location.pathname, location.search]);

  const goTo = (path: string) => {
    navigate(path, { state: { internal: true } });
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ══════════════════════════════════════════════════════
          NAVBAR HORIZONTALE (desktop + mobile)
      ══════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur">
        <div className="flex items-center h-14 px-4 md:px-6 gap-4">

          {/* ── Logo ── */}
          <button
            onClick={() => navigate("/admin")}
            className="flex items-center gap-2.5 shrink-0 mr-2"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="font-display text-sm font-bold text-foreground hidden sm:block">
              Admin
            </span>
          </button>

          {/* ── Nav desktop ── */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1">

            {/* Items plats */}
            {NAV_FLAT.map((item) => (
              <button
                key={item.path}
                onClick={() => goTo(item.path)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  isActive(item.path)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {item.label}
              </button>
            ))}

            {/* Groupes avec dropdown */}
            {NAV_GROUPS.map((group) => {
              const groupActive = group.items.some((i) => isActive(i.path));
              return (
                <DropdownMenu key={group.label}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                        groupActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      {group.label}
                      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[180px]">
                    {group.items.map((item) => (
                      <DropdownMenuItem
                        key={item.path}
                        onClick={() => goTo(item.path)}
                        className={cn(
                          "flex items-center gap-2 cursor-pointer",
                          isActive(item.path) && "text-primary font-medium"
                        )}
                      >
                        <item.icon className="h-3.5 w-3.5 shrink-0" />
                        {item.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}

            {/* Items solo */}
            {NAV_SOLO.map((item) => (
              <button
                key={item.path}
                onClick={() => goTo(item.path)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  isActive(item.path)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* ── Spacer mobile ── */}
          <div className="flex-1 md:hidden">
            <span className="text-xs font-medium text-muted-foreground">{currentLabel}</span>
          </div>

          {/* ── Theme toggle ── */}
          <button
            onClick={toggleTheme}
            title={`Thème : ${theme}`}
            className="hidden md:flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
          >
            {themeIcon}
          </button>

          {/* ── CTA : Retour à l'app ── */}
          <button
            onClick={() => navigate("/")}
            className="group hidden md:flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md hover:gap-2.5 shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            SIGNA-CI
          </button>

          {/* ── Theme toggle mobile ── */}
          <button
            onClick={toggleTheme}
            className="md:hidden flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {themeIcon}
          </button>

          {/* ── Hamburger mobile ── */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════
          SHEET MOBILE
      ══════════════════════════════════════════════════════ */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          <SheetHeader className="px-4 py-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2.5 text-left">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-3.5 w-3.5 text-primary" />
              </div>
              Administration
            </SheetTitle>
          </SheetHeader>

          <nav className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* Items plats */}
            <div className="space-y-0.5">
              {NAV_FLAT.map((item) => (
                <button
                  key={item.path}
                  onClick={() => goTo(item.path)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left",
                    isActive(item.path)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </button>
              ))}
            </div>

            {/* Groupes */}
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => goTo(item.path)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left",
                        isActive(item.path)
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Items solo */}
            <div>
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Communication
              </p>
              <div className="space-y-0.5">
                {NAV_SOLO.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => goTo(item.path)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left",
                      isActive(item.path)
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </nav>

          {/* CTA retour dans le sheet */}
          <div className="p-3 border-t border-border">
            <button
              onClick={() => navigate("/")}
              className="group w-full flex items-center gap-3 rounded-full bg-primary px-4 py-2.5 font-semibold text-sm text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              <span className="flex-1 text-left">Retour à SIGNA-CI</span>
              <Zap className="h-4 w-4 opacity-70" />
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ══════════════════════════════════════════════════════
          CONTENU PRINCIPAL
      ══════════════════════════════════════════════════════ */}
      <main className="flex-1 overflow-auto">
        {/* Breadcrumb */}
        {location.pathname !== "/admin" && (() => {
          const group = NAV_GROUPS.find((g) => g.items.some((i) => i.path === location.pathname));
          const page  = ALL_ITEMS.find((i) => i.path === location.pathname);
          if (!page) return null;
          return (
            <div className="border-b border-border bg-muted/30 px-4 md:px-6 py-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <button
                onClick={() => navigate("/admin")}
                className="hover:text-foreground transition-colors"
              >
                Admin
              </button>
              {group && (
                <>
                  <ChevronRight className="h-3 w-3 opacity-40" />
                  <span>{group.label}</span>
                </>
              )}
              <ChevronRight className="h-3 w-3 opacity-40" />
              <span className="text-foreground font-medium">{page.label}</span>
            </div>
          );
        })()}
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
