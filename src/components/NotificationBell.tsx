import { useEffect, useState, useMemo } from "react";
import { Bell, Zap, Droplets, Check, Trash2, Megaphone, CheckCircle2, Clock, AlertTriangle, Archive, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  report_id: string;
}

/** Classification of notification types for grouping */
type NotifCategory = "neighbor_outage" | "confirmation" | "resolved" | "reminder" | "critical" | "archived" | "broadcast" | "other";

interface NotifGroup {
  category: NotifCategory;
  /** Grouping key: category + service + commune + quartier */
  key: string;
  notifications: Notification[];
  service: "electricity" | "water" | "unknown";
  commune: string;
  quartier: string;
  latestAt: string;
  unreadCount: number;
}

const categorize = (n: Notification): NotifCategory => {
  if (n.message.startsWith("📢")) return "broadcast";
  if (n.title === "Service rétabli dans votre quartier") return "resolved";
  if (n.title === "Un voisin confirme votre signalement") return "confirmation";
  if (n.title.startsWith("⏰")) return "reminder";
  if (n.title === "Signalement archivé — 24h sans réponse") return "archived";
  if (n.title === "🔴 Coupure critique — 24h sans réponse") return "critical";
  if (n.title === "Coupure signalée dans votre quartier") return "neighbor_outage";
  return "other";
};

const parseLocation = (msg: string): { service: "electricity" | "water" | "unknown"; commune: string; quartier: string } => {
  const isElec = msg.includes("Électricité");
  const isWater = msg.includes("Eau");
  const service: "electricity" | "water" | "unknown" = isElec ? "electricity" : isWater ? "water" : "unknown";
  // Format: "⚡ Électricité — Commune, Quartier • extra" or "📢 message"
  const dashParts = msg.split(" — ");
  if (dashParts.length < 2) return { service, commune: "", quartier: "" };
  const locationStr = dashParts[1]?.split(" • ")[0] || "";
  const [commune = "", quartier = ""] = locationStr.split(", ");
  return { service, commune: commune.trim(), quartier: quartier.trim() };
};

const groupNotifications = (notifications: Notification[]): NotifGroup[] => {
  const groupMap = new Map<string, NotifGroup>();

  for (const n of notifications) {
    const category = categorize(n);
    const { service, commune, quartier } = parseLocation(n.message);

    // Only group neighbor_outage notifications — others stay individual
    const shouldGroup = category === "neighbor_outage";
    const key = shouldGroup
      ? `${category}::${service}::${commune}::${quartier}`
      : `single::${n.id}`;

    const existing = groupMap.get(key);
    if (existing) {
      existing.notifications.push(n);
      if (n.created_at > existing.latestAt) existing.latestAt = n.created_at;
      if (!n.read) existing.unreadCount++;
    } else {
      groupMap.set(key, {
        category,
        key,
        notifications: [n],
        service,
        commune,
        quartier,
        latestAt: n.created_at,
        unreadCount: n.read ? 0 : 1,
      });
    }
  }

  // Sort: unread first, then by latest timestamp
  return Array.from(groupMap.values()).sort((a, b) => {
    // Critical/reminder always on top
    const priorityOrder: Record<NotifCategory, number> = {
      critical: 0, reminder: 1, neighbor_outage: 2, confirmation: 3,
      resolved: 4, broadcast: 5, archived: 6, other: 7,
    };
    const aPriority = a.unreadCount > 0 ? priorityOrder[a.category] : priorityOrder[a.category] + 100;
    const bPriority = b.unreadCount > 0 ? priorityOrder[b.category] : priorityOrder[b.category] + 100;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime();
  });
};

const CATEGORY_CONFIG: Record<NotifCategory, { icon: typeof Bell; bgClass: string; textClass: string; unreadBgClass: string }> = {
  critical: { icon: AlertTriangle, bgClass: "bg-destructive/10", textClass: "text-destructive", unreadBgClass: "bg-destructive/10" },
  reminder: { icon: Clock, bgClass: "bg-warning/10", textClass: "text-warning", unreadBgClass: "bg-warning/10" },
  neighbor_outage: { icon: Bell, bgClass: "bg-primary/10", textClass: "text-primary", unreadBgClass: "bg-primary/5" },
  confirmation: { icon: Check, bgClass: "bg-success/10", textClass: "text-success", unreadBgClass: "bg-success/5" },
  resolved: { icon: CheckCircle2, bgClass: "bg-success/10", textClass: "text-success", unreadBgClass: "bg-success/5" },
  broadcast: { icon: Megaphone, bgClass: "bg-accent", textClass: "text-accent-foreground", unreadBgClass: "bg-accent/30" },
  archived: { icon: Archive, bgClass: "bg-muted", textClass: "text-muted-foreground", unreadBgClass: "bg-muted/50" },
  other: { icon: Bell, bgClass: "bg-primary/10", textClass: "text-primary", unreadBgClass: "bg-primary/5" },
};

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setNotifications(data);
  };

  useEffect(() => {
    fetchNotifications();
    if (!user) return;

    let pendingNotifs: Notification[] = [];
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const flushPending = () => {
      if (pendingNotifs.length === 0) return;
      const batch = [...pendingNotifs];
      pendingNotifs = [];
      setNotifications((prev) => [...batch, ...prev].slice(0, 50));
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
  const groups = useMemo(() => groupNotifications(notifications), [notifications]);

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

  const dismissSingle = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const dismissGroup = async (e: React.MouseEvent, group: NotifGroup) => {
    e.stopPropagation();
    const ids = group.notifications.map((n) => n.id);
    await supabase.from("notifications").delete().in("id", ids);
    setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!n.read) {
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
      setNotifications((prev) => prev.map((notif) => notif.id === n.id ? { ...notif, read: true } : notif));
    }
    setOpen(false);

    const category = categorize(n);
    if (category === "broadcast" || category === "resolved" || category === "archived") return;
    if (category === "confirmation") {
      navigate(`/verification?report=${n.report_id}&type=confirmation`);
    } else {
      navigate(`/verification?report=${n.report_id}`);
    }
  };

  const handleGroupClick = async (group: NotifGroup) => {
    // If grouped (multiple items), toggle expand. If single, navigate directly.
    if (group.notifications.length > 1) {
      setExpandedGroup(expandedGroup === group.key ? null : group.key);
      // Mark all in group as read
      const unreadIds = group.notifications.filter((n) => !n.read).map((n) => n.id);
      if (unreadIds.length > 0) {
        await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
        setNotifications((prev) => prev.map((n) => unreadIds.includes(n.id) ? { ...n, read: true } : n));
      }
    } else {
      handleNotificationClick(group.notifications[0]);
    }
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}j`;
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </h3>
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

        <div className="max-h-80 overflow-y-auto">
          {groups.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              <Bell className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
              Aucune notification
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {groups.map((group) => {
                const config = CATEGORY_CONFIG[group.category];
                const Icon = group.service === "electricity" && group.category === "neighbor_outage"
                  ? Zap
                  : group.service === "water" && group.category === "neighbor_outage"
                    ? Droplets
                    : config.icon;
                const isExpanded = expandedGroup === group.key;
                const isGrouped = group.notifications.length > 1;
                const latestNotif = group.notifications[0];
                const hasUnread = group.unreadCount > 0;

                return (
                  <motion.div
                    key={group.key}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-b border-border last:border-b-0"
                  >
                    {/* Group header / single notification */}
                    <button
                      onClick={() => handleGroupClick(group)}
                      className={`group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50 ${
                        hasUnread ? config.unreadBgClass : ""
                      }`}
                    >
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.bgClass} ${config.textClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        {isGrouped ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold text-foreground">
                                {group.notifications.length} coupures{group.service === "electricity" ? " ⚡" : group.service === "water" ? " 💧" : ""}
                              </p>
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {group.commune}{group.quartier ? `, ${group.quartier}` : ""}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-foreground">{latestNotif.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{latestNotif.message}</p>
                          </>
                        )}
                        <p className="mt-0.5 text-[10px] text-muted-foreground/60">{formatTime(group.latestAt)}</p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {hasUnread && !isGrouped && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                        {isGrouped && hasUnread && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                            {group.unreadCount}
                          </span>
                        )}
                        <button
                          onClick={(e) => isGrouped ? dismissGroup(e, group) : dismissSingle(e, latestNotif.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
                          title="Supprimer"
                        >
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    </button>

                    {/* Expanded group items */}
                    <AnimatePresence>
                      {isGrouped && isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-muted/30"
                        >
                          {group.notifications.map((n) => (
                            <button
                              key={n.id}
                              onClick={() => handleNotificationClick(n)}
                              className="group flex w-full items-start gap-3 px-4 py-2 pl-14 text-left transition-colors hover:bg-secondary/50 border-t border-border/50"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                                <p className="text-[10px] text-muted-foreground/60">{formatTime(n.created_at)}</p>
                              </div>
                              <button
                                onClick={(e) => dismissSingle(e, n.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted shrink-0"
                              >
                                <X className="h-3 w-3 text-muted-foreground" />
                              </button>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
