import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Send, Clock, CheckCircle2, XCircle, RefreshCw,
  Zap, Droplets, AlertTriangle, MailCheck, MapPin, Users,
  ChevronDown, ChevronUp, ExternalLink, Settings, FlaskConical,
  ShieldCheck, Save, Ban, MessageCircle, Building2, TicketCheck,
  Scale, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RelayLog {
  id: string;
  report_id: string;
  operator: "CIE" | "SODECI" | "MAIRIE" | "ONEP" | "ANARE";
  email_to: string;
  status: "pending" | "sent" | "error";
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
  wa_sent_at: string | null;
  cie_ticket_number: string | null;
  cie_ticket_at: string | null;
  report?: {
    id: string;
    commune: string;
    quartier: string;
    service_type: string;
    verifications: number;
    urgency: string;
    meter_number?: string | null;
    contract_type?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    user_id?: string;
    reporter_phone?: string | null;
  };
}

interface RelayGroup {
  key: string;
  operator: "CIE" | "SODECI" | "MAIRIE" | "ONEP" | "ANARE";
  commune: string;
  email_to: string;
  relayIds: string[];
  quartiers: { name: string; verifications: number; urgency: string; count?: number }[];
  totalConfirmations: number;
  hasCritical: boolean;
  meterNumbers: string[];
  reporters: Array<{ phone: string | null; meterNumber: string | null; contractType: string | null; quartier: string }>;
  waSentAt: string | null;
  cieTicketNumber: string | null;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending:  { label: "En attente", icon: Clock,        color: "text-amber-600",   bg: "bg-amber-500/10 border-amber-500/30" },
  sent:     { label: "Envoyé",     icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/30" },
  error:    { label: "Erreur",     icon: XCircle,      color: "text-red-600",     bg: "bg-red-500/10 border-red-500/30" },
  rejected: { label: "Rejeté",     icon: XCircle,      color: "text-slate-500",   bg: "bg-slate-500/10 border-slate-500/30" },
};

const OPERATOR_CONFIG = {
  CIE:    { label: "CIE",       icon: Zap,          color: "text-yellow-600", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
  SODECI: { label: "SODECI",    icon: Droplets,     color: "text-sky-600",    bg: "bg-sky-500/10",    border: "border-sky-500/30" },
  ANARE:  { label: "ANARE-CI",  icon: Scale,        color: "text-amber-600",  bg: "bg-amber-500/10",  border: "border-amber-500/30" },
  ONEP:   { label: "ONEP",      icon: ShieldCheck,  color: "text-cyan-600",   bg: "bg-cyan-500/10",   border: "border-cyan-500/30" },
  MAIRIE: { label: "Mairie",    icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-500/10", border: "border-orange-500/30" },
};

const URGENCY_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: "CRITIQUE", color: "text-red-600 font-bold" },
  high:     { label: "Elevée",   color: "text-orange-500 font-semibold" },
  medium:   { label: "Moyenne",  color: "text-amber-600" },
  low:      { label: "Faible",   color: "text-muted-foreground" },
};

// ─── Hook : relay config ──────────────────────────────────────────────────────

interface RelayConfig {
  test_mode:      string;
  test_email:     string;
  email_cie:      string;
  email_sodeci:   string;
  email_onep:     string;
  email_anare:    string;
  whatsapp_cie:   string;
  whatsapp_sodeci: string;
  whatsapp_onep:  string;
  whatsapp_anare: string;
  [key: string]: string;
}

// ─── WhatsApp message builder ─────────────────────────────────────────────────

function buildWhatsAppMessage(group: RelayGroup): string {
  const isElec = group.operator === "CIE" || group.operator === "ANARE";
  const serviceLabel = isElec ? "électricité" : "eau potable";
  const serviceEmoji = isElec ? "⚡" : "💧";
  const operatorName = OPERATOR_CONFIG[group.operator]?.label ?? group.operator;

  const quartierLines = group.quartiers.map((q) => {
    const urgLabel = URGENCY_CONFIG[q.urgency]?.label ?? q.urgency;
    const sigCount = q.count && q.count > 1 ? ` (${q.count} signalements)` : "";
    return `• ${q.name}${sigCount} — ${q.verifications} confirmation${q.verifications > 1 ? "s" : ""} — ${urgLabel}`;
  });

  const reporterLines: string[] = [];
  if (group.reporters.length > 0) {
    for (const r of group.reporters) {
      const parts: string[] = [];
      if (r.meterNumber) parts.push(`Compteur ${r.meterNumber}${r.contractType ? ` (${r.contractType === "postpaid" ? "Postpayé" : "Prépayé"})` : ""}`);
      if (r.phone) parts.push(r.phone);
      if (r.quartier) parts.push(r.quartier);
      if (parts.length > 0) reporterLines.push(`• ${parts.join(" · ")}`);
    }
  }

  const lines = [
    `${serviceEmoji} *SIGNA-CI — Transmission officielle ${operatorName}*`,
    ``,
    `Bonjour ${operatorName},`,
    ``,
    `Nous vous contactons au nom de *${group.totalConfirmations} citoyen${group.totalConfirmations > 1 ? "s" : ""}* abonné${group.totalConfirmations > 1 ? "s" : ""} ayant réclamé concernant un problème de *${serviceLabel}* sur notre plateforme.`,
    ``,
    `📍 *Commune :* ${group.commune}`,
    ``,
    `*Zones concernées :*`,
    ...quartierLines,
    ...(reporterLines.length > 0 ? [
      ``,
      `*Abonnés enregistrés :*`,
      ...reporterLines,
    ] : []),
    ``,
    `Merci de prendre les dispositions nécessaires.`,
    ``,
    `— *Équipe SIGNA-CI*`,
    `signa.ci`,
  ];
  return lines.join("\n");
}

const MAIRIES_PILOTES = [
  { slug: "abobo",       label: "Abobo" },
  { slug: "adjame",      label: "Adjamé" },
  { slug: "bingerville", label: "Bingerville" },
  { slug: "cocody",      label: "Cocody" },
  { slug: "koumassi",    label: "Koumassi" },
  { slug: "portbouet",   label: "Port-Bouët" },
  { slug: "yopougon",    label: "Yopougon" },
] as const;

function useRelayConfig() {
  return useQuery({
    queryKey: ["relay-config"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("relay_config")
        .select("key, value");
      if (error) throw error;
      return Object.fromEntries(
        (data as { key: string; value: string }[]).map((r) => [r.key, r.value]),
      ) as RelayConfig;
    },
    staleTime: 60_000,
  });
}

// ─── Hook : chargement ────────────────────────────────────────────────────────

function useRelayLogs(enabled: boolean = true) {
  return useQuery({
    queryKey: ["admin-relay-logs-all"],
    queryFn: async () => {
      // 1. Récupérer d'abord TOUS les logs en attente (pending ou null)
      const { data: pendingData, error: pendingErr } = await (supabase as any)
        .from("relay_logs")
        .select("*")
        .or("status.eq.pending,status.is.null")
        .order("created_at", { ascending: false });
      if (pendingErr) console.warn("pendingData query warning:", pendingErr);

      // 2. Récupérer l'historique récent (sent / error)
      const { data: historyData } = await (supabase as any)
        .from("relay_logs")
        .select("*")
        .not("status", "is", null)
        .neq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(150);

      const data = [...(pendingData ?? []), ...(historyData ?? [])];

      const reportIds = [...new Set((data as any[]).map((r: any) => r.report_id))];
      if (reportIds.length === 0) return [] as RelayLog[];

      const { data: reports } = await supabase
        .from("reports")
        .select("id, commune, quartier, service_type, verifications, urgency, meter_number, contract_type, latitude, longitude, user_id")
        .in("id", reportIds as string[]);

      const userIds = [...new Set((reports ?? []).map((r: any) => r.user_id).filter(Boolean))];
      const { data: profiles } = userIds.length > 0
        ? await supabase.from("profiles").select("user_id, phone").in("user_id", userIds as string[])
        : { data: [] };

      const phoneMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.phone as string | null]));
      const reportMap = new Map((reports ?? []).map((r: any) => [r.id, {
        ...r,
        reporter_phone: phoneMap.get(r.user_id) ?? null,
      }]));

      return (data as any[]).map((log: any) => ({
        ...log,
        report: reportMap.get(log.report_id),
      })) as RelayLog[];
    },
    refetchInterval: enabled ? 15_000 : false,
    staleTime: 5_000,
  });
}

// ─── Groupement des pending ───────────────────────────────────────────────────

function groupPending(logs: RelayLog[]): RelayGroup[] {
  const map = new Map<string, RelayGroup>();

  for (const log of logs.filter((l) => !l.status || l.status === "pending")) {
    const rep = log.report ?? {
      id: log.report_id,
      commune: "Abidjan",
      quartier: "Secteur non spécifié",
      service_type: log.operator === "CIE" ? "electricity" : log.operator === "SODECI" ? "water" : "infrastructure",
      verifications: 1,
      urgency: "medium",
      reporter_phone: null,
    };

    const communeName = rep.commune || "Abidjan";
    const key = `${log.operator}::${communeName}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        operator: log.operator,
        commune: communeName,
        email_to: log.email_to,
        relayIds: [],
        quartiers: [],
        totalConfirmations: 0,
        hasCritical: false,
        meterNumbers: [],
        reporters: [],
        waSentAt: log.wa_sent_at,
        cieTicketNumber: log.cie_ticket_number,
      });
    }
    const g = map.get(key)!;
    g.relayIds.push(log.id);

    if (rep.meter_number && !g.meterNumbers.includes(rep.meter_number)) {
      g.meterNumbers.push(rep.meter_number);
    }

    const hasContact = rep.reporter_phone || rep.meter_number;
    if (hasContact) {
      const alreadyAdded = g.reporters.some(
        (r) => r.phone === rep.reporter_phone && r.meterNumber === rep.meter_number
      );
      if (!alreadyAdded) {
        g.reporters.push({
          phone: rep.reporter_phone ?? null,
          meterNumber: rep.meter_number ?? null,
          contractType: rep.contract_type ?? null,
          quartier: rep.quartier || "Quartier",
        });
      }
    }

    if (!g.waSentAt && log.wa_sent_at) g.waSentAt = log.wa_sent_at;
    if (!g.cieTicketNumber && log.cie_ticket_number) g.cieTicketNumber = log.cie_ticket_number;

    const qName = rep.quartier || "Secteur non spécifié";
    const existing = g.quartiers.find((q) => q.name === qName);
    if (existing) {
      existing.verifications += rep.verifications || 1;
      existing.count = (existing.count ?? 1) + 1;
      const urgencyRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      if ((urgencyRank[rep.urgency] ?? 0) > (urgencyRank[existing.urgency] ?? 0)) {
        existing.urgency = rep.urgency;
      }
    } else {
      g.quartiers.push({
        name: qName,
        verifications: rep.verifications || 1,
        urgency: rep.urgency || "medium",
        count: 1,
      });
    }
    g.totalConfirmations += rep.verifications || 1;
    if (rep.urgency === "critical") g.hasCritical = true;
  }

  return [...map.values()].sort(
    (a, b) => (b.hasCritical ? 1 : 0) - (a.hasCritical ? 1 : 0),
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const AdminRelayPage = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"pending" | "history" | "settings">("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sendingGroup, setSendingGroup] = useState<string | null>(null);

  const { data: relayConfig, refetch: refetchConfig } = useRelayConfig();
  const [draftConfig, setDraftConfig] = useState<RelayConfig | null>(null);
  const effectiveConfig = draftConfig ?? relayConfig;

  // Polling automatique actif seulement en mode pending/history (desactivé en mode settings pour éviter les sauts)
  const { data: logs = [], isLoading, dataUpdatedAt } = useRelayLogs(tab !== "settings");

  const pendingGroups = groupPending(logs);
  const historyLogs   = logs.filter((l) => l.status !== "pending");

  const stats = {
    pending: logs.filter((l) => l.status === "pending").length,
    sent:    logs.filter((l) => l.status === "sent").length,
    error:   logs.filter((l) => l.status === "error").length,
    cie:     logs.filter((l) => l.operator === "CIE").length,
    sodeci:  logs.filter((l) => l.operator === "SODECI").length,
    anare:   logs.filter((l) => l.operator === "ANARE").length,
    onep:    logs.filter((l) => l.operator === "ONEP").length,
    mairie:  logs.filter((l) => l.operator === "MAIRIE").length,
  };

  const mairieByCommune = MAIRIES_PILOTES.map((m) => ({
    slug: m.slug,
    label: m.label,
    total:   logs.filter((l) => l.operator === "MAIRIE" && l.report?.commune === m.label).length,
    pending: logs.filter((l) => l.operator === "MAIRIE" && l.report?.commune === m.label && l.status === "pending").length,
    sent:    logs.filter((l) => l.operator === "MAIRIE" && l.report?.commune === m.label && l.status === "sent").length,
  })).filter((m) => m.total > 0);

  // ── Envoi manuel d'un groupe ───────────────────────────────────────────────
  const sendGroup = useMutation({
    mutationFn: async ({ relay_ids, groupKey }: { relay_ids: string[]; groupKey: string }) => {
      setSendingGroup(groupKey);
      const { data, error } = await supabase.functions.invoke("relay-to-operator", {
        body: { relay_ids },
      });
      if (error) {
        let msg = error.message || "Impossible d'envoyer l'email.";
        if (error.context) {
          try {
            const errJson = await error.context.json();
            if (errJson?.error) msg = errJson.error;
          } catch (_) {
            // fallback
          }
        }
        throw new Error(msg);
      }
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin-relay-logs-all"] });
      toast({
        title: "Email envoyé",
        description: `${data?.sent ?? 0} signalement(s) transmis. Les citoyens ont été notifiés automatiquement.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Erreur d'envoi",
        description: err.message ?? "Impossible d'envoyer l'email.",
        variant: "destructive",
      });
    },
    onSettled: () => setSendingGroup(null),
  });

  // ── Sauvegarder la config ──────────────────────────────────────────────────
  const saveConfig = useMutation({
    mutationFn: async (cfg: RelayConfig) => {
      const updates = Object.entries(cfg).map(([key, value]) =>
        (supabase as any)
          .from("relay_config")
          .update({ value, updated_at: new Date().toISOString() })
          .eq("key", key),
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      refetchConfig();
      setDraftConfig(null);
      toast({ title: "Configuration sauvegardée" });
    },
    onError: () => {
      toast({ title: "Erreur de sauvegarde", variant: "destructive" });
    },
  });

  // ── Rejeter un groupe de relays ───────────────────────────────────────────
  const [rejectConfirm, setRejectConfirm] = useState<string | null>(null);

  const rejectGroup = useMutation({
    mutationFn: async (relay_ids: string[]) => {
      const { error } = await (supabase as any)
        .from("relay_logs")
        .update({ status: "rejected", error_message: "Rejeté par l'administrateur" })
        .in("id", relay_ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-relay-logs-all"] });
      setRejectConfirm(null);
      toast({ title: "Signalement rejeté", description: "Le relay a été rejeté et ne sera pas transmis." });
    },
    onError: () => {
      toast({ title: "Erreur", variant: "destructive" });
    },
  });

  // ── Marquer envoyé via WhatsApp ───────────────────────────────────────────
  const markWaSent = useMutation({
    mutationFn: async (relay_ids: string[]) => {
      const { error } = await (supabase as any)
        .from("relay_logs")
        .update({ wa_sent_at: new Date().toISOString() })
        .in("id", relay_ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-relay-logs-all"] });
      toast({ title: "Envoi WhatsApp enregistré", description: "Le destinataire sera notifié." });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  // ── Enregistrer ticket / référence ─────────────────────────────────────────
  const retryRelay = useMutation({
    mutationFn: async (relayId: string) => {
      const { error } = await (supabase as any)
        .from("relay_logs")
        .update({ status: "pending", error_message: null })
        .eq("id", relayId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-relay-logs-all"] });
      toast({ title: "Remis en file d'attente" });
    },
  });

  // ── Synchronisation rétroactive de tous les signalements validés dans la file ──
  const syncAllMutation = useMutation({
    mutationFn: async () => {
      const { data: valReports, error } = await supabase
        .from("reports")
        .select("*")
        .eq("validated", true)
        .or("status.eq.active,status.eq.chronic");
      if (error) throw error;
      if (!valReports || valReports.length === 0) return 0;

      let count = 0;
      for (const report of valReports) {
        const relays: Array<{ report_id: string; operator: "CIE" | "SODECI" | "MAIRIE" | "ONEP" | "ANARE"; email_to: string; status: string }> = [];

        if (report.service_type === "electricity") {
          relays.push({ report_id: report.id, operator: "CIE", email_to: "reclamation@cie.ci", status: "pending" });
        } else if (report.service_type === "water") {
          relays.push({ report_id: report.id, operator: "SODECI", email_to: "reclamation@sodeci.ci", status: "pending" });
        } else if (report.service_type === "streetlighting" || report.service_type === "electricity_quality") {
          relays.push({ report_id: report.id, operator: "CIE", email_to: "reclamation@cie.ci", status: "pending" });
          relays.push({ report_id: report.id, operator: "ANARE", email_to: "reclamation@anare.ci", status: "pending" });
        } else if (report.service_type === "water_quality") {
          relays.push({ report_id: report.id, operator: "SODECI", email_to: "reclamation@sodeci.ci", status: "pending" });
          relays.push({ report_id: report.id, operator: "ONEP", email_to: "reclamation@onep.ci", status: "pending" });
        } else {
          relays.push({ report_id: report.id, operator: "MAIRIE", email_to: `mairie:${report.commune}`, status: "pending" });
        }

        for (const item of relays) {
          const { data: existing } = await (supabase as any)
            .from("relay_logs")
            .select("id")
            .eq("report_id", item.report_id)
            .eq("operator", item.operator)
            .maybeSingle();

          if (!existing) {
            const { error: inErr } = await (supabase as any).from("relay_logs").insert(item);
            if (inErr && (item.operator === "ANARE" || item.operator === "ONEP")) {
              const fbOp = item.operator === "ANARE" ? "CIE" : "SODECI";
              await (supabase as any).from("relay_logs").insert({ ...item, operator: fbOp });
            }
            count++;
          }
        }
      }
      return count;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["admin-relay-logs-all"] });
      toast({
        title: "Synchronisation terminée",
        description: `${count} signalement(s) validé(s) ajouté(s) ou mis à jour dans la file d'attente !`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Erreur de synchronisation",
        description: err.message ?? "Impossible de synchroniser les relais.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* En-tête */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            <MailCheck className="h-5 w-5 text-primary" />
            Relais opérateurs & régulateurs
          </h1>
          <p className="text-sm text-muted-foreground">
            Validation manuelle avant transmission CIE / SODECI / ANARE-CI / ONEP / Mairies
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {dataUpdatedAt > 0 && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              {format(new Date(dataUpdatedAt), "HH:mm:ss")}
            </span>
          )}
          <Button
            size="sm"
            variant="default"
            disabled={syncAllMutation.isPending}
            onClick={() => syncAllMutation.mutate()}
            className="gap-1.5 bg-primary text-primary-foreground font-semibold shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncAllMutation.isPending ? "animate-spin" : ""}`} />
            {syncAllMutation.isPending ? "Synchronisation..." : "Synchroniser les relais validés"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-relay-logs-all"] })}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Rafraîchir
          </Button>
        </div>
      </motion.div>

      {/* KPI */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2"
      >
        {[
          { label: "En attente",  value: stats.pending, icon: Clock,        color: "text-amber-600" },
          { label: "Envoyés",     value: stats.sent,    icon: CheckCircle2, color: "text-emerald-600" },
          { label: "Erreurs",     value: stats.error,   icon: XCircle,      color: "text-red-600" },
          { label: "CIE",         value: stats.cie,     icon: Zap,          color: "text-yellow-600" },
          { label: "SODECI",      value: stats.sodeci,  icon: Droplets,     color: "text-sky-600" },
          { label: "ANARE-CI",    value: stats.anare,   icon: Scale,        color: "text-amber-600" },
          { label: "ONEP",       value: stats.onep,    icon: ShieldCheck,  color: "text-cyan-600" },
          { label: "Mairies",     value: stats.mairie,  icon: Building2,    color: "text-orange-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-card p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1 text-muted-foreground truncate">
              <kpi.icon className="h-3.5 w-3.5 shrink-0" />
              <span className="text-[11px] font-medium truncate">{kpi.label}</span>
            </div>
            <p className={`font-display text-xl font-extrabold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </motion.div>

      {/* Décompte infra par mairie */}
      {mairieByCommune.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-xl border border-orange-200 dark:border-orange-800/40 bg-orange-50/50 dark:bg-orange-900/10 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="h-4 w-4 text-orange-600" />
            <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">
              Signalements infrastructure par mairie
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {mairieByCommune.map((m) => (
              <div key={m.slug} className="rounded-lg border border-orange-200 dark:border-orange-800/30 bg-white dark:bg-card px-3 py-2">
                <p className="text-xs font-semibold text-foreground truncate">{m.label}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-extrabold text-orange-600">{m.total}</span>
                  <div className="flex flex-col text-xs leading-tight text-muted-foreground">
                    {m.pending > 0 && (
                      <span className="text-amber-600 font-medium">{m.pending} en attente</span>
                    )}
                    {m.sent > 0 && (
                      <span className="text-emerald-600">{m.sent} envoyé{m.sent > 1 ? "s" : ""}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Onglets */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab("pending")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === "pending"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          À envoyer
          {stats.pending > 0 && (
            <span className="ml-2 rounded-full bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5">
              {stats.pending}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("history")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === "history"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Historique
          {historyLogs.length > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">
              ({historyLogs.length})
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("settings")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
            tab === "settings"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
          Paramètres
          {relayConfig?.test_mode === "true" && (
            <span className="rounded-full bg-amber-500/20 text-amber-600 text-xs font-bold px-1.5 py-0.5 border border-amber-500/30">
              TEST
            </span>
          )}
        </button>
      </div>

      {/* Contenu */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
        </div>

      ) : tab === "pending" ? (

        /* ── VUE : À ENVOYER ───────────────────────────────────────────── */
        pendingGroups.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center space-y-4 shadow-sm">
            <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500/70" />
            <div className="space-y-1 max-w-lg mx-auto">
              <h3 className="text-foreground font-bold text-lg">Aucun signalement en attente dans la file.</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Cliquez ci-dessous pour importer et synchroniser automatiquement tous les signalements validés de la plateforme (CIE, SODECI, ANARE-CI, ONEP et Mairies).
              </p>
            </div>
            <div className="pt-2">
              <Button
                size="lg"
                variant="default"
                disabled={syncAllMutation.isPending}
                onClick={() => syncAllMutation.mutate()}
                className="gap-2 bg-primary text-primary-foreground font-bold shadow-md hover:scale-105 transition-transform"
              >
                <RefreshCw className={`h-4 w-4 ${syncAllMutation.isPending ? "animate-spin" : ""}`} />
                {syncAllMutation.isPending ? "Synchronisation en cours..." : "⚡ Synchroniser tous les signalements validés"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingGroups.map((group) => {
              const opCfg    = OPERATOR_CONFIG[group.operator] ?? OPERATOR_CONFIG.MAIRIE;
              const isSending = sendingGroup === group.key;

              return (
                <motion.div
                  key={group.key}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl border bg-card overflow-hidden ${
                    group.hasCritical ? "border-red-500/50" : "border-border"
                  }`}
                >
                  {/* Header du groupe */}
                  <div className={`flex items-center justify-between gap-4 p-4 ${
                    group.hasCritical ? "bg-red-500/5" : "bg-muted/20"
                  }`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${opCfg.bg} border ${opCfg.border}`}>
                        <opCfg.icon className={`h-5 w-5 ${opCfg.color}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`font-bold text-sm ${opCfg.color}`}>{opCfg.label}</span>
                          <span className="text-muted-foreground text-xs">·</span>
                          <span className="font-semibold text-sm text-foreground">
                            Commune de {group.commune}
                          </span>
                          {group.hasCritical && (
                            <span className="rounded-full bg-red-500/10 text-red-600 text-xs font-bold px-2 py-0.5 border border-red-500/30">
                              CRITIQUE
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {group.quartiers.length} quartier{group.quartiers.length > 1 ? "s" : ""}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {group.totalConfirmations} confirmation{group.totalConfirmations > 1 ? "s" : ""}
                          </span>
                          <span className="hidden sm:block">{group.email_to}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {rejectConfirm === group.key ? (
                        <>
                          <span className="text-xs text-muted-foreground hidden sm:block">Confirmer ?</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-red-600 border-red-500/40 hover:bg-red-500/10 text-xs h-8"
                            onClick={() => rejectGroup.mutate(group.relayIds)}
                            disabled={rejectGroup.isPending}
                          >
                            <Ban className="h-3.5 w-3.5" />
                            Oui, rejeter
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-8"
                            onClick={() => setRejectConfirm(null)}
                          >
                            Annuler
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRejectConfirm(group.key)}
                            disabled={isSending}
                            className="gap-1.5 text-slate-500 border-slate-400/40 hover:bg-slate-500/10 text-xs h-8"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            Rejeter
                          </Button>

                          {/* WhatsApp bouton */}
                          {(() => {
                            const waKeyMap: Record<string, string> = {
                              CIE: "whatsapp_cie",
                              SODECI: "whatsapp_sodeci",
                              ANARE: "whatsapp_anare",
                              ONEP: "whatsapp_onep",
                            };
                            const waKey = waKeyMap[group.operator];
                            const waNumber = waKey ? effectiveConfig?.[waKey]?.replace(/\D/g, "") : null;
                            if (!waNumber) return null;

                            const waMsg = buildWhatsAppMessage(group);
                            const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMsg)}`;
                            const alreadySent = !!group.waSentAt;
                            return (
                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="gap-1 text-muted-foreground text-xs h-8 px-2"
                                  title="Copier le message"
                                  onClick={() => {
                                    navigator.clipboard.writeText(waMsg);
                                    toast({ title: "Message copié", description: "Collez-le dans WhatsApp." });
                                  }}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={`gap-1.5 text-xs h-8 ${
                                    alreadySent
                                      ? "text-emerald-700 border-emerald-500/50 bg-emerald-500/10"
                                      : "text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/10"
                                  }`}
                                  onClick={() => {
                                    window.open(url, "_blank", "noopener,noreferrer");
                                    if (!alreadySent) {
                                      markWaSent.mutate(group.relayIds);
                                    }
                                  }}
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                  {alreadySent ? "WA renvoyé" : "WhatsApp"}
                                </Button>
                              </div>
                            );
                          })()}

                          <Button
                            size="sm"
                            onClick={() =>
                              sendGroup.mutate({
                                relay_ids: group.relayIds,
                                groupKey: group.key,
                              })
                            }
                            disabled={isSending}
                            className={`gap-1.5 ${
                              group.hasCritical
                                ? "bg-red-600 hover:bg-red-700 text-white"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                            }`}
                          >
                            <Send className="h-3.5 w-3.5" />
                            {isSending ? "Envoi…" : `Email ${opCfg.label}`}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Liste des quartiers */}
                  <div className="divide-y divide-border">
                    {group.quartiers.map((q, idx) => {
                      const urgCfg = URGENCY_CONFIG[q.urgency] ?? URGENCY_CONFIG.low;
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between px-4 py-2.5"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{q.name}</span>
                            {q.count && q.count > 1 && (
                              <span className="text-xs text-muted-foreground">({q.count} signalements)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-primary font-bold">{q.verifications} foyer(s)</span>
                            <span className={urgCfg.color}>{urgCfg.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      ) : tab === "history" ? (

        /* ── VUE : HISTORIQUE ───────────────────────────────────────────── */
        <div className="space-y-3">
          {historyLogs.map((log) => {
            const statusCfg = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.pending;
            const opCfg     = OPERATOR_CONFIG[log.operator] ?? OPERATOR_CONFIG.MAIRIE;
            const isExpanded = expandedId === log.id;

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${opCfg.bg}`}>
                      <opCfg.icon className={`h-4 w-4 ${opCfg.color}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-xs ${opCfg.color}`}>{opCfg.label}</span>
                        {log.report && (
                          <>
                            <span className="text-muted-foreground text-xs">·</span>
                            <span className="text-sm font-semibold text-foreground truncate">
                              {log.report.quartier} ({log.report.commune})
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {log.email_to} · {format(new Date(log.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusCfg.bg} ${statusCfg.color}`}>
                      <statusCfg.icon className="h-3 w-3" />
                      {statusCfg.label}
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border bg-muted/30 p-4 space-y-3 text-xs">
                    {log.status === "error" && log.error_message && (
                      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-red-600 font-mono">
                        {log.error_message}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {log.status === "error" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retryRelay.mutate(log.id)}
                          disabled={retryRelay.isPending}
                          className="gap-1 text-xs"
                        >
                          <RefreshCw className="h-3 w-3" /> Réessayer
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(`/admin/signalements?id=${log.report_id}`, "_blank")}
                        className="gap-1 text-xs"
                      >
                        <ExternalLink className="h-3 w-3" /> Voir le signalement
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

      ) : tab === "settings" && effectiveConfig ? (

        /* ── VUE : PARAMÈTRES (STABILISÉ) ────────────────────────────────── */
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* Mode test / production */}
          <div className={`rounded-xl border p-5 ${
            effectiveConfig.test_mode === "true"
              ? "border-amber-500/40 bg-amber-500/5"
              : "border-emerald-500/40 bg-emerald-500/5"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  effectiveConfig.test_mode === "true" ? "bg-amber-500/10" : "bg-emerald-500/10"
                }`}>
                  {effectiveConfig.test_mode === "true"
                    ? <FlaskConical className="h-5 w-5 text-amber-500" />
                    : <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  }
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">
                    {effectiveConfig.test_mode === "true" ? "Mode TEST actif" : "Mode PRODUCTION actif"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {effectiveConfig.test_mode === "true"
                      ? "Les emails partent vers l'adresse de test, pas aux opérateurs réels"
                      : "Les emails partent directement aux destinataires réels"
                    }
                  </p>
                </div>
              </div>
              <Switch
                checked={effectiveConfig.test_mode === "true"}
                onCheckedChange={(checked) =>
                  setDraftConfig({ ...(effectiveConfig as RelayConfig), test_mode: checked ? "true" : "false" })
                }
              />
            </div>

            {effectiveConfig.test_mode === "true" && (
              <div className="mt-4">
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Email de test — reçoit tous les emails à la place des opérateurs
                </label>
                <input
                  type="email"
                  value={effectiveConfig.test_email ?? ""}
                  onChange={(e) =>
                    setDraftConfig({ ...(effectiveConfig as RelayConfig), test_email: e.target.value })
                  }
                  placeholder="votre@email.com"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            )}
          </div>

          {/* Emails + WhatsApp opérateurs réseau & régulateurs */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-5">
            <p className="text-sm font-semibold text-foreground">Opérateurs & Régulateurs</p>
            {[
              {
                emailKey: "email_cie",      waKey: "whatsapp_cie",
                label: "CIE — Électricité (Concessionnaire)", icon: Zap,          color: "text-yellow-600",
                emailPlaceholder: "reclamation@cie.ci", waPlaceholder: "+225 07 00 00 00 00",
              },
              {
                emailKey: "email_anare",    waKey: "whatsapp_anare",
                label: "ANARE-CI — Régulateur Électricité & Éclairage Public", icon: Scale, color: "text-amber-600",
                emailPlaceholder: "reclamation@anare.ci", waPlaceholder: "+225 07 00 00 00 00",
              },
              {
                emailKey: "email_sodeci",   waKey: "whatsapp_sodeci",
                label: "SODECI — Eau Potable (Concessionnaire)", icon: Droplets,     color: "text-sky-600",
                emailPlaceholder: "reclamation@sodeci.ci", waPlaceholder: "+225 07 00 00 00 00",
              },
              {
                emailKey: "email_onep",     waKey: "whatsapp_onep",
                label: "ONEP — Régulateur & Office National de l'Eau Potable", icon: ShieldCheck, color: "text-cyan-600",
                emailPlaceholder: "reclamation@onep.ci", waPlaceholder: "+225 07 00 00 00 00",
              },
            ].map(({ emailKey, waKey, label, icon: Icon, color, emailPlaceholder, waPlaceholder }) => (
              <div key={emailKey} className="space-y-2 border-b border-border/50 pb-4 last:border-0 last:pb-0">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                  {label}
                </label>
                {/* Email */}
                <input
                  type="email"
                  value={effectiveConfig[emailKey] ?? ""}
                  onChange={(e) =>
                    setDraftConfig({ ...(effectiveConfig as RelayConfig), [emailKey]: e.target.value })
                  }
                  placeholder={emailPlaceholder}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                {/* WhatsApp */}
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <input
                    type="tel"
                    value={effectiveConfig[waKey] ?? ""}
                    onChange={(e) =>
                      setDraftConfig({ ...(effectiveConfig as RelayConfig), [waKey]: e.target.value })
                    }
                    placeholder={waPlaceholder}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Mairies pilotes */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Mairies pilotes
              </p>
              <span className="text-xs text-muted-foreground">
                {MAIRIES_PILOTES.filter(
                  (m) => effectiveConfig[`mairie_${m.slug}_enabled`] === "true"
                ).length} / {MAIRIES_PILOTES.length} actives
              </span>
            </div>

            <p className="text-xs text-muted-foreground -mt-1">
              Seules les mairies activées <strong>avec un email renseigné</strong> recevront les relais.
            </p>

            <div className="space-y-2">
              {MAIRIES_PILOTES.map(({ slug, label }) => {
                const emailKey   = `mairie_${slug}_email`;
                const enabledKey = `mairie_${slug}_enabled`;
                const isEnabled  = effectiveConfig[enabledKey] === "true";
                const email      = effectiveConfig[emailKey] ?? "";
                const hasEmail   = email.trim().length > 0;

                return (
                  <div
                    key={slug}
                    className={`rounded-lg border p-3 transition-colors ${
                      isEnabled
                        ? hasEmail
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-amber-500/30 bg-amber-500/5"
                        : "border-border bg-muted/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`h-3.5 w-3.5 ${isEnabled ? "text-orange-500" : "text-muted-foreground/40"}`} />
                        <span className={`text-sm font-semibold ${isEnabled ? "text-foreground" : "text-muted-foreground"}`}>
                          {label}
                        </span>
                        {isEnabled && hasEmail && (
                          <span className="rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold px-1.5 py-0.5 border border-emerald-500/20">
                            Actif
                          </span>
                        )}
                        {isEnabled && !hasEmail && (
                          <span className="rounded-full bg-amber-500/10 text-amber-600 text-xs font-bold px-1.5 py-0.5 border border-amber-500/20">
                            Email manquant
                          </span>
                        )}
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) =>
                          setDraftConfig({
                            ...(effectiveConfig as RelayConfig),
                            [enabledKey]: checked ? "true" : "false",
                          })
                        }
                      />
                    </div>

                    <div className="mt-2.5">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) =>
                          setDraftConfig({ ...(effectiveConfig as RelayConfig), [emailKey]: e.target.value })
                        }
                        placeholder={`contact@mairie-${slug}.ci`}
                        disabled={!isEnabled}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bouton sauvegarder */}
          {(() => {
            const testModeBlocked =
              effectiveConfig.test_mode === "true" &&
              !effectiveConfig.test_email?.trim();
            const hasDraft = draftConfig !== null;
            return (
              <div className="space-y-2">
                {testModeBlocked && (
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                      Mode TEST actif — renseignez l'email de test avant de sauvegarder.
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {hasDraft ? "Modifications non sauvegardées" : "Configuration à jour"}
                  </p>
                  <Button
                    onClick={() => draftConfig && saveConfig.mutate(draftConfig)}
                    disabled={!hasDraft || saveConfig.isPending || testModeBlocked}
                    className="gap-1.5"
                  >
                    <Save className="h-4 w-4" />
                    {saveConfig.isPending ? "Sauvegarde…" : "Sauvegarder"}
                  </Button>
                </div>
              </div>
            );
          })()}
        </motion.div>

      ) : null}
    </div>
  );
};

export default AdminRelayPage;
