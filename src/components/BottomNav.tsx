import { Link, useLocation } from "react-router-dom";
import { Home, BarChart3, Plus, Wrench, User, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const [pendingVerif, setPendingVerif] = useState(0);
  const { canInstall } = usePWAInstall();

  useEffect(() => {
    if (!user) { setUnread(0); setPendingVerif(0); return; }

    // Notifications non lues
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false)
      .then(({ count }) => setUnread(count ?? 0));

    // Signalements voisins en attente de vérification (actifs, pas les miens)
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .neq("user_id", user.id)
      .then(({ count }) => setPendingVerif(Math.min(count ?? 0, 9)));

    // Realtime : nouvelles notifications
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

  // Masquer sur pages conflictuelles
  const hidden = ["/signaler", "/auth", "/admin", "/install"].some((p) =>
    location.pathname.startsWith(p)
  );
  if (hidden) return null;

  const totalBadge = unread + (pendingVerif > 0 && user ? 1 : 0);

  return (
    <>
      {/* Spacer pour que le contenu ne soit pas masqué derrière la barre */}
      <div className="h-16 md:hidden" aria-hidden="true" />

      <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-card border-t border-border safe-area-pb">
        <div className="grid grid-cols-5 items-end h-16">

          {/* Accueil */}
          <NavTab to="/" icon={Home} label="Accueil" active={location.pathname === "/"} />

          {/* Tableau — ou Installer si dispo */}
          {canInstall ? (
            <Link
              to="/install"
              className={`flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-medium transition-colors ${
                location.pathname === "/install" ? "text-primary" : "text-amber-500"
              }`}
            >
              <div className="relative">
                <Download className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-70" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                </span>
              </div>
              <span>Installer</span>
            </Link>
          ) : (
            <NavTab to="/tableau-de-bord" icon={BarChart3} label="Tableau" active={location.pathname === "/tableau-de-bord"} />
          )}

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

          {/* Infrastructures */}
          <NavTab
            to="/infrastructures"
            icon={Wrench}
            label="Infra"
            active={location.pathname === "/infrastructures"}
          />

          {/* Mon espace — badge notifications + vérification */}
          <NavTab
            to={user ? "/profil" : "/auth"}
            icon={User}
            label="Mon espace"
            active={location.pathname === "/profil"}
            badge={totalBadge > 0 ? totalBadge : undefined}
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
