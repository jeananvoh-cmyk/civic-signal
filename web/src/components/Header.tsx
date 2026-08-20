import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Zap, Menu, X, LogOut, User, Shield, Moon, Sun, Monitor,
  Wrench, ChevronDown, Search, BarChart3, TrendingUp, Info, HelpCircle,
  Building2, Landmark, Heart, CheckCircle2, FileText, Map as MapIcon,
  Printer, Handshake, ChevronRight, Sparkles
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

  // Verrouillage du défilement d'arrière-plan quand le menu mobile est ouvert
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

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

        {/* ── Drawer Menu Mobile Plein Écran Z-[60] Sans Conflit avec BottomNav ── */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.nav
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="fixed inset-x-0 top-[3.75rem] bottom-0 z-[60] bg-background/98 backdrop-blur-2xl overflow-y-auto md:hidden safe-area-pb p-4 sm:p-6 flex flex-col justify-between space-y-6 shadow-2xl border-t border-border/60"
            >
              <div className="space-y-5">
                {/* 1. Action Principale Citoyenne */}
                <Link
                  to="/signaler"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2.5 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 px-4 font-black text-sm shadow-[0_6px_20px_rgba(5,150,105,0.35)] active:scale-[0.98] transition-all"
                >
                  <Zap className="h-4 w-4 fill-white" />
                  <span>Signaler un incident (Eau · Courant · Voirie)</span>
                </Link>

                {/* 2. Cartes & Données Réelles */}
                <div className="space-y-1.5">
                  <p className="px-2 text-[11px] font-black text-muted-foreground/80 uppercase tracking-wider">
                    Cartographie & Suivi Civique
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    <Link
                      to="/carte"
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold transition-all border",
                        isActive("/carte")
                          ? "bg-primary/10 text-primary border-primary/30 font-bold"
                          : "bg-card/70 border-border/60 text-foreground/90 hover:bg-muted/70"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">
                          <MapIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="leading-tight">Carte des coupures</p>
                          <p className="text-[11px] font-normal text-muted-foreground">Eau SODECI & Électricité CIE</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                    </Link>

                    <Link
                      to="/infrastructures"
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold transition-all border",
                        isActive("/infrastructures")
                          ? "bg-primary/10 text-primary border-primary/30 font-bold"
                          : "bg-card/70 border-border/60 text-foreground/90 hover:bg-muted/70"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          <Landmark className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="leading-tight">Fil Voirie & Lampadaires</p>
                          <p className="text-[11px] font-normal text-muted-foreground">Nids-de-poule, feux & voirie Mairies</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                    </Link>

                    {transparencyEnabled && (
                      <Link
                        to="/transparence"
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold transition-all border",
                          isActive("/transparence")
                            ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 font-bold"
                            : "bg-card/70 border-border/60 text-foreground/90 hover:bg-muted/70"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/15 text-emerald-600 dark:text-emerald-400">
                            <TrendingUp className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="leading-tight font-bold text-emerald-600 dark:text-emerald-400">Transparence Open Data</p>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                                Open311
                              </span>
                            </div>
                            <p className="text-[11px] font-normal text-muted-foreground">Export SIG GeoJSON & métriques</p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                      </Link>
                    )}

                    <Link
                      to="/tableau-de-bord"
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold transition-all border",
                        isActive("/tableau-de-bord")
                          ? "bg-primary/10 text-primary border-primary/30 font-bold"
                          : "bg-card/70 border-border/60 text-foreground/90 hover:bg-muted/70"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400">
                          <BarChart3 className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="leading-tight">Tableau Communal</p>
                          <p className="text-[11px] font-normal text-muted-foreground">Stats par commune & opérateur</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                    </Link>

                    {suiviEnabled && (
                      <Link
                        to="/suivi"
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold transition-all border",
                          isActive("/suivi")
                            ? "bg-primary/10 text-primary border-primary/30 font-bold"
                            : "bg-card/70 border-border/60 text-foreground/90 hover:bg-muted/70"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            <Search className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="leading-tight">Suivre un ticket #SIG</p>
                            <p className="text-[11px] font-normal text-muted-foreground">Recherche par numéro cadastral PADA</p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                      </Link>
                    )}
                  </div>
                </div>

                {/* 3. Espaces Professionnels & Partenaires */}
                <div className="space-y-1.5">
                  <p className="px-2 text-[11px] font-black text-muted-foreground/80 uppercase tracking-wider">
                    Espaces Institutionnels & Collectivités
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <Link
                      to="/mairie"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-xl p-3 bg-card/60 border border-border/60 hover:bg-muted/60 text-xs font-semibold"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 shrink-0">
                        <Landmark className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-foreground font-bold leading-tight">Portail Mairies</p>
                        <p className="text-[10px] text-muted-foreground">Services Techniques DST</p>
                      </div>
                    </Link>

                    <Link
                      to="/partenaire"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-xl p-3 bg-card/60 border border-border/60 hover:bg-muted/60 text-xs font-semibold"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600 shrink-0">
                        <Handshake className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-foreground font-bold leading-tight">Régulateurs & Opérateurs</p>
                        <p className="text-[10px] text-muted-foreground">CIE · SODECI · ANARE-CI</p>
                      </div>
                    </Link>

                    <Link
                      to="/affiches"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-xl p-3 bg-card/60 border border-border/60 hover:bg-muted/60 text-xs font-semibold col-span-1 sm:col-span-2"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 shrink-0">
                        <Printer className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-foreground font-bold leading-tight">Affiches de Quartier A4 & QR Codes</p>
                        <p className="text-[10px] text-muted-foreground">À imprimer pour les syndics et commerces</p>
                      </div>
                    </Link>
                  </div>
                </div>

                {/* 4. Liens Utiles & Légal */}
                <div className="pt-2 border-t border-border/60">
                  <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                    <Link
                      to="/a-propos"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-card/40 border border-border/40 text-muted-foreground hover:text-foreground"
                    >
                      <Info className="h-3.5 w-3.5 text-primary" />
                      <span>À propos</span>
                    </Link>
                    {donationsEnabled && (
                      <Link
                        to="/dons"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold"
                      >
                        <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
                        <span>Faire un don</span>
                      </Link>
                    )}
                    <Link
                      to="/confidentialite"
                      onClick={() => setMobileOpen(false)}
                      className="px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground truncate"
                    >
                      Protection Données
                    </Link>
                    <Link
                      to="/cgu"
                      onClick={() => setMobileOpen(false)}
                      className="px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground truncate"
                    >
                      CGU & Mentions
                    </Link>
                  </div>
                </div>
              </div>

              {/* 5. Bas du Tiroir : Session & Thème */}
              <div className="pt-4 border-t border-border/60 space-y-3 shrink-0">
                {user ? (
                  <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border/80 shadow-sm">
                    <Link
                      to="/profil"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2.5 min-w-0"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-black text-xs text-primary-foreground">
                        {user.email?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-foreground truncate">{user.email?.split("@")[0]}</p>
                        <p className="text-[10px] text-muted-foreground">Mon profil citoyen</p>
                      </div>
                    </Link>
                    <button
                      onClick={() => { signOut(); setMobileOpen(false); }}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Se déconnecter"
                      aria-label="Déconnexion"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/auth?tab=login"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center py-2.5 rounded-xl border border-border bg-card text-xs font-bold text-foreground hover:bg-muted/60 shadow-sm"
                    >
                      Connexion
                    </Link>
                    <Link
                      to="/auth?tab=signup"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm"
                    >
                      S'inscrire
                    </Link>
                  </div>
                )}

                {/* Sélecteur de Thème Tactile */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex w-full items-center justify-between px-3.5 py-2.5 rounded-xl bg-muted/60 border border-border/40 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span>Thème d'affichage</span>
                  </span>
                  <div className="flex items-center gap-1.5 font-bold text-foreground capitalize">
                    {themeIcon}
                    <span>{theme === "dark" ? "Sombre" : theme === "light" ? "Clair" : "Système"}</span>
                  </div>
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
