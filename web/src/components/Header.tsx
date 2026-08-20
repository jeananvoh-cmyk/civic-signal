import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Zap, Menu, X, LogOut, User, Shield, Moon, Sun, Monitor,
  Wrench, ChevronDown, Search, BarChart3, TrendingUp, Info, HelpCircle,
  Building2, Landmark, Heart, CheckCircle2, FileText, Map as MapIcon
} from "lucide-react";
import SignaLogo from "@/components/SignaLogo";
import NotificationBell from "@/components/NotificationBell";
import GlobalSearch from "@/components/GlobalSearch";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { SOCIAL_LINKS } from "@/lib/social-links";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useTheme } from "@/hooks/useTheme";
import { useSiteSetting } from "@/hooks/useSiteSetting";
import { motion, AnimatePresence } from "framer-motion";

const Header = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { user, signOut } = useAuth();
  const { canValidate, isAdmin, isModerator } = useUserRole();
  const { theme, toggleTheme } = useTheme();
  const { data: donationsEnabled = true } = useSiteSetting("donations_enabled");
  const { data: transparencyEnabled = true } = useSiteSetting("transparency_enabled");
  const { data: partnersEnabled = true } = useSiteSetting("partners_enabled");
  const { data: suiviEnabled = true } = useSiteSetting("suivi_enabled");

  const themeIcon =
    theme === "dark"   ? <Moon className="h-4 w-4" /> :
    theme === "light"  ? <Sun className="h-4 w-4" /> :
                         <Monitor className="h-4 w-4" />;

  // Close mobile menu on nav
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isActive = (to: string) => location.pathname === to;

  return (
    <>
      <header className={`sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 transition-shadow duration-200 ${scrolled ? "shadow-[0_2px_12px_hsl(var(--foreground)/0.06)]" : ""}`}>
        <div className="container flex h-[3.75rem] items-center justify-between gap-4">

          {/* ── Logo SIGNA Officiel ── */}
          <Link to="/" className="flex items-center shrink-0 group" aria-label="SIGNA.ci Accueil">
            <SignaLogo size="sm" />
          </Link>

          {/* ── Desktop Navigation Principale ── */}
          <nav className="hidden items-center gap-1 md:flex flex-1 justify-center">

            {/* 1. Carte des coupures (Accès direct) */}
            <Link
              to="/carte"
              className={cn(
                "relative rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors duration-150",
                isActive("/carte")
                  ? "text-primary bg-primary/8 font-semibold"
                  : "text-foreground/70 hover:text-foreground hover:bg-muted/60"
              )}
            >
              <span>Carte des coupures</span>
              {isActive("/carte") && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-4 rounded-full bg-primary" />
              )}
            </Link>

            {/* 2. 🤝 Vérifier & Corroborer (Accès direct permanent) */}
            <Link
              to="/verification"
              className={cn(
                "relative rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 flex items-center gap-1.5",
                isActive("/verification")
                  ? "text-primary bg-primary/8 font-semibold"
                  : "text-foreground/70 hover:text-foreground hover:bg-muted/60"
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Vérifier</span>
              {isActive("/verification") && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-4 rounded-full bg-primary" />
              )}
            </Link>

            {/* 2. Voirie & Infrastructures (Accès direct) */}
            <Link
              to="/infrastructures"
              className={cn(
                "relative rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors duration-150",
                isActive("/infrastructures")
                  ? "text-primary bg-primary/8 font-semibold"
                  : "text-foreground/70 hover:text-foreground hover:bg-muted/60"
              )}
            >
              <span>Voirie & Infra</span>
              {isActive("/infrastructures") && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-4 rounded-full bg-primary" />
              )}
            </Link>

            {/* 3. Transparence Open Data */}
            {transparencyEnabled && (
              <Link
                to="/transparence"
                className={cn(
                  "relative rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors duration-150",
                  isActive("/transparence")
                    ? "text-primary bg-primary/8 font-semibold"
                    : "text-foreground/70 hover:text-foreground hover:bg-muted/60"
                )}
              >
                <span>Transparence</span>
                {isActive("/transparence") && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-4 rounded-full bg-primary" />
                )}
              </Link>
            )}

            {/* 4. 📊 Tableau de bord communal */}
            <Link
              to="/tableau-de-bord"
              className={cn(
                "relative rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors duration-150",
                isActive("/tableau-de-bord")
                  ? "text-primary bg-primary/8 font-semibold"
                  : "text-foreground/70 hover:text-foreground hover:bg-muted/60"
              )}
            >
              <span>Tableau de bord</span>
              {isActive("/tableau-de-bord") && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-4 rounded-full bg-primary" />
              )}
            </Link>

            {/* 5. 🔍 Suivi direct de ticket */}
            {suiviEnabled && (
              <Link
                to="/suivi"
                className={cn(
                  "relative rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors duration-150",
                  isActive("/suivi")
                    ? "text-primary bg-primary/8 font-semibold"
                    : "text-foreground/70 hover:text-foreground hover:bg-muted/60"
                )}
              >
                <span>Suivre un ticket</span>
                {isActive("/suivi") && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-4 rounded-full bg-primary" />
                )}
              </Link>
            )}

            {/* 6. ℹ️ À Propos */}
            <Link
              to="/a-propos"
              className={cn(
                "relative rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors duration-150",
                isActive("/a-propos")
                  ? "text-primary bg-primary/8 font-semibold"
                  : "text-foreground/70 hover:text-foreground hover:bg-muted/60"
              )}
            >
              <span>À propos</span>
              {isActive("/a-propos") && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-4 rounded-full bg-primary" />
              )}
            </Link>
          </nav>

          {/* ── Actions Droite / Toolbar ── */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {/* 🔍 Bouton Recherche Globale */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/40 hover:bg-muted px-2.5 py-1.5 text-xs text-muted-foreground transition-all hover:text-foreground"
              title="Rechercher un incident, quartier ou commune (⌘K)"
              aria-label="Rechercher"
            >
              <Search className="h-3.5 w-3.5 text-primary" />
              <span className="hidden xl:inline text-foreground/75 font-medium">Rechercher...</span>
              <kbd className="hidden xl:inline-flex items-center rounded border border-border/70 bg-background/80 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                ⌘K
              </kbd>
            </button>

            {/* Sélecteur de Thème */}
            <button
              onClick={toggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-transparent hover:border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              title="Changer le thème"
              aria-label="Changer le thème"
            >
              {themeIcon}
            </button>

            <div className="h-4 w-px bg-border/70 mx-0.5" />

            {/* Auth / Profil */}
            {user ? (
              <div className="flex items-center gap-1.5">
                <NotificationBell />
                {(isAdmin || isModerator) && (
                  <Link
                    to="/admin"
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold transition-colors ${
                      isAdmin ? "text-primary hover:bg-primary/8" : "text-warning hover:bg-warning/8"
                    }`}
                  >
                    <Shield className="h-3.5 w-3.5" />
                    <span className="hidden lg:inline">{isAdmin ? "Admin" : "Modérateur"}</span>
                  </Link>
                )}
                <Link
                  to="/profil"
                  className="flex items-center gap-2 rounded-xl px-2.5 py-1 text-[13px] font-medium text-foreground hover:bg-muted/60 border border-border/50 transition-colors"
                  title="Mon Profil"
                >
                  <div className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-primary text-[11px] font-black text-primary-foreground">
                    {user.email?.[0]?.toUpperCase() || "?"}
                  </div>
                  <span className="hidden lg:inline max-w-[100px] truncate text-foreground/90 font-semibold">{user.email?.split("@")[0]}</span>
                </Link>
                <button
                  onClick={signOut}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Se déconnecter"
                  aria-label="Déconnexion"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link
                  to="/auth?tab=login"
                  className="rounded-xl px-3 py-1.5 text-[13px] font-medium text-foreground/80 hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  Connexion
                </Link>
              </div>
            )}
          </div>

          {/* ── Mobile Right Toolbar ── */}
          <div className="flex items-center gap-1 md:hidden">
            {user && <NotificationBell />}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 transition-colors"
              aria-label="Rechercher"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 transition-colors"
              aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* ── Drawer Menu Mobile Structuré ── */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="border-t border-border/60 bg-background/95 backdrop-blur-md overflow-hidden md:hidden max-h-[85vh] overflow-y-auto"
            >
              <div className="container py-4 space-y-4">

                {/* 1. Action Principale */}
                <Link
                  to="/signaler"
                  className="flex items-center justify-center gap-2 w-full rounded-2xl bg-emerald-600 text-white py-3 font-extrabold text-sm shadow-md"
                >
                  <Zap className="h-4 w-4 fill-white" />
                  Signaler un incident (Eau · Courant · Voirie)
                </Link>

                {/* 2. Cartes & Suivi */}
                <div>
                  <p className="px-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    Cartographie & Suivi
                  </p>
                  <div className="space-y-1">
                    <Link
                      to="/carte"
                      className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", isActive("/carte") ? "bg-primary/10 text-primary font-bold" : "text-foreground/80 hover:bg-muted")}
                    >
                      <MapIcon className="h-4 w-4 text-sky-500" />
                      <span>Carte des coupures d'eau & électricité</span>
                    </Link>
                    <Link
                      to="/infrastructures"
                      className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", isActive("/infrastructures") ? "bg-primary/10 text-primary font-bold" : "text-foreground/80 hover:bg-muted")}
                    >
                      <Landmark className="h-4 w-4 text-emerald-500" />
                      <span>Fil Voirie & Infrastructures publiques</span>
                    </Link>
                    {suiviEnabled && (
                      <Link
                        to="/suivi"
                        className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", isActive("/suivi") ? "bg-primary/10 text-primary font-bold" : "text-foreground/80 hover:bg-muted")}
                      >
                        <Search className="h-4 w-4 text-emerald-500" />
                        <span>Suivre un ticket #SIG</span>
                      </Link>
                    )}
                  </div>
                </div>

                {/* 3. Données & Transparence */}
                <div>
                  <p className="px-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    Données & Statistiques Publiques
                  </p>
                  <div className="space-y-1">
                    {transparencyEnabled && (
                      <Link
                        to="/transparence"
                        className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", isActive("/transparence") ? "bg-emerald-500/15 text-emerald-600 font-bold" : "text-foreground/80 hover:bg-muted")}
                      >
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">Transparence Open Data</span>
                      </Link>
                    )}
                    <Link
                      to="/tableau-de-bord"
                      className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", isActive("/tableau-de-bord") ? "bg-primary/10 text-primary font-bold" : "text-foreground/80 hover:bg-muted")}
                    >
                      <BarChart3 className="h-4 w-4 text-primary" />
                      <span>Tableau de bord communal</span>
                    </Link>
                    <Link
                      to="/verification"
                      className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", isActive("/verification") ? "bg-primary/10 text-primary font-bold" : "text-foreground/80 hover:bg-muted")}
                    >
                      <CheckCircle2 className="h-4 w-4 text-sky-500" />
                      <span>Vérifier & corroborer un signalement</span>
                    </Link>
                  </div>
                </div>

                {/* 4. Projet & Légal */}
                <div className="pt-2 border-t border-border/60">
                  <p className="px-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    Institutionnel
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <Link to="/a-propos" className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground">
                      À propos & Mission
                    </Link>
                    {partnersEnabled && (
                      <Link to="/partenaires" className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground">
                        Relais & Mairies
                      </Link>
                    )}
                    {donationsEnabled && (
                      <Link to="/dons" className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground">
                        Faire un don
                      </Link>
                    )}
                    <Link to="/confidentialite" className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground">
                      Protection Données
                    </Link>
                    <Link to="/cgu" className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground">
                      CGU
                    </Link>
                  </div>
                </div>

                {/* 5. Profil & Connexion */}
                <div className="pt-2 border-t border-border/60">
                  {user ? (
                    <div className="space-y-2">
                      <Link to="/profil" className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card border border-border">
                        <User className="h-4 w-4 text-primary" />
                        <span className="font-bold text-sm text-foreground">Mon profil ({user.email?.split("@")[0]})</span>
                      </Link>
                      <button
                        onClick={() => signOut()}
                        className="flex w-full items-center gap-3 px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive/10 rounded-xl"
                      >
                        <LogOut className="h-4 w-4" />
                        Se déconnecter
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Link to="/auth?tab=login" className="flex-1 text-center py-2.5 rounded-xl border border-border text-sm font-bold">
                        Connexion
                      </Link>
                      <Link to="/auth?tab=signup" className="flex-1 text-center py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold">
                        S'inscrire
                      </Link>
                    </div>
                  )}
                </div>

                {/* 6. Thème */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex w-full items-center justify-between px-3 py-2 rounded-xl bg-muted/40 text-xs font-semibold text-muted-foreground"
                >
                  <span>Thème d'affichage</span>
                  <div className="flex items-center gap-1.5">{themeIcon} <span className="capitalize">{theme}</span></div>
                </button>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};

export default Header;
