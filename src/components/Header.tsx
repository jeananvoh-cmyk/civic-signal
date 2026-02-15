import { Link, useLocation } from "react-router-dom";
import { Zap, Menu, X, LogIn, LogOut, User, Shield, Moon, Sun, Monitor } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useTheme } from "@/hooks/useTheme";

const Header = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { canValidate } = useUserRole();
  const { theme, toggleTheme } = useTheme();

  const themeIcon = theme === "dark" ? <Moon className="h-4 w-4" /> : theme === "light" ? <Sun className="h-4 w-4" /> : <Monitor className="h-4 w-4" />;

  const links = [
    { to: "/", label: "Accueil" },
    { to: "/signaler", label: "Signaler" },
    { to: "/tableau-de-bord", label: "Dashboard" },
    { to: "/carte", label: "Carte" },
    { to: "/verification", label: "Vérifier" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-hero">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold text-foreground">
            Signal<span className="text-water">Énergie</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}

          <Button variant="ghost" size="icon" onClick={toggleTheme} className="ml-1" title={`Thème: ${theme}`}>
            {themeIcon}
          </Button>

          {user ? (
            <div className="ml-1 flex items-center gap-1">
              <NotificationBell />
              {canValidate && (
                <Link
                  to="/admin"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 flex items-center gap-1"
                >
                  <Shield className="h-4 w-4" /> Admin
                </Link>
              )}
              <Link to="/profil" className="text-sm text-muted-foreground hover:text-foreground">
                {user.email?.split("@")[0]}
              </Link>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button asChild variant="outline" size="sm" className="ml-2">
              <Link to="/auth">
                <LogIn className="mr-1.5 h-4 w-4" />
                Connexion
              </Link>
            </Button>
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
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <>
              {canValidate && (
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium text-primary hover:bg-primary/10"
                >
                  <Shield className="mr-2 inline h-4 w-4" />
                  Administration
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
            <Link
              to="/auth"
              onClick={() => setMobileOpen(false)}
              className="mt-2 block rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary"
            >
              <LogIn className="mr-2 inline h-4 w-4" />
              Connexion
            </Link>
          )}
        </nav>
      )}
    </header>
  );
};

export default Header;
