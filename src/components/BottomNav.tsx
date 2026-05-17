import { Link, useLocation } from "react-router-dom";
import { Home, BarChart3, Plus, Wrench, User, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { cn } from "@/lib/utils";

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const [pendingVerif, setPendingVerif] = useState(0);
  const { canInstall } = usePWAInstall();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) { setUnread(0); setPendingVerif(0); return; }

    const fetchUnread = () =>
      supabase.from("notifications").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("read", false)
        .then(({ count }) => setUnread(count ?? 0));

    fetchUnread();

    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .neq("user_id", user.id)
      .then(({ count }) => setPendingVerif(Math.min(count ?? 0, 9)));

    const channel = supabase
      .channel("bottomnav-notifs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => setUnread((n) => n + 1))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          if (debounceTimer.current) clearTimeout(debounceTimer.current);
          debounceTimer.current = setTimeout(fetchUnread, 300);
        })
      .subscribe();

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      supabase.removeChannel(channel);
    };
  }, [user]);

  const hidden = ["/signaler", "/auth", "/admin", "/install"].some((p) =>
    location.pathname.startsWith(p)
  );
  if (hidden) return null;

  const totalBadge = unread + (pendingVerif > 0 && user ? 1 : 0);

  return (
    <>
      <div className="h-[4.5rem] md:hidden" aria-hidden="true" />

      <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden safe-area-pb" aria-label="Navigation principale">
        {/* Frosted glass backdrop */}
        <div className="absolute inset-0 bg-background/85 backdrop-blur-xl border-t border-border/60" />

        <div className="relative grid grid-cols-5 items-center h-[4.5rem] px-1">
          <NavTab to="/" icon={Home} label="Accueil" active={location.pathname === "/"} />

          {canInstall ? (
            <Link
              to="/install"
              aria-label="Installer l'application"
              className="flex flex-col items-center justify-center gap-1 h-full px-2"
            >
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-warning/12 border border-warning/20">
                <Download className="h-4 w-4 text-warning" />
                <span className="absolute -top-0.5 -right-0.5 inline-flex rounded-full h-2 w-2 bg-warning" />
              </div>
              <span className="text-[10px] font-medium text-warning leading-none">Installer</span>
            </Link>
          ) : (
            <NavTab to="/tableau-de-bord" icon={BarChart3} label="Tableau" active={location.pathname === "/tableau-de-bord"} />
          )}

          {/* FAB central */}
          <div className="flex items-center justify-center">
            <Link
              to="/signaler"
              className="flex items-center justify-center h-[52px] w-[52px] rounded-[18px] bg-primary shadow-[0_4px_16px_hsl(var(--primary)/0.45)] active:scale-95 transition-transform -mt-4"
              aria-label="Signaler un problème"
            >
              <Plus className="h-6 w-6 text-white stroke-[2.5]" />
            </Link>
          </div>

          <NavTab to="/infrastructures" icon={Wrench} label="Infra" active={location.pathname === "/infrastructures"} />

          <NavTab
            to={user ? "/profil" : "/auth"}
            icon={User}
            label="Compte"
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
  to: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      to={to}
      aria-label={badge ? `${label} (${badge} notification${badge > 1 ? "s" : ""})` : label}
      aria-current={active ? "page" : undefined}
      className="flex flex-col items-center justify-center gap-1 h-full px-2 group"
    >
      <div className={cn(
        "flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-200 relative",
        active
          ? "bg-primary/12 text-primary"
          : "text-muted-foreground group-hover:text-foreground group-hover:bg-muted/60",
      )}>
        <Icon className={cn("h-[19px] w-[19px] transition-transform duration-150", active && "scale-105")} strokeWidth={active ? 2.2 : 1.8} />
        {badge !== undefined && (
          <span className="absolute -top-0.5 -right-0.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white px-0.5 leading-none">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
        {active && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-[3px] w-4 rounded-full bg-primary" />
        )}
      </div>
      <span className={cn("text-[10px] font-medium leading-none transition-colors", active ? "text-primary" : "text-muted-foreground/80")}>
        {label}
      </span>
    </Link>
  );
}
