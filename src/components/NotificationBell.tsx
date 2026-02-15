import { useEffect, useState } from "react";
import { Bell, Zap, Droplets, Check, Trash2, Megaphone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  report_id: string;
}

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotifications(data);
  };

  useEffect(() => {
    fetchNotifications();

    if (!user) return;

    // Batch incoming realtime notifications with a 500ms debounce
    // to prevent excessive re-renders during high-traffic periods
    let pendingNotifs: Notification[] = [];
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const flushPending = () => {
      if (pendingNotifs.length === 0) return;
      const batch = [...pendingNotifs];
      pendingNotifs = [];
      setNotifications((prev) => [...batch, ...prev].slice(0, 20));
    };

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          pendingNotifs.push(payload.new as Notification);
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(flushPending, 500);
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    if (!user || unreadCount === 0) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = async () => {
    if (!user) return;
    await supabase.from("notifications").delete().eq("user_id", user.id);
    setNotifications([]);
  };

  const handleNotificationClick = async (n: Notification) => {
    // Mark as read
    if (!n.read) {
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
      setNotifications((prev) => prev.map((notif) => notif.id === n.id ? { ...notif, read: true } : notif));
    }
    setOpen(false);

    const isBroadcast = n.message.startsWith("📢");
    const isConfirmation = n.title === "Un voisin confirme votre signalement";
    const isResolved = n.title === "Service rétabli dans votre quartier";

    if (isBroadcast || isResolved) {
      // No navigation needed for broadcast or resolved notifications
      return;
    }

    if (isConfirmation) {
      navigate(`/verification?report=${n.report_id}&type=confirmation`);
    } else {
      // Neighbor alert → corroboration
      navigate(`/verification?report=${n.report_id}`);
    }
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `Il y a ${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Il y a ${days}j`;
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
                <Check className="mr-1 h-3 w-3" /> Tout lire
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={clearAll}>
                <Trash2 className="mr-1 h-3 w-3" /> Vider
              </Button>
            )}
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              <Bell className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
              Aucune notification
            </div>
          ) : (
            notifications.map((n) => {
              const isBroadcast = n.message.startsWith("📢");
              const isResolved = n.title === "Service rétabli dans votre quartier";
              const isConfirmation = n.title === "Un voisin confirme votre signalement";
              const isElec = n.message.includes("Électricité");
              return (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-secondary/50 ${
                    !n.read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    isBroadcast ? "bg-accent text-accent-foreground" :
                    isResolved ? "bg-success/10 text-success" :
                    isConfirmation ? "bg-success/10 text-success" :
                    isElec ? "bg-primary/10 text-primary" : "bg-water/10 text-water"
                  }`}>
                    {isBroadcast ? <Megaphone className="h-4 w-4" /> :
                     isResolved ? <CheckCircle2 className="h-4 w-4" /> :
                     isConfirmation ? <Check className="h-4 w-4" /> :
                     isElec ? <Zap className="h-4 w-4" /> : <Droplets className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground/60">{formatTime(n.created_at)}</p>
                  </div>
                  {!n.read && (
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
