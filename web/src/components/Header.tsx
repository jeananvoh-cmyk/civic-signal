import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Zap, Menu, X, LogOut, User, Shield, Moon, Sun, Monitor, Map, Wrench, ChevronDown, Search } from "lucide-react";
import SignaLogo from "@/components/SignaLogo";
import NotificationBell from "@/components/NotificationBell";
import GlobalSearch from "@/components/GlobalSearch";
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
  const [mapDropdownOpen, setMapDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const dropdownRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMapDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close mobile menu on nav
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const isMapActive = location.pathname === "/carte" || location.pathname === "/infrastructures";

  const links = [
    { to: "/", label: "Accueil" },
    { to: "/signaler", label: "Signaler", cta: true },
    { to: "/tableau-de-bord", label: "Tableau de bord" },
    ...(suiviEnabled        ? [{ to: "/suivi",        label: "Suivi" }] : []),
    { to: "/verification", label: "Vérifier" },
    ...(transparencyEnabled ? [{ to: "/transparence", label: "Résultats" }] : []),
    ...(donationsEnabled    ? [{ to: "/dons",         label: "Dons" }] : []),
    ...(partnersEnabled     ? [{ to: "/partenaires",  label: "Partenaires" }] : []),
  ];

  const isActive = (to: string) => location.pathname === to;

  return (
    <>
      <header className={`sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 transition-shadow duration-200 ${scrolled ? "shadow-[0_2px_12px_hsl(var(--foreground)/0.06)]" : ""}`}>
        <div className="container flex h-[3.75rem] items-center justify-between gap-4">

          {/* ── Logo ── */}
          <Link to="/" className="flex items-center shrink-0 group">
            <SignaLogo size="sm" />
          </Link>

          {/* ── Desktop nav ── */}
          <nav className="hidden items-center gap-0.5 md:flex flex-1 justify-center">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "relative rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors duration-150",
                  isActive(link.to)
                    ? "text-primary bg-primary/8 font-semibold"
                    : (link as any).cta
                    ? "text-primary border border-primary/30 hover:bg-primary/8"
                    : "text-foreground/65 hover:text-foreground hover:bg-muted/60"
                )}
              >
                {link.label}
                {isActive(link.to) && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-4 rounded-full bg-primary" />
                )}
              </Link>
            ))}

            {/* Signalements dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setMapDropdownOpen(!mapDropdownOpen)}
                aria-expanded={mapDropdownOpen}
                aria-haspopup="menu"
                aria-controls="signalements-dropdown"
                className={cn(
                  "flex items-center gap-1 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isMapActive
                    ? "text-primary bg-primary/8 font-semibold"
                    : "text-foreground/65 hover:text-foreground hover:bg-muted/60"
                )}
              >
                <Map className="h-3.5 w-3.5" aria-hidden="true" />
                Signalements
                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${mapDropdownOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>

              <AnimatePresence>
                {mapDropdownOpen && (
                  <motion.div
                    id="signalements-dropdown"
                    role="menu"
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute top-full left-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-xl shadow-black/10 dark:shadow-black/40 py-1.5 z-50"
                  >
                    <Link
                      to="/carte"
                      onClick={() => setMapDropdownOpen(false)}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 text-sm transition-colors rounded-lg mx-1.5",
                        location.pathname === "/carte"
                          ? "bg-primary/8 text-primary"
                          : "text-foreground/80 hover:bg-muted/60"
                      )}
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-water/10 border border-water/15">
                        <Map className="h-4 w-4 text-water" />
                      </div>
                      <div>
                        <p className="font-semibold text-[13px] text-foreground">Coupures eau & électricité</p>
                        <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">Coupures signalées par les citoyens, en temps réel.</p>
                      </div>
                    </Link>
                    <div className="mx-4 my-1.5 border-t border-border/60" />
                    <Link
                      to="/infrastructures"
                      onClick={() => setMapDropdownOpen(false)}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 text-sm transition-colors rounded-lg mx-1.5",
                        location.pathname === "/infrastructures"
                          ? "bg-primary/8 text-primary"
                          : "text-foreground/80 hover:bg-muted/60"
                      )}
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-infra/10 border border-infra/15">
                        <Wrench className="h-4 w-4 text-infra" />
                      </div>
                      <div>
                        <p className="font-semibold text-[13px] text-foreground">Infrastructures publiques</p>
                        <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">Voirie, éclairage, caniveaux — signalements collectifs.</p>
                      </div>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          {/* ── Right actions ── */}
          <div className="hidden md:flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Rechercher"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              onClick={toggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`Changer le thème (actuel : ${theme === "dark" ? "sombre" : theme === "light" ? "clair" : "système"})`}
            >
              {themeIcon}
            </button>

            {user ? (
              <div className="flex items-center gap-1.5 ml-1 pl-1.5 border-l border-border">
                <NotificationBell />
                {(isAdmin || isModerator) && (
                  <Link
                    to="/admin"
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold transition-colors ${
                      isAdmin
                        ? "text-primary hover:bg-primary/8"
                        : "text-warning hover:bg-warning/8"
                    }`}
                  >
                    <Shield className="h-3.5 w-3.5" />
                    <span className="hidden lg:inline">{isAdmin ? "Admin" : "Modérateur"}</span>
                  </Link>
                )}
                <Link
                  to="/profil"
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] font-medium text-foreground hover:bg-muted/60 transition-colors"
                >
                  <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.2)] text-[11px] font-bold text-primary-foreground">
                    {user.email?.[0]?.toUpperCase() || "?"}
                  </div>
                  <span className="hidden lg:inline max-w-[100px] truncate text-foreground/80">{user.email?.split("@")[0]}</span>
                </Link>
                <button
                  onClick={signOut}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                  aria-label="Déconnexion"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-1">
                <Link
                  to="/auth?tab=login"
                  className="rounded-lg px-3.5 py-1.5 text-[13px] font-medium text-foreground/80 hover:text-foreground hover:bg-muted/60 transition-colors border border-transparent hover:border-border"
                >
                  Se connecter
                </Link>
                <Link
                  to="/auth?tab=signup"
                  className="rounded-lg bg-primary px-3.5 py-1.5 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-[0_1px_2px_hsl(var(--primary)/0.3)]"
                >
                  S'inscrire
                </Link>
              </div>
            )}
          </div>

          {/* ── Mobile right ── */}
          <div className="flex items-center gap-1 md:hidden">
            {user && <NotificationBell />}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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

        {/* ── Mobile menu ── */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="border-t border-border/60 bg-background/95 backdrop-blur-sm overflow-hidden md:hidden"
            >
              <div className="container py-3 space-y-0.5">
                {links.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={cn(
                      "flex items-center rounded-lg px-4 py-3 text-[14px] font-medium transition-colors",
                      isActive(link.to)
                        ? "bg-primary/8 text-primary font-semibold"
                        : (link as any).cta
                        ? "text-primary border border-primary/25 hover:bg-primary/8"
                        : "text-foreground/70 hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}

                <div className="pt-1 pb-0.5">
                  <p className="px-4 py-1.5 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-[0.08em]">Cartes & signalements</p>
                  <Link
                    to="/carte"
                    className={cn("flex items-center gap-2.5 rounded-lg px-4 py-3 text-[14px] font-medium transition-colors", isActive("/carte") ? "bg-primary/8 text-primary" : "text-foreground/70 hover:bg-muted/60 hover:text-foreground")}
                  >
                    <Map className="h-4 w-4 text-water" />
                    Coupures eau & électricité
                  </Link>
                  <Link
                    to="/infrastructures"
                    className={cn("flex items-center gap-2.5 rounded-lg px-4 py-3 text-[14px] font-medium transition-colors", isActive("/infrastructures") ? "bg-primary/8 text-primary" : "text-foreground/70 hover:bg-muted/60 hover:text-foreground")}
                  >
                    <Wrench className="h-4 w-4 text-infra" />
                    Infrastructures publiques
                  </Link>
                </div>

                <div className="pt-1 border-t border-border/60">
                  {user ? (
                    <>
                      {(isAdmin || isModerator) && (
                        <Link
                          to="/admin"
                          className={cn("flex items-center gap-2.5 rounded-lg px-4 py-3 text-[14px] font-medium transition-colors", isAdmin ? "text-primary hover:bg-primary/8" : "text-warning hover:bg-warning/8")}
                        >
                          <Shield className="h-4 w-4" />
                          {isAdmin ? "Administration" : "Modération"}
                        </Link>
                      )}
                      <Link to="/profil" className="flex items-center gap-2.5 rounded-lg px-4 py-3 text-[14px] font-medium text-foreground/70 hover:bg-muted/60 hover:text-foreground transition-colors">
                        <User className="h-4 w-4" />
                        Mon profil
                      </Link>
                      <button
                        onClick={() => signOut()}
                        className="flex w-full items-center gap-2.5 rounded-lg px-4 py-3 text-[14px] font-medium text-destructive hover:bg-destructive/8 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Déconnexion
                      </button>
                    </>
                  ) : (
                    <div className="flex gap-2 px-1 py-1">
                      <Link to="/auth?tab=login" className="flex-1 rounded-lg border border-border px-4 py-3 text-[14px] font-medium text-center text-foreground/80 hover:bg-muted/60 transition-colors">
                        Se connecter
                      </Link>
                      <Link to="/auth?tab=signup" className="flex-1 rounded-lg bg-primary px-4 py-3 text-[14px] font-semibold text-center text-primary-foreground hover:bg-primary/90 transition-colors">
                        S'inscrire
                      </Link>
                    </div>
                  )}
                </div>

                {/* Social links */}
                <div className="flex items-center gap-2 pt-2 pb-1 px-1">
                  <a href={SOCIAL_LINKS.facebook.url} target="_blank" rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold bg-[#1877F2]/8 text-[#1877F2] hover:bg-[#1877F2]/15 transition-colors border border-[#1877F2]/15">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current shrink-0" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook
                  </a>
                  <a href={SOCIAL_LINKS.whatsapp.url} target="_blank" rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold bg-[#25D366]/8 text-[#25D366] hover:bg-[#25D366]/15 transition-colors border border-[#25D366]/15">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current shrink-0" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </a>
                </div>

                {/* Theme toggle in mobile */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label={`Changer le thème (actuel : ${theme === "dark" ? "sombre" : theme === "light" ? "clair" : "système"})`}
                  className="flex w-full items-center justify-between px-4 py-3 rounded-lg hover:bg-muted/60 transition-colors"
                >
                  <span className="text-[14px] font-medium text-foreground/70">Thème d'affichage</span>
                  <div className="flex items-center gap-2 text-muted-foreground" aria-hidden="true">{themeIcon}<span className="text-[13px] capitalize">{theme === "system" ? "Système" : theme === "dark" ? "Sombre" : "Clair"}</span></div>
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
