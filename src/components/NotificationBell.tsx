import { useEffect, useState, useMemo } from "react";
import {
  Bell, Zap, Droplets, Check, Trash2, Megaphone, CheckCircle2,
  Clock, AlertTriangle, Archive, X, ShieldAlert, BellOff,
} from "lucide-react";
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

type NotifCategory =
  | "neighbor_outage" | "confirmation" | "resolved" | "reminder"
  | "critical" | "escalade" | "archived" | "broadcast" | "other";

interface NotifGroup {
  category: NotifCategory;
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
  if (n.title.includes("🚨") || n.title.toLowerCase().includes("escalade") || n.title.includes("Rapport hebdo") || n.title.includes("J+14")) return "escalade";
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
    const shouldGroup = category === "neighbor_outage";
    const key = shouldGroup ? `${category}::${service}::${commune}::${quartier}` : `single::${n.id}`;
    const existing = groupMap.get(key);
    if (existing) {
      existing.notifications.push(n);
      if (n.created_at > existing.latestAt) existing.latestAt = n.created_at;
      if (!n.read) existing.unreadCount++;
    } else {
      groupMap.set(key, { category, key, notifications: [n], service, commune, quartier, latestAt: n.created_at, unreadCount: n.read ? 0 : 1 });
    }
  }
  return Array.from(groupMap.values()).sort((a, b) => {
    const p: Record<NotifCategory, number> = { escalade: 0, critical: 1, reminder: 2, neighbor_outage: 3, confirmation: 4, resolved: 5, broadcast: 6, archived: 7, other: 8 };
    const ap = a.unreadCount > 0 ? p[a.category] : p[a.category] + 100;
    const bp = b.unreadCount > 0 ? p[b.category] : p[b.category] + 100;
    if (ap !== bp) return ap - bp;
    return new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime();
  });
};

// ── Catégorie → apparence ─────────────────────────────────────────────────────
const CAT: Record<NotifCategory, {
  icon: typeof Bell;
  iconBg: string;
  iconColor: string;
  unreadBorder: string;
  summary: (g: NotifGroup) => string;
}> = {
  critical:       { icon: AlertTriangle, iconBg: "bg-red-100 dark:bg-red-900/40", iconColor: "text-red-600 dark:text-red-400", unreadBorder: "border-l-red-500", summary: () => "Coupure critique sans réponse depuis 24h" },
  escalade:       { icon: ShieldAlert,   iconBg: "bg-red-100 dark:bg-red-900/40", iconColor: "text-red-600 dark:text-red-400", unreadBorder: "border-l-red-500", summary: () => "Rapport d'escalade — action requise" },
  reminder:       { icon: Clock,         iconBg: "bg-amber-100 dark:bg-amber-900/40", iconColor: "text-amber-600 dark:text-amber-400", unreadBorder: "border-l-amber-500", summary: () => "Rappel sur un signalement en attente" },
  neighbor_outage:{ icon: Bell,          iconBg: "bg-blue-100 dark:bg-blue-900/40", iconColor: "text-blue-600 dark:text-blue-400", unreadBorder: "border-l-blue-500", summary: (g) => g.notifications.length > 1 ? `${g.notifications.length} signalements dans votre quartier` : "Un voisin a signalé une coupure près de chez vous" },
  confirmation:   { icon: Check,         iconBg: "bg-emerald-100 dark:bg-emerald-900/40", iconColor: "text-emerald-600 dark:text-emerald-400", unreadBorder: "border-l-emerald-500", summary: () => "Un voisin a confirmé votre signalement" },
  resolved:       { icon: CheckCircle2,  iconBg: "bg-emerald-100 dark:bg-emerald-900/40", iconColor: "text-emerald-600 dark:text-emerald-400", unreadBorder: "border-l-emerald-500", summary: () => "Le service a été rétabli dans votre quartier" },
  broadcast:      { icon: Megaphone,     iconBg: "bg-violet-100 dark:bg-violet-900/40", iconColor: "text-violet-600 dark:text-violet-400", unreadBorder: "border-l-violet-500", summary: (g) => g.notifications[0].message.replace("📢 ", "") },
  archived:       { icon: Archive,       iconBg: "bg-zinc-100 dark:bg-zinc-800", iconColor: "text-zinc-500", unreadBorder: "border-l-zinc-400", summary: () => "Signalement archivé sans réponse" },
  other:          { icon: Bell,          iconBg: "bg-blue-100 dark:bg-blue-900/40", iconColor: "text-blue-600 dark:text-blue-400", unreadBorder: "border-l-blue-500", summary: (g) => g.notifications[0].message },
};

// ── Timestamp relatif ─────────────────────────────────────────────────────────
const relativeTime = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} jours`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

const isAdminEscalade = (n: Notification) =>
  n.title.includes("🚨") || n.title.toLowerCase().includes("escalade") ||
  n.title.includes("Problème chronique") || n.title.includes("J+14") || n.title.includes("Rapport hebdo");

// ── Composant principal ───────────────────────────────────────────────────────
const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");

  // ── Fetch ─────────────────────────────────────────────────────────────────
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
    let pending: Notification[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      if (!pending.length) return;
      const batch = [...pending]; pending = [];
      setNotifications(prev => [...batch, ...prev].slice(0, 50));
    };
    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, payload => {
        pending.push(payload.new as Notification);
        if (timer) clearTimeout(timer);
        timer = setTimeout(flush, 500);
      })
      .subscribe();
    return () => { if (timer) clearTimeout(timer); supabase.removeChannel(channel); };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const allGroups = useMemo(() => groupNotifications(notifications), [notifications]);
  const unreadGroups = useMemo(() => groupNotifications(notifications.filter(n => !n.read)), [notifications]);
  const visibleGroups = activeTab === "unread" ? unreadGroups : allGroups;

  // ── Actions ───────────────────────────────────────────────────────────────
  const markAllRead = async () => {
    if (!user || unreadCount === 0) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = async () => {
    if (!user) return;
    await supabase.from("notifications").delete().eq("user_id", user.id);
    setNotifications([]);
  };

  const dismissGroup = async (e: React.MouseEvent, group: NotifGroup) => {
    e.stopPropagation();
    const ids = group.notifications.map(n => n.id);
    await supabase.from("notifications").delete().in("id", ids);
    setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
  };

  const handleGroupClick = async (group: NotifGroup) => {
    const unreadIds = group.notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length) {
      await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
      setNotifications(prev => prev.map(n => unreadIds.includes(n.id) ? { ...n, read: true } : n));
    }
    setOpen(false);

    const first = group.notifications[0];

    // Admin escalade → dashboard admin onglet escalades
    if (isAdminEscalade(first)) {
      navigate("/admin/signalements?tab=escalades");
      return;
    }

    const cat = group.category;
    if (cat === "broadcast" || cat === "resolved" || cat === "archived") return;
    if (cat === "confirmation") {
      navigate(`/verification?report=${first.report_id}&type=confirmation`);
    } else if (first.report_id) {
      navigate(`/verification?report=${first.report_id}`);
    }
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
              className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[380px] p-0 shadow-xl" align="end">

        {/* ── En-tête ─────────────────────────────────────────── */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-extrabold text-foreground">Notifications</h3>
            <div className="flex gap-1">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 font-semibold" onClick={markAllRead}>
                  <Check className="mr-1 h-3 w-3" /> Tout marquer comme lu
                </Button>
              )}
              {notifications.length > 0 && (
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={clearAll} title="Tout supprimer">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Onglets Toutes / Non lues */}
          <div className="flex gap-1 border-b border-border -mx-4 px-4">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                activeTab === "all"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Toutes
            </button>
            <button
              onClick={() => setActiveTab("unread")}
              className={`relative px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                activeTab === "unread"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Non lues
              {unreadCount > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Liste ───────────────────────────────────────────── */}
        <div className="max-h-[460px] overflow-y-auto">
          {visibleGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-3">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                <BellOff className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {activeTab === "unread" ? "Tout est lu !" : "Aucune notification"}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {activeTab === "unread"
                  ? "Vous êtes à jour, revenez plus tard."
                  : "Vos notifications de quartier apparaîtront ici."}
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {visibleGroups.map((group) => {
                const cfg = CAT[group.category];
                const Icon = group.service === "electricity" && group.category === "neighbor_outage"
                  ? Zap
                  : group.service === "water" && group.category === "neighbor_outage"
                    ? Droplets
                    : cfg.icon;
                const hasUnread = group.unreadCount > 0;
                const title = group.notifications.length > 1
                  ? `${group.notifications.length} alertes${group.service === "electricity" ? " ⚡" : group.service === "water" ? " 💧" : ""} — ${group.commune}${group.quartier ? `, ${group.quartier}` : ""}`
                  : group.notifications[0].title;
                const subtitle = cfg.summary(group);

                return (
                  <motion.div
                    key={group.key}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <button
                      onClick={() => handleGroupClick(group)}
                      className={`group relative flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 border-l-4 ${
                        hasUnread ? `${cfg.unreadBorder} bg-blue-50/40 dark:bg-blue-950/10` : "border-l-transparent"
                      }`}
                    >
                      {/* Icône catégorie */}
                      <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${cfg.iconBg}`}>
                        <Icon className={`h-5 w-5 ${cfg.iconColor}`} />
                      </div>

                      {/* Contenu */}
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm leading-snug ${hasUnread ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>
                          {title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                          {subtitle}
                        </p>
                        <p className={`text-[11px] mt-1 font-medium ${hasUnread ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground/70"}`}>
                          {relativeTime(group.latestAt)}
                        </p>
                      </div>

                      {/* Indicateurs droite */}
                      <div className="flex items-center gap-2 shrink-0 mt-1">
                        {hasUnread && (
                          <span className="h-2.5 w-2.5 rounded-full bg-blue-600 shrink-0" />
                        )}
                        <button
                          onClick={e => dismissGroup(e, group)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted"
                          title="Supprimer"
                        >
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    </button>

                    {/* Séparateur */}
                    <div className="h-px bg-border/50 mx-4" />
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
