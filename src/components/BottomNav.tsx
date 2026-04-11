import { Link, useLocation } from "react-router-dom";
import { Home, BarChart3, Plus, MapPin, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const tabs = [
  { to: "/", icon: Home, label: "Accueil" },
  { to: "/tableau-de-bord", icon: BarChart3, label: "Tableau" },
  { to: "/carte", icon: MapPin, label: "Carte" },
  { to: "/profil", icon: User, label: "Mon espace" },
];

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  // Hide on pages where bottom nav would conflict
  const hidden = ["/signaler", "/auth", "/admin", "/install"].some((p) =>
    location.pathname.startsWith(p)
  );
  if (hidden) return null;

  return (
    <>
      {/* Spacer so content doesn't hide behind the bar */}
      <div className="h-16 md:hidden" aria-hidden="true" />

      <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-card border-t border-border safe-area-pb">
        <div className="grid grid-cols-5 items-end h-16">
          {/* Tab 1 */}
          <NavTab to={tabs[0].to} icon={tabs[0].icon} label={tabs[0].label} active={location.pathname === tabs[0].to} />

          {/* Tab 2 */}
          <NavTab to={tabs[1].to} icon={tabs[1].icon} label={tabs[1].label} active={location.pathname === tabs[1].to} />

          {/* FAB central — Signaler */}
          <div className="flex items-center justify-center pb-2">
            <Link
              to="/signaler"
              className="flex flex-col items-center justify-center -mt-5 h-14 w-14 rounded-full bg-primary shadow-lg shadow-primary/40 active:scale-95 transition-transform"
              aria-label="Signaler"
            >
              <Plus className="h-6 w-6 text-white" />
            </Link>
          </div>

          {/* Tab 3 */}
          <NavTab to={tabs[2].to} icon={tabs[2].icon} label={tabs[2].label} active={location.pathname === tabs[2].to} />

          {/* Tab 4 */}
          <NavTab
            to={user ? tabs[3].to : "/auth"}
            icon={tabs[3].icon}
            label={tabs[3].label}
            active={location.pathname === tabs[3].to}
          />
        </div>
      </nav>
    </>
  );
}

function NavTab({
  to, icon: Icon, label, active,
}: {
  to: string; icon: React.ElementType; label: string; active: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-medium transition-colors ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      <Icon className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
      <span>{label}</span>
    </Link>
  );
}
