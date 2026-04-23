import { Link, useLocation } from "react-router-dom";
import { Zap, Menu, X, LogOut, User, Shield, Moon, Sun, Monitor, Map, Wrench, ChevronDown, Search } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import GlobalSearch from "@/components/GlobalSearch";
import { SOCIAL_LINKS } from "@/lib/social-links";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useTheme } from "@/hooks/useTheme";
import { useSiteSetting } from "@/hooks/useSiteSetting";

const Header = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mapDropdownOpen, setMapDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();
  const { canValidate, isAdmin, isModerator } = useUserRole();
  const { theme, toggleTheme } = useTheme();
  const { data: donationsEnabled = true } = useSiteSetting("donations_enabled");
  const { data: transparencyEnabled = true } = useSiteSetting("transparency_enabled");
  const { data: partnersEnabled = true } = useSiteSetting("partners_enabled");
  const { data: suiviEnabled = true } = useSiteSetting("suivi_enabled");

  const themeIcon = theme === "dark" ? <Moon className="h-4 w-4" /> : theme === "light" ? <Sun className="h-4 w-4" /> : <Monitor className="h-4 w-4" />;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMapDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isMapActive = location.pathname === "/carte" || location.pathname === "/infrastructures";

  const links = [
    { to: "/", label: "Accueil", highlight: false },
    { to: "/signaler", label: "Signaler", highlight: false },
    { to: "/tableau-de-bord", label: "Tableau de Bord", highlight: false },
    ...(suiviEnabled ? [{ to: "/suivi", label: "Suivi", highlight: false }] : []),
    { to: "/verification", label: "Vérifier", highlight: true },
    ...(transparencyEnabled ? [{ to: "/transparence", label: "Résultats", highlight: false }] : []),
    ...(donationsEnabled ? [{ to: "/dons", label: "♥ Dons", highlight: false }] : []),
    ...(partnersEnabled ? [{ to: "/partenaires", label: "Partenaires", highlight: false }] : []),
  ];

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-border bg-card shadow-sm">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          {/* Logo mark — pin with signal waves */}
          <div className="relative flex h-9 w-9 items-center justify-center">
            <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-9 w-9">
              {/* Outer signal ring */}
              <circle cx="18" cy="14" r="12" fill="hsl(var(--primary))" opacity="0.12" />
              {/* Inner circle (pin head) */}
              <circle cx="18" cy="13" r="7" fill="hsl(var(--primary))" />
              {/* Pin stem */}
              <path d="M18 20 L18 34 L15 30 L18 34 L21 30 L18 34" stroke="hsl(var(--primary))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              {/* Signal dot center */}
              <circle cx="18" cy="13" r="3" fill="white" />
              {/* Signal wave left */}
              <path d="M11 9 Q9 11 9 13 Q9 15 11 17" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
              {/* Signal wave right */}
              <path d="M25 9 Q27 11 27 13 Q27 15 25 17" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
            </svg>
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-extrabold text-[15px] tracking-tight text-foreground">
              SIGNA<span className="text-primary">·CI</span>
            </span>
            <span className="text-[9px] font-semibold tracking-widest text-muted-foreground uppercase">
              Côte d'Ivoire
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? "bg-primary/10 text-primary font-semibold"
                  : link.highlight
                  ? "border border-primary/40 text-primary hover:bg-primary/10"
                  : "text-foreground/70 hover:bg-secondary hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {/* Signalements dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setMapDropdownOpen(!mapDropdownOpen)}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isMapActive
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-foreground/70 hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Map className="h-3.5 w-3.5" />
              Signalements
              <ChevronDown className={`h-3 w-3 transition-transform ${mapDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {mapDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-72 rounded-xl border border-border bg-card shadow-lg py-1.5 z-50">
                <Link
                  to="/carte"
                  onClick={() => setMapDropdownOpen(false)}
                  className={`flex items-start gap-3 px-4 py-3 text-sm transition-colors ${
                    location.pathname === "/carte"
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/80 hover:bg-secondary"
                  }`}
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
                    <Map className="h-3.5 w-3.5 text-sky-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Coupures d'eau & d'électricité</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Suivez les interruptions signalées par les citoyens et les services.</p>
                  </div>
                </Link>
                <div className="mx-4 my-1 border-t border-border/50" />
                <Link
                  to="/infrastructures"
                  onClick={() => setMapDropdownOpen(false)}
                  className={`flex items-start gap-3 px-4 py-3 text-sm transition-colors ${
                    location.pathname === "/infrastructures"
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/80 hover:bg-secondary"
                  }`}
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
                    <Wrench className="h-3.5 w-3.5 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Infrastructures publiques</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Visualisez et signalez les problèmes de voirie, d'éclairage et d'équipements urbains.</p>
                  </div>
                </Link>
              </div>
            )}
          </div>

          <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} className="ml-1" title="Rechercher">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="ml-1" title={`Thème: ${theme}`}>
            {themeIcon}
          </Button>

          {user ? (
            <div className="ml-2 flex items-center gap-1.5">
              <NotificationBell />
              {isAdmin && (
                <Link
                  to="/admin"
                  className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 flex items-center gap-1"
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden lg:inline">Admin</span>
                </Link>
              )}
              {!isAdmin && isModerator && (
                <Link
                  to="/admin"
                  className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-amber-600 hover:bg-amber-500/10 flex items-center gap-1"
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden lg:inline">Modérateur</span>
                </Link>
              )}
              <div className="h-5 w-px bg-border mx-1" />
              <Link
                to="/profil"
                className="flex items-center gap-2 rounded-full px-2.5 py-1.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  {user.email?.[0]?.toUpperCase() || "?"}
                </div>
                <span className="hidden lg:inline max-w-[100px] truncate">{user.email?.split("@")[0]}</span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Déconnexion"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="ml-2 flex items-center gap-2">
              <Link
                to="/auth?tab=login"
                className="rounded-md border border-border bg-transparent text-foreground hover:bg-secondary px-4 py-1.5 text-sm font-medium transition-colors"
              >
                Se connecter
              </Link>
              <Link
                to="/auth?tab=signup"
                className="rounded-md bg-primary text-white hover:bg-primary/90 px-4 py-1.5 text-sm font-semibold transition-colors"
              >
                S'inscrire
              </Link>
            </div>
          )}
        </nav>

        <div className="flex items-center gap-0.5 md:hidden">
          {user && <NotificationBell />}
          <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} title="Rechercher">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {themeIcon}
          </Button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all border ${
              mobileOpen
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
            }`}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            Menu
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-border bg-card p-4 md:hidden">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={`block rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? "bg-primary/10 text-primary font-semibold"
                  : link.highlight
                  ? "border border-primary/40 text-primary hover:bg-primary/10"
                  : "text-foreground/70 hover:bg-secondary"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {/* Mobile: Signalements sub-links */}
          <div className="mt-1 mb-1">
            <p className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Signalements</p>
            <Link
              to="/carte"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                location.pathname === "/carte" ? "bg-primary/10 text-primary font-semibold" : "text-foreground/70 hover:bg-secondary"
              }`}
            >
              <Map className="h-4 w-4" /> Coupures d'eau & d'électricité
            </Link>
            <Link
              to="/infrastructures"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                location.pathname === "/infrastructures" ? "bg-primary/10 text-primary font-semibold" : "text-foreground/70 hover:bg-secondary"
              }`}
            >
              <Wrench className="h-4 w-4" /> Infrastructures publiques
            </Link>
          </div>

          {user ? (
            <>
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium text-primary hover:bg-primary/10"
                >
                  <Shield className="mr-2 inline h-4 w-4" />
                  Administration
                </Link>
              )}
              {!isAdmin && isModerator && (
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium text-amber-600 hover:bg-amber-500/10"
                >
                  <Shield className="mr-2 inline h-4 w-4" />
                  Modération
                </Link>
              )}
              <Link
                to="/profil"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary"
              >
                <User className="mr-2 inline h-4 w-4" />
                Mon profil
              </Link>
              <button
                onClick={() => { signOut(); setMobileOpen(false); }}
                className="mt-2 block w-full rounded-lg px-4 py-3 text-left text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="mr-2 inline h-4 w-4" />
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth?tab=login"
                onClick={() => setMobileOpen(false)}
                className="mt-2 block rounded-lg border border-border bg-transparent text-foreground px-5 py-3 text-sm font-medium text-center hover:bg-secondary transition-colors"
              >
                Se connecter
              </Link>
              <Link
                to="/auth?tab=signup"
                onClick={() => setMobileOpen(false)}
                className="mt-2 block rounded-lg bg-primary text-white px-5 py-3 text-sm font-semibold text-center hover:bg-primary/90 transition-colors"
              >
                S'inscrire
              </Link>
            </>
          )}

          {/* Social links — toujours visibles dans le menu mobile */}
          <div className="mt-4 pt-4 border-t border-border flex items-center gap-3 px-1">
            <a
              href={SOCIAL_LINKS.facebook.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 bg-[#1877F2]/10 text-[#1877F2] text-sm font-semibold hover:bg-[#1877F2]/20 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current shrink-0" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </a>
            <a
              href={SOCIAL_LINKS.whatsapp.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 bg-[#25D366]/10 text-[#25D366] text-sm font-semibold hover:bg-[#25D366]/20 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current shrink-0" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
          </div>
        </nav>
      )}
    </header>

    {/* Global search dialog */}
    <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};

export default Header;
