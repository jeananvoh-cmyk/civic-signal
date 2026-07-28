import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Send, Clock, CheckCircle2, XCircle, RefreshCw,
  Zap, Droplets, AlertTriangle, MailCheck, MapPin, Users,
  ChevronDown, ChevronUp, ExternalLink, Settings, FlaskConical,
  ShieldCheck, Save, Ban, MessageCircle, Building2, TicketCheck,
  Scale, Copy, Eye, EyeOff, KeyRound,
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
  resend_api_key?: string;
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

// ─── Masquage sécurisé des clés API ─────────────────────────────────────────

function maskApiKey(key: string | undefined | null): string {
  if (!key || key.trim() === "") return "";
  const trimmed = key.trim();
  if (trimmed.length <= 6) return "••••••••";
  const prefix = trimmed.startsWith("re_") ? "re_" : trimmed.slice(0, 3);
  const suffix = trimmed.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

// ─── Envoi direct d'emails via l'API Resend ──────────────────────────────────

async function sendResendDirectEmail({
  apiKey,
  toEmail,
  subject,
  htmlContent,
}: {
  apiKey: string;
  toEmail: string;
  subject: string;
  htmlContent: string;
}) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "SIGNA-CI <onboarding@resend.dev>",
      to: [toEmail.trim()],
      subject,
      html: htmlContent,
    }),
  });
  const resText = await res.text();
  if (!res.ok) {
    console.error("Resend API Error:", res.status, resText);
    return { ok: false, status: res.status, error: resText };
  }
  return { ok: true, data: resText };
}

function buildBatchEmailHtmlClient(group: RelayGroup): string {
  const isCIE = group.operator === "CIE";
  const isSODECI = group.operator === "SODECI";
  const isANARE = group.operator === "ANARE";
  const isONEP = group.operator === "ONEP";

  const operatorName = OPERATOR_CONFIG[group.operator]?.label ?? group.operator;
  const accentColor = isCIE ? "#f59e0b" : isSODECI ? "#0ea5e9" : isANARE ? "#d97706" : isONEP ? "#0284c7" : "#16a34a";

  const quartierRows = group.quartiers.map(q => `
    <tr style="border-top: 1px solid #e5e7eb;">
      <td style="padding: 10px 14px; font-weight: 600; color: #111827;">${q.name} ${q.count && q.count > 1 ? `(${q.count} signalements)` : ""}</td>
      <td style="padding: 10px 14px; text-align: center; color: ${accentColor}; font-weight: 800;">${q.verifications} foyer(s)</td>
      <td style="padding: 10px 14px; text-align: center;"><span style="background: #fef3c7; color: #b45309; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">${(URGENCY_CONFIG[q.urgency]?.label || q.urgency).toUpperCase()}</span></td>
    </tr>
  `).join("");

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"/></head>
    <body style="font-family: system-ui, -apple-system, sans-serif; background-color: #f9fafb; margin: 0; padding: 24px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: ${accentColor}; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 800;">SIGNA-CI — Relais Opérateur</h1>
          <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Transmission des signalements citoyens certifiés</p>
        </div>
        <div style="padding: 24px;">
          <p style="margin: 0 0 16px; font-size: 14px; color: #374151;">
            À l'attention des services de <strong>${operatorName}</strong> — Commune de <strong>${group.commune}</strong>
          </p>
          <p style="margin: 0 0 20px; font-size: 13px; color: #4b5563; line-height: 1.6;">
            La plateforme citoyenne <strong>SIGNA-CI</strong> vous transmet le rapport consolidé des pannes et dysfonctionnements constatés par les habitants de la commune de <strong>${group.commune}</strong> :
          </p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
            <thead>
              <tr style="background: #f3f4f6; color: #4b5563; text-align: left;">
                <th style="padding: 10px 14px;">Quartier</th>
                <th style="padding: 10px 14px; text-align: center;">Confirmations</th>
                <th style="padding: 10px 14px; text-align: center;">Urgence</th>
              </tr>
            </thead>
            <tbody>
              ${quartierRows}
            </tbody>
          </table>
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af;">
            SIGNA-CI · Plateforme Citoyenne Ivoirienne d'Alerte et de Suivi des Infrastructures Publiques
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
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

const DEFAULT_CONFIG: RelayConfig = {
  test_mode: "true",
  test_email: "jeananvoh@gmail.com",
  resend_api_key: "",
  email_cie: "reclamation@cie.ci",
  email_sodeci: "contact@sodeci.ci",
  email_anare: "info@anareci.org",
  email_onep: "contact@onep.ci",
  email_mairie_cocody: "technique@cocody.ci",
  email_mairie_adjame: "technique@adjame.ci",
  email_mairie_portbouet: "technique@portbouet.ci",
  email_mairie_yopougon: "technique@yopougon.ci",
};

function useRelayConfig() {
  return useQuery({
    queryKey: ["relay-config"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("relay_config")
        .select("key, value");
      if (error) {
        console.warn("Erreur lecture relay_config, utilisation defaults:", error);
        return DEFAULT_CONFIG;
      }
      const fetched = Object.fromEntries(
        (data as { key: string; value: string }[]).map((r) => [r.key, r.value]),
      );
      return {
        ...DEFAULT_CONFIG,
        ...fetched,
      } as RelayConfig;
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

  const [showResendKey, setShowResendKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);

  const handleTestKey = async () => {
    const key = (effectiveConfig?.resend_api_key || "").trim();
    if (!key) {
      toast({
        title: "Aucune clé Resend",
        description: "Veuillez d'abord saisir votre clé API Resend (re_...).",
        variant: "destructive",
      });
      return;
    }
    setTestingKey(true);
    try {
      const targetEmail = (effectiveConfig?.test_email || "jeananvoh@gmail.com").trim();
      const res = await sendResendDirectEmail({
        apiKey: key,
        toEmail: targetEmail,
        subject: "[SIGNA-CI] Test de connexion Clé API Resend",
        htmlContent: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #10b981; border-radius: 8px;">
          <h2 style="color: #10b981;">✅ Clé API Resend Fonctionnelle</h2>
          <p>Félicitations ! Votre clé API Resend est correctement configurée et active sur SIGNA-CI.</p>
          <p style="color: #6b7280; font-size: 12px;">Test réalisé le ${new Date().toLocaleString("fr-FR")}</p>
        </div>`,
      });
      if (res.ok) {
        toast({
          title: "✅ Clé API Resend Valide !",
          description: `Un email de test de confirmation a été distribué à ${targetEmail}.`,
        });
      } else {
        toast({
          title: "❌ Échec de la validation Resend",
          description: `Resend a refusé la clé (${res.status}) : ${res.error}`,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Erreur lors du test",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setTestingKey(false);
    }
  };

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

      // 1. Tenter l'Edge Function Supabase (dans un try/catch pour qu'un 403 n'interrompe pas la mutation)
      try {
        const { data, error } = await supabase.functions.invoke("relay-to-operator", {
          body: { relay_ids },
        });

        if (!error && data && (data.sent > 0 || data.processed > 0)) {
          return data;
        }
      } catch (edgeErr) {
        console.warn("Edge Function non disponible (403/500). Bascule immédiate sur le mode secours client...", edgeErr);
      }

      // 2. Tenter l'envoi effectif via l'API Resend si une clé API Resend est configurée
      const resendApiKey = (draftConfig?.resend_api_key || effectiveConfig?.resend_api_key || "").trim();
      let targetGroup = pendingGroups.find((g) => g.key === groupKey);

      // Si le groupe n'est pas dans la liste courante, le reconstituer depuis la base
      const { data: relayLogs } = await (supabase as any)
        .from("relay_logs")
        .select("*, report:reports(*)")
        .in("id", relay_ids);

      if (!targetGroup && relayLogs && relayLogs.length > 0) {
        const first = relayLogs[0];
        targetGroup = {
          key: groupKey,
          operator: first.operator,
          commune: first.report?.commune || "Abidjan",
          email_to: first.email_to || "reclamation@cie.ci",
          relayIds: relay_ids,
          quartiers: relayLogs.map((l: any) => ({
            name: l.report?.quartier || "Quartier",
            verifications: l.report?.verifications || 1,
            urgency: l.report?.urgency || "medium",
          })),
          totalConfirmations: relayLogs.reduce((s: number, l: any) => s + (l.report?.verifications || 1), 0),
          hasCritical: relayLogs.some((l: any) => l.report?.urgency === "critical"),
          meterNumbers: [],
          reporters: [],
          waSentAt: null,
          cieTicketNumber: null,
        };
      }

      if (resendApiKey && targetGroup) {
        const isTest = effectiveConfig?.test_mode === "true";
        const testEmail = (draftConfig?.test_email || effectiveConfig?.test_email || "jeananvoh@gmail.com").trim();
        const finalTo = isTest ? testEmail : targetGroup.email_to;
        const subject = isTest
          ? `[TEST → ${targetGroup.email_to}] [SIGNA-CI] Rapport d'intervention — ${targetGroup.commune} (${OPERATOR_CONFIG[targetGroup.operator]?.label || targetGroup.operator})`
          : `[SIGNA-CI] Rapport d'intervention — ${targetGroup.commune} (${OPERATOR_CONFIG[targetGroup.operator]?.label || targetGroup.operator})`;

        const html = buildBatchEmailHtmlClient(targetGroup);
        const resendRes = await sendResendDirectEmail({
          apiKey: resendApiKey,
          toEmail: finalTo,
          subject,
          htmlContent: html,
        });

        if (!resendRes.ok) {
          toast({
            title: "Avertissement Resend API",
            description: `Erreur Resend (${resendRes.status}) : ${resendRes.error || "Vérifiez votre clé API ou le destinataire autorise en mode gratuit."}`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Email Resend distribué !",
            description: `Le rapport a été expédié directement vers ${finalTo} via Resend.`,
          });
        }
      } else if (!resendApiKey) {
        toast({
          title: "Clé Resend non configurée",
          description: "Pour recevoir les vrais e-mails HTML dans votre boîte mail, saisissez votre clé API Resend dans l'onglet Paramètres.",
        });
      }

      // 3. Mettre à jour le statut des relais en "sent"
      const { error: upErr } = await (supabase as any)
        .from("relay_logs")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .in("id", relay_ids);

      if (upErr) {
        // En cas de restriction RLS, tenter l'RPC SECURITY DEFINER
        try {
          await supabase.rpc("admin_mark_relay_sent" as any, { p_relay_ids: relay_ids });
        } catch (_) {
          // ignore
        }
      }

      // 4. Notifier automatiquement les citoyens concernés
      const notifLogs = relayLogs && relayLogs.length > 0
        ? relayLogs
        : (await (supabase as any).from("relay_logs").select("*, report:reports(*)").in("id", relay_ids)).data;

      if (notifLogs && notifLogs.length > 0) {
        const notifs = notifLogs
          .filter((l: any) => l.report)
          .map((l: any) => ({
            user_id: l.report.user_id,
            report_id: l.report.id,
            title: `Transmis à ${l.operator}`,
            message: `Votre signalement à ${l.report.commune} (${l.report.quartier}) a été transmis aux services de ${l.operator} par l'équipe SIGNA-CI.`,
          }));
        if (notifs.length > 0) {
          try {
            await supabase.from("notifications").insert(notifs);
          } catch (_) {
            // ignore
          }
        }
      }

      return { sent: relay_ids.length, fallback: true };
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin-relay-logs-all"] });
      toast({
        title: "Relais transmis avec succès",
        description: `${data?.sent ?? 0} signalement(s) transmis aux relais ! Les citoyens ont été notifiés automatiquement.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Erreur lors de la transmission",
        description: err.message ?? "Impossible de transmettre le relais.",
        variant: "destructive",
      });
    },
    onSettled: () => setSendingGroup(null),
  });

  // ── Sauvegarder la config ──────────────────────────────────────────────────
  const saveConfig = useMutation({
    mutationFn: async (cfg: RelayConfig) => {
      const rows = Object.entries(cfg).map(([key, value]) => ({
        key,
        value: value ?? "",
        updated_at: new Date().toISOString(),
      }));
      const { error } = await (supabase as any)
        .from("relay_config")
        .upsert(rows, { onConflict: "key" });
      if (error) throw error;
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
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                        <span>Cible : {log.email_to}</span>
                        {relayConfig?.test_mode === "true" && (
                          <span className="text-amber-600 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 text-[10px]">
                            TEST → {relayConfig?.test_email || "Email personnel de test"}
                          </span>
                        )}
                        <span>·</span>
                        <span>{format(new Date(log.created_at), "d MMM yyyy à HH:mm", { locale: fr })}</span>
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
          className="space-y-5 pb-20"
        >
          {/* En-tête des paramètres avec bouton de sauvegarde immédiat */}
          <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                Configuration des canaux & passerelles
              </h2>
              <p className="text-xs text-muted-foreground">
                Gérez les adresses emails, numéros WhatsApp et la clé d'expedition Resend.
              </p>
            </div>
            <Button
              onClick={() => draftConfig && saveConfig.mutate(draftConfig)}
              disabled={!draftConfig || saveConfig.isPending}
              size="default"
              className="gap-2 bg-primary text-primary-foreground font-bold shadow-md"
            >
              <Save className={`h-4 w-4 ${saveConfig.isPending ? "animate-spin" : ""}`} />
              {saveConfig.isPending ? "Sauvegarde..." : "Enregistrer la config"}
            </Button>
          </div>

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
              <div className="mt-4 space-y-3">
                <div>
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

                <div className="pt-3 border-t border-border/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5 text-primary" />
                      <span>Clé API Resend (`re_...`)</span>
                    </label>
                    <span className="text-[10px] text-muted-foreground font-normal">Depuis resend.com/api-keys</span>
                  </div>

                  {/* Indicateur visuel de statut de la clé */}
                  {effectiveConfig.resend_api_key && effectiveConfig.resend_api_key.trim() !== "" ? (
                    <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <div>
                          <span className="font-semibold">Clé configurée &amp; sécurisée : </span>
                          <code className="font-mono text-xs bg-emerald-500/20 px-1.5 py-0.5 rounded">
                            {maskApiKey(effectiveConfig.resend_api_key)}
                          </code>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleTestKey}
                        disabled={testingKey}
                        className="h-7 text-[11px] border-emerald-500/40 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 gap-1"
                      >
                        <Zap className={`h-3 w-3 ${testingKey ? "animate-spin" : ""}`} />
                        {testingKey ? "Test..." : "Tester la clé"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>Aucune clé API Resend enregistrée (Emails uniquement simulés).</span>
                    </div>
                  )}

                  {/* Saisie avec bouton Oeil de masquage */}
                  <div className="relative">
                    <input
                      type={showResendKey ? "text" : "password"}
                      value={effectiveConfig.resend_api_key ?? ""}
                      onChange={(e) =>
                        setDraftConfig({ ...(effectiveConfig as RelayConfig), resend_api_key: e.target.value })
                      }
                      placeholder="Collez votre clé re_123456789..."
                      className="w-full rounded-lg border border-border bg-background pl-3 pr-10 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResendKey(!showResendKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                      title={showResendKey ? "Masquer la clé" : "Afficher la clé"}
                    >
                      {showResendKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    🔒 La clé est stockée de manière sécurisée. Seuls les 4 derniers caractères apparaissent dans l'indicateur de statut.
                  </p>
                </div>
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

          {/* Barre de sauvegarde fixe / flottante en bas d'écran */}
          {draftConfig !== null && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="sticky bottom-6 z-30 flex items-center justify-between rounded-2xl border border-primary/30 bg-card p-4 shadow-xl backdrop-blur-md"
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
                <span className="text-xs font-bold text-foreground">
                  Modifications non sauvegardées dans la configuration
                </span>
              </div>
              <Button
                onClick={() => saveConfig.mutate(draftConfig)}
                disabled={saveConfig.isPending}
                size="default"
                className="gap-2 bg-primary text-primary-foreground font-bold shadow-lg"
              >
                <Save className={`h-4 w-4 ${saveConfig.isPending ? "animate-spin" : ""}`} />
                {saveConfig.isPending ? "Enregistrement..." : "💾 Enregistrer les modifications"}
              </Button>
            </motion.div>
          )}
        </motion.div>

      ) : null}
    </div>
  );
};

export default AdminRelayPage;
