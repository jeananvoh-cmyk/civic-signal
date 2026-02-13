import { Link, useLocation } from "react-router-dom";
import { Zap, Menu, X, LogIn, LogOut, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

const Header = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { canValidate, isAdmin } = useUserRole();

  const links = [
    { to: "/", label: "Accueil" },
    { to: "/signaler", label: "Signaler" },
    { to: "/tableau-de-bord", label: "Tableau de bord" },
    { to: "/carte", label: "Carte" },
    ...(canValidate ? [{ to: "/admin/signalements", label: "Validation" }] : []),
    ...(isAdmin ? [{ to: "/admin/utilisateurs", label: "Rôles" }] : []),
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

          {user ? (
            <div className="ml-2 flex items-center gap-2">
              <Link
                to="/profil"
                className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-sm text-foreground hover:bg-secondary/80 transition-colors"
              >
                <User className="h-4 w-4" />
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

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
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
            <button
              onClick={() => { signOut(); setMobileOpen(false); }}
              className="mt-2 block w-full rounded-lg px-4 py-3 text-left text-sm font-medium text-muted-foreground hover:bg-secondary"
            >
              <LogOut className="mr-2 inline h-4 w-4" />
              Déconnexion
            </button>
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
