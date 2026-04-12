import { Link, useLocation } from "react-router-dom";
import { Home, BarChart3, Plus, MapPin, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const tabs = [
  { to: "/", icon: Home, label: "Accueil" },
  { to: "/tableau-de-bord", icon: BarChart3, label: "Tableau" },
  { to: "/carte", icon: MapPin, label: "Carte" },
  { to: "/profil", icon: User, label: "Mon espace" },
];

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) { setUnread(0); return; }
    // Fetch unread count
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false)
      .then(({ count }) => setUnread(count ?? 0));

    // Realtime: listen for new notifications
    const channel = supabase
      .channel("bottomnav-notifs")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => setUnread((n) => n + 1))
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => {
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("read", false)
          .then(({ count }) => setUnread(count ?? 0));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

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

          {/* Tab 4 — Mon espace avec badge notifications */}
          <NavTab
            to={user ? tabs[3].to : "/auth"}
            icon={tabs[3].icon}
            label={tabs[3].label}
            active={location.pathname === tabs[3].to}
            badge={unread > 0 ? unread : undefined}
          />
        </div>
      </nav>
    </>
  );
}

function NavTab({
  to, icon: Icon, label, active, badge,
}: {
  to: string; icon: React.ElementType; label: string; active: boolean; badge?: number;
}) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-medium transition-colors ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      <div className="relative">
        <Icon className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
        {badge !== undefined && (
          <span className="absolute -top-1 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white px-0.5">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </div>
      <span>{label}</span>
    </Link>
  );
}
