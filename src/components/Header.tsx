import { Link, useLocation } from "react-router-dom";
import { Zap, Menu, X, LogIn, LogOut, User, Shield, Moon, Sun, Monitor, Heart, Map, Wrench, ChevronDown } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();
  const { canValidate, isAdmin, isModerator } = useUserRole();
  const { theme, toggleTheme } = useTheme();
  const { data: donationsEnabled = true } = useSiteSetting("donations_enabled");

  const themeIcon = theme === "dark" ? <Moon className="h-4 w-4" /> : theme === "light" ? <Sun className="h-4 w-4" /> : <Monitor className="h-4 w-4" />;

  // Close dropdown on outside click
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
    { to: "/", label: "Accueil" },
    { to: "/signaler", label: "Signaler" },
    { to: "/tableau-de-bord", label: "Tableau de Bord Public" },
    { to: "/verification", label: "Vérifier" },
    ...(donationsEnabled ? [{ to: "/dons", label: "♥ Dons" }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card shadow-sm">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-base text-foreground">
            SIGNA<span className="text-primary">-CI</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-foreground/70 hover:bg-secondary hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {/* Carte dropdown */}
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
              Carte
              <ChevronDown className={`h-3 w-3 transition-transform ${mapDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {mapDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-52 rounded-lg border border-border bg-card shadow-lg py-1 z-50">
                <Link
                  to="/carte"
                  onClick={() => setMapDropdownOpen(false)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                    location.pathname === "/carte"
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground/80 hover:bg-secondary"
                  }`}
                >
                  <Map className="h-4 w-4" />
                  <div>
                    <p className="font-medium">Carte des coupures</p>
                    <p className="text-xs text-muted-foreground">Eau & électricité en temps réel</p>
                  </div>
                </Link>
                <Link
                  to="/infrastructures"
                  onClick={() => setMapDropdownOpen(false)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                    location.pathname === "/infrastructures"
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground/80 hover:bg-secondary"
                  }`}
                >
                  <Wrench className="h-4 w-4" />
                  <div>
                    <p className="font-medium">Infrastructures</p>
                    <p className="text-xs text-muted-foreground">Lampadaires, voirie, fuites…</p>
                  </div>
                </Link>
              </div>
            )}
          ))}

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
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {themeIcon}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
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
                  : "text-foreground/70 hover:bg-secondary"
              }`}
            >
              {link.label}
            </Link>
          ))}
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
                className="mt-2 block w-full rounded-lg px-4 py-3 text-left text-sm font-medium text-muted-foreground hover:bg-secondary"
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
        </nav>

      )}
    </header>
  );
};

export default Header;
