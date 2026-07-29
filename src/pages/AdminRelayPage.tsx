import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Send, Clock, CheckCircle2, XCircle, RefreshCw,
  Zap, Droplets, AlertTriangle, MailCheck, MapPin, Users,
  ChevronDown, ChevronUp, ExternalLink, Settings, FlaskConical,
  ShieldCheck, Save, Ban, MessageCircle, Building2, TicketCheck,
  Scale, Copy, Eye, EyeOff, KeyRound, Calendar, Filter, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, isToday, isThisWeek, isThisMonth, isThisYear, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { findNearestCommune } from "@/lib/communes";
import { extractInfraLabel, infraEmoji, cleanDescription } from "@/lib/report-display";

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
    created_at?: string | null;
    commune: string;
    location?: string | null;
    quartier: string;
    custom_quartier?: string | null;
    address_text?: string | null;
    landmark?: string | null;
    description?: string | null;
    category?: string | null;
    service_type: string;
    verifications: number;
    urgency: string;
    meter_number?: string | null;
    contract_type?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    user_id?: string;
    reporter_phone?: string | null;
    profile_commune?: string | null;
    profile_quartier?: string | null;
  };
}

interface RelayGroup {
  key: string;
  operator: "CIE" | "SODECI" | "MAIRIE" | "ONEP" | "ANARE";
  commune: string;
  email_to: string;
  relayIds: string[];
  quartiers: Array<{
    name: string;
    verifications: number;
    urgency: string;
    count?: number;
    addressText?: string | null;
    landmark?: string | null;
    description?: string | null;
    category?: string | null;
    serviceType?: string | null;
    createdAt?: string | null;
    lat?: number | null;
    lng?: number | null;
    reportId?: string | null;
  }>;
  totalConfirmations: number;
  hasCritical: boolean;
  meterNumbers: string[];
  reporters: Array<{ phone: string | null; meterNumber: string | null; contractType: string | null; quartier: string }>;
  waSentAt: string | null;
  cieTicketNumber: string | null;
}

const KNOWN_COMMUNES = [
  "Abobo", "Adjamé", "Attécoubé", "Anyama", "Bingerville",
  "Cocody", "Koumassi", "Marcory", "Port-Bouët", "Songon",
  "Treichville", "Yopougon", "Bouaké", "Yamoussoukro", "San-Pédro",
  "Korhogo", "Man", "Daloa", "Gagnoa", "Grand-Bassam"
];

function isGenericCommune(c?: string | null): boolean {
  if (!c || !c.trim()) return true;
  const lower = c.trim().toLowerCase();
  return (
    lower === "abidjan" ||
    lower === "commune de abidjan" ||
    lower === "commune d'abidjan" ||
    lower === "ville d'abidjan" ||
    lower === "inconnu" ||
    lower === "__other" ||
    lower === "autre"
  );
}

function isGenericQuartier(q?: string | null): boolean {
  if (!q || !q.trim()) return true;
  const lower = q.trim().toLowerCase();
  return (
    lower === "secteur non spécifié" ||
    lower === "non spécifié" ||
    lower === "non renseigné" ||
    lower === "__other" ||
    lower === "autre" ||
    lower === "autre quartier" ||
    lower === "autre secteur" ||
    lower === "aucun" ||
    lower === "inconnu" ||
    lower === "abidjan" ||
    lower === "commune de abidjan"
  );
}

function resolveCommuneName(
  commune?: string | null,
  location?: string | null,
  lat?: number | null,
  lng?: number | null,
  profileCommune?: string | null,
  description?: string | null,
  addressText?: string | null,
  landmark?: string | null,
  notifTitle?: string | null,
  notifMessage?: string | null
): string {
  // 1. Si la commune est valide et spécifique (ex: Cocody, Yopougon, Port-Bouët...)
  if (!isGenericCommune(commune)) {
    return commune!.trim();
  }

  // 2. Chercher dans notifTitle & notifMessage (ex: "💡 Infra. CIE — Cocody, Riviéra Bonoumin")
  const notifText = `${notifTitle ?? ""} ${notifMessage ?? ""}`;
  if (notifText.trim()) {
    for (const kc of KNOWN_COMMUNES) {
      if (notifText.toLowerCase().includes(kc.toLowerCase())) return kc;
    }
  }

  // 3. Si GPS présent, trouver la vraie commune géolocalisée par coordonnées
  if (lat && lng && lat !== 0 && lng !== 0) {
    const res = findNearestCommune(lat, lng);
    if (res.commune?.nom) {
      return res.commune.nom;
    }
  }

  // 4. Chercher dans location (ex: "Cocody, Riviéra 2" -> "Cocody")
  if (!isGenericCommune(location)) {
    for (const kc of KNOWN_COMMUNES) {
      if (location!.toLowerCase().includes(kc.toLowerCase())) return kc;
    }
  }

  // 5. Chercher dans description / addressText / landmark
  const combinedText = `${description ?? ""} ${addressText ?? ""} ${landmark ?? ""}`;
  if (combinedText.trim()) {
    for (const kc of KNOWN_COMMUNES) {
      if (combinedText.toLowerCase().includes(kc.toLowerCase())) return kc;
    }
  }

  // 6. Chercher dans le profil de l'utilisateur
  if (!isGenericCommune(profileCommune)) {
    return profileCommune!.trim();
  }

  return "Abidjan";
}

function cleanQuartierName(
  quartier?: string | null,
  customQuartier?: string | null,
  addressText?: string | null,
  landmark?: string | null,
  profileQuartier?: string | null,
  description?: string | null,
  location?: string | null,
  reportId?: string | null,
  notifTitle?: string | null,
  notifMessage?: string | null
): string {
  // 1. Si custom_quartier est saisi et valide (ex: "Bonoumin", "Maroc", "Remblais"...)
  if (!isGenericQuartier(customQuartier)) {
    return customQuartier!.trim();
  }

  // 2. Si quartier est saisi et valide (ex: "Gonzagueville", "Angré"...)
  if (!isGenericQuartier(quartier)) {
    return quartier!.trim();
  }

  // 3. Extraire du titre de notification (ex: "💡 Infra. CIE — Cocody, Riviéra Bonoumin" -> "Riviéra Bonoumin")
  if (notifTitle && notifTitle.includes("—")) {
    const afterDash = notifTitle.split("—")[1]?.trim();
    if (afterDash && afterDash.includes(",")) {
      const qPart = afterDash.split(",")[1]?.trim();
      if (!isGenericQuartier(qPart)) return qPart;
    } else if (afterDash && !isGenericQuartier(afterDash)) {
      return afterDash;
    }
  }

  // 4. Tenter d'extraire le quartier de location (ex: "Cocody, Riviéra Bonoumin" -> "Riviéra Bonoumin")
  if (location && location.trim()) {
    const parts = location.split(/[,·\-]/).map((p) => p.trim()).filter((p) => p.length > 0);
    for (const part of parts) {
      if (!isGenericCommune(part) && !isGenericQuartier(part)) {
        return part;
      }
    }
  }

  // 5. Si un repère ou lieu-dit est saisi (ex: "Près du carrefour Sodeci")
  if (landmark && landmark.trim()) {
    return `Secteur ${landmark.trim()}`;
  }

  // 6. Si une adresse texte est saisie
  if (addressText && addressText.trim()) {
    return addressText.trim();
  }

  // 7. Si le profil utilisateur contient un quartier valide
  if (!isGenericQuartier(profileQuartier)) {
    return profileQuartier!.trim();
  }

  // 8. Extraire une adresse/quartier de la description (ex: "Coupure vers la pharmacie...")
  if (description && description.trim()) {
    const cleanDesc = description.replace(/\[.*?\]/g, "").trim();
    if (cleanDesc.length > 0) {
      return cleanDesc.length > 35 ? cleanDesc.slice(0, 32) + "…" : cleanDesc;
    }
  }

  // 9. Rendre chaque signalement unique avec sa référence si tout le reste est manquant
  return reportId ? `Secteur non spécifié (#${reportId.slice(0, 6)})` : "Secteur non spécifié";
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
  test_mode:           string;
  test_email:          string;
  cc_email:            string;
  resend_api_key?:     string;
  email_cie:           string;
  email_sodeci:        string;
  email_onep:          string;
  email_anare:         string;
  whatsapp_cie:        string;
  whatsapp_sodeci:     string;
  whatsapp_onep:       string;
  whatsapp_anare:      string;
  anare_auto_dispatch?: string;
  onep_auto_dispatch?:  string;
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
  ccEmail,
  subject,
  htmlContent,
}: {
  apiKey: string;
  toEmail: string;
  ccEmail?: string;
  subject: string;
  htmlContent: string;
}) {
  const cleanKey = apiKey.trim();
  const cleanTo = toEmail.trim().toLowerCase();
  const cleanCc = ccEmail ? ccEmail.trim().toLowerCase() : "";

  if (!cleanKey) {
    return { ok: false, status: 400, error: "Aucune clé API Resend renseignée dans l'onglet Paramètres." };
  }

  const fromVariants = [
    "SIGNA-CI <contact@signa.ci>",
    "contact@signa.ci",
    "SIGNA-CI <onboarding@resend.dev>",
    "onboarding@resend.dev",
  ];

  const endpoints = [
    "/api/resend-proxy",
    "https://api.resend.com/emails",
  ];

  let bestError = "Impossible de contacter le serveur d'envoi Resend.";
  let bestStatus = 500;

  for (const fromAddr of fromVariants) {
    for (const endpoint of endpoints) {
      try {
        const payload: any = {
          from: fromAddr,
          to: [cleanTo],
          subject,
          html: htmlContent,
        };
        if (cleanCc && cleanCc !== cleanTo) {
          payload.cc = [cleanCc];
        }

        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${cleanKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const resText = await res.text();
        let parsed: any = null;
        try {
          parsed = JSON.parse(resText);
        } catch (_) {}

        if (res.ok && (parsed?.id || res.status === 200)) {
          return { ok: true, data: resText, id: parsed?.id || "sent-ok" };
        }

        const errorMsg = parsed?.message || parsed?.name || resText || `Erreur HTTP ${res.status}`;
        bestError = errorMsg;
        bestStatus = res.status;

        if (res.status === 403 || errorMsg.toLowerCase().includes("sandbox") || errorMsg.toLowerCase().includes("only send to")) {
          break;
        }
      } catch (err: any) {
        if (err?.message && !err.message.includes("fetch")) {
          bestError = err.message;
        }
      }
    }
  }

  if (bestStatus === 403 || bestError.toLowerCase().includes("only send to") || bestError.toLowerCase().includes("sandbox")) {
    bestError = `Resend restreint l'envoi vers (${cleanTo}). Pour tester l'envoi, renseignez votre email dans "Email de test" dans l'onglet Paramètres ou basculez en mode TEST.`;
  } else if (bestStatus === 401 || bestError.toLowerCase().includes("api key")) {
    bestError = "La clé API Resend renseignée est invalide. Veuillez vérifier votre clé (re_...) dans Paramètres.";
  }

  return { ok: false, status: bestStatus, error: bestError };
}

// ─── Helpers de Date Sécurisés ────────────────────────────────────────────────

function safeParseDate(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  try {
    const parsed = parseISO(dateStr);
    if (isNaN(parsed.getTime())) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

function safeIsToday(dateStr?: string | null): boolean {
  const d = safeParseDate(dateStr);
  return d ? isToday(d) : false;
}

function safeIsThisWeek(dateStr?: string | null): boolean {
  const d = safeParseDate(dateStr);
  return d ? isThisWeek(d, { locale: fr }) : false;
}

function safeIsThisMonth(dateStr?: string | null): boolean {
  const d = safeParseDate(dateStr);
  return d ? isThisMonth(d) : false;
}

function safeIsThisYear(dateStr?: string | null): boolean {
  const d = safeParseDate(dateStr);
  return d ? isThisYear(d) : false;
}

function safeFormatDate(dateStr?: string | null, pattern: string = "d MMMM yyyy à HH:mm"): string {
  const d = safeParseDate(dateStr);
  if (!d) return "Date inconnue";
  try {
    return format(d, pattern, { locale: fr });
  } catch (_) {
    return "Date inconnue";
  }
}

function safeFormatDuration(dateStr?: string | null): string {
  const d = safeParseDate(dateStr);
  if (!d) return "";
  try {
    const diffMs = Date.now() - d.getTime();
    if (diffMs <= 0) return "Aujourd'hui";
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays <= 0) return `En cours depuis ${diffHours}h`;
    const remHours = diffHours % 24;
    return `En cours depuis ${diffDays}j ${remHours}h`;
  } catch (_) {
    return "";
  }
}

function buildBatchEmailHtmlClient(group: RelayGroup): string {
  const isCIE = group.operator === "CIE";
  const isSODECI = group.operator === "SODECI";
  const isANARE = group.operator === "ANARE";
  const isONEP = group.operator === "ONEP";
  const isMairie = group.operator === "MAIRIE";

  const isInfraGroup = isMairie || group.operator === "MAIRIE" || isANARE || group.operator === "ANARE" || group.quartiers.some(q => {
    const tag = q.description ? extractInfraLabel(q.description) : null;
    return Boolean(tag) || q.category === "infrastructure" || q.category === "eclairage_public" || q.category === "voirie" || q.category === "lampadaire" || q.category === "poteau_electrique" || q.category === "canalisation" || q.category === "egout" || q.category === "fuite_eau_exterieure";
  });

  const serviceEmoji = isCIE ? "⚡" : isSODECI ? "💧" : isANARE ? "⚖️" : isONEP ? "💧" : "🏗️";
  const serviceTitle = isANARE
    ? "Alerte Réglementaire — Infrastructure Électrique (CIE)"
    : isONEP
    ? "Alerte Réglementaire — Infrastructure Hydraulique (SODECI)"
    : isCIE && isInfraGroup
    ? "Signalement Infrastructure Publique (CIE)"
    : isCIE
    ? "Coupure d'électricité / Incident Électrique"
    : isSODECI && isInfraGroup
    ? "Signalement Infrastructure Publique (SODECI)"
    : isSODECI
    ? "Coupure d'eau / Inondation"
    : "Signalement Voirie & Infrastructure";

  const gradientHeader = isANARE || isONEP
    ? "linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%)"
    : isCIE
    ? "linear-gradient(135deg, #0284c7 0%, #d97706 100%)"
    : isSODECI
    ? "linear-gradient(135deg, #0284c7 0%, #0891b2 100%)"
    : "linear-gradient(135deg, #ea580c 0%, #d97706 100%)";

  const nowStr = format(new Date(), "d MMMM yyyy 'à' HH:mm", { locale: fr });

  const introText = isANARE || group.operator === "ANARE"
    ? `En tant qu'Autorité de Régulation du secteur de l'électricité (<strong>ANARE-CI</strong>), nous vous transmettons ce signalement d'infrastructure publique électrique à risque gérée par la <strong>CIE</strong>. Ce signalement via <strong>SIGNA-CI</strong> a été vu et est soutenu par <strong style="color: #16a34a;">${group.totalConfirmations} citoyen.ne(s)</strong> voulant une intervention et réparation rapide. Votre suivi réglementaire auprès de la CIE et l'intervention des services techniques seront appréciés pour une résolution rapide.`
    : isMairie || group.operator === "MAIRIE"
    ? `Ce signalement d'infrastructure publique via <strong>SIGNA-CI</strong> a été vu et est soutenu par <strong style="color: #16a34a;">${group.totalConfirmations} citoyen.ne(s)</strong> voulant une intervention et réparation rapide. L'intervention des services techniques de la mairie de <strong>${group.commune}</strong>.`
    : isInfraGroup
    ? `Ce signalement d'infrastructure publique via <strong>SIGNA-CI</strong> a été vu et est soutenu par <strong style="color: #16a34a;">${group.totalConfirmations} citoyen.ne(s)</strong> voulant une intervention et réparation rapide. L'intervention de vos services techniques sera appréciée.`
    : `Ce signalement a été <strong style="color: #16a34a;">confirmé par ${group.totalConfirmations} foyer(s) ou plus</strong> dans le même quartier via la plateforme <span style="background: #fef08a; color: #854d0e; padding: 2px 6px; border-radius: 4px; font-weight: 700;">SIGNA-CI</span>. Il nécessite votre intervention.`;

  const cardsHtml = group.quartiers.map((q, idx) => {
    const isCrit = q.urgency === "critical";
    const isHigh = q.urgency === "high";
    const urgencyDot = isCrit ? "🔴" : isHigh ? "🟠" : "🟡";
    const urgencyText = (URGENCY_CONFIG[q.urgency]?.label || q.urgency).toUpperCase();

    const extractedTag = (q.description && q.description.trim()) ? extractInfraLabel(q.description.trim()) : null;
    const typeLabel = extractedTag || (q.category ? q.category.replace(/_/g, " ") : null);
    const categoryLabel = typeLabel
      ? `${infraEmoji(typeLabel)} ${typeLabel.toUpperCase()}`
      : isMairie ? "🏗️ INFRASTRUCTURE / VOIRIE" : isCIE ? "⚡ ÉLECTRICITÉ" : "💧 EAU POTABLE";

    const gpsRow = (q.lat && q.lng)
      ? `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 14px 20px; color: #64748b; font-weight: 500;">Géolocalisation GPS</td>
          <td style="padding: 14px 20px; color: #0f172a; font-weight: 700;">
            📍 Lat: <code>${q.lat.toFixed(5)}</code>, Lng: <code>${q.lng.toFixed(5)}</code>
            <div style="margin-top: 6px;">
              <a href="https://www.google.com/maps/search/?api=1&query=${q.lat},${q.lng}" target="_blank" style="display: inline-block; padding: 6px 12px; background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; border-radius: 6px; font-size: 11px; font-weight: 700; text-decoration: none;">
                📍 Localiser l'incident sur Google Maps
              </a>
            </div>
          </td>
        </tr>
      `
      : `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 14px 20px; color: #64748b; font-weight: 500;">Géolocalisation GPS</td>
          <td style="padding: 14px 20px; color: #94a3b8; font-style: italic;">Non transmise par le citoyen</td>
        </tr>
      `;

    const locParts: string[] = [];
    if (q.description && q.description.trim()) {
      const cleaned = cleanDescription(q.description.trim());
      if (cleaned) locParts.push(cleaned);
    }
    if (q.landmark && q.landmark.trim()) locParts.push(`Repère : ${q.landmark.trim()}`);
    if (q.addressText && q.addressText.trim()) locParts.push(`Adresse : ${q.addressText.trim()}`);
    const fullDesc = locParts.length > 0 ? locParts.join(" · ") : `${serviceTitle} à ${group.commune}`;

    const isInfra = isMairie || group.operator === "MAIRIE" || isANARE || group.operator === "ANARE" || Boolean(extractedTag) || q.category === "infrastructure" || q.category === "eclairage_public" || q.category === "voirie" || q.category === "lampadaire" || q.category === "poteau_electrique" || q.category === "canalisation" || q.category === "egout" || q.category === "fuite_eau_exterieure";
    const confirmationLabel = isInfra ? "Soutien & votes citoyens" : "Confirmations voisins";
    const confirmationValue = isInfra
      ? `<span style="color: #16a34a; font-weight: 800;">${q.verifications} citoyen.ne(s) soutiennent pour une réparation urgente</span>`
      : `<span style="color: #16a34a; font-weight: 800;">${q.verifications} foyer(s) impacté(s)</span>`;

    return `
      <div style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: #ffffff; margin-bottom: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
        <div style="background: #f8fafc; padding: 12px 20px; border-bottom: 1px solid #e5e7eb; font-size: 11px; font-weight: 800; color: #64748b; letter-spacing: 1px; text-transform: uppercase;">
          DÉTAILS DU SIGNALEMENT ${group.quartiers.length > 1 ? `#${idx + 1}` : ""}
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tbody>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 14px 20px; color: #64748b; font-weight: 500; width: 38%;">Type / Catégorie</td>
              <td style="padding: 14px 20px; color: #0284c7; font-weight: 800;">${categoryLabel}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 14px 20px; color: #64748b; font-weight: 500;">Commune</td>
              <td style="padding: 14px 20px; color: #0f172a; font-weight: 800;">${group.commune}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 14px 20px; color: #64748b; font-weight: 500;">Quartier / Secteur</td>
              <td style="padding: 14px 20px; color: #0f172a; font-weight: 800;">${q.name}</td>
            </tr>
            ${(q.lat && q.lng) ? `
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 14px 20px; color: #64748b; font-weight: 500;">Géolocalisation GPS</td>
              <td style="padding: 14px 20px; color: #0f172a; font-weight: 700;">
                📍 Lat: <code>${q.lat.toFixed(5)}</code>, Lng: <code>${q.lng.toFixed(5)}</code>
                <div style="margin-top: 6px;">
                  <a href="https://www.google.com/maps/search/?api=1&query=${q.lat},${q.lng}" target="_blank" style="display: inline-block; padding: 6px 12px; background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; border-radius: 6px; font-size: 11px; font-weight: 700; text-decoration: none;">
                    📍 Localiser l'incident sur Google Maps
                  </a>
                </div>
              </td>
            </tr>
            ` : ""}
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 14px 20px; color: #64748b; font-weight: 500;">${confirmationLabel}</td>
              <td style="padding: 14px 20px;">${confirmationValue}</td>
            </tr>
            ${q.createdAt ? `
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 14px 20px; color: #64748b; font-weight: 500;">Date du signalement</td>
              <td style="padding: 14px 20px; color: #334155; font-weight: 700;">
                📅 ${safeFormatDate(q.createdAt, "d MMMM yyyy 'à' HH:mm")}
                ${safeFormatDuration(q.createdAt) ? `<span style="color: #dc2626; font-size: 12px; font-weight: 800; margin-left: 8px;">(${safeFormatDuration(q.createdAt)})</span>` : ""}
              </td>
            </tr>
            ` : ""}
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 14px 20px; color: #64748b; font-weight: 500;">Niveau d'urgence</td>
              <td style="padding: 14px 20px; color: #0f172a; font-weight: 800;">
                <span style="display: inline-flex; align-items: center; gap: 6px;">
                  ${urgencyDot} <strong>${urgencyText}</strong>
                </span>
              </td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 14px 20px; color: #64748b; font-weight: 500; vertical-align: top;">Description / Précisions</td>
              <td style="padding: 14px 20px; color: #334155; font-weight: 500; line-height: 1.5;">
                ${fullDesc}
              </td>
            </tr>
            ${q.reportId ? `
            <tr>
              <td style="padding: 14px 20px; color: #64748b; font-weight: 500;">Fiche de l'incident</td>
              <td style="padding: 14px 20px;">
                <a href="https://signa.ci/signalement/${q.reportId}" target="_blank" style="display: inline-block; padding: 6px 14px; background: #0284c7; color: #ffffff; border-radius: 6px; font-size: 12px; font-weight: 800; text-decoration: none;">
                  🔗 Consulter le déroulé de l'incident sur SIGNA-CI
                </a>
              </td>
            </tr>
            ` : ""}
          </tbody>
        </table>
      </div>
    `;
  }).join("");

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"/></head>
    <body style="font-family: system-ui, -apple-system, sans-serif; background-color: #f3f4f6; margin: 0; padding: 24px;">
      <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08);">
        
        <!-- Prototype Gradient Header -->
        <div style="background: ${gradientHeader}; padding: 28px 24px; color: #ffffff;">
          <div style="display: table; width: 100%; margin-bottom: 12px;">
            <div style="display: table-cell; vertical-align: middle; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,0.95);">
              SIGNALEMENT CITOYEN VÉRIFIÉ — <span style="background: rgba(255,255,255,0.25); padding: 2px 6px; border-radius: 4px; color: #ffffff;">SIGNA-CI</span>
            </div>
            <div style="display: table-cell; vertical-align: middle; text-align: right;">
              <span style="background: rgba(255,255,255,0.25); color: #ffffff; padding: 4px 14px; border-radius: 20px; font-weight: 800; font-size: 12px; display: inline-block;">
                ${group.operator}
              </span>
            </div>
          </div>
          <h1 style="margin: 0; font-size: 26px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
            ${serviceEmoji} ${serviceTitle}
          </h1>
        </div>

        <!-- Body Content -->
        <div style="padding: 24px;">
          
          <p style="margin: 0 0 20px; font-size: 15px; color: #374151; line-height: 1.6;">
            ${introText}
          </p>

          <!-- Cards per quartier/report -->
          ${cardsHtml}

          ${group.reporters && group.reporters.length > 0 ? `
            <div style="margin-top: 20px; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
              <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 8px;">📋 Contacts Citoyens Référents :</div>
              <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #334155; line-height: 1.6;">
                ${group.reporters.map(r => `
                  <li>
                    ${r.quartier ? `<strong>${r.quartier}</strong> : ` : ""}
                    ${r.meterNumber ? `Compteur <code>${r.meterNumber}</code> (${r.contractType === "postpaid" ? "Postpayé" : "Prépayé"})` : ""}
                    ${r.phone ? ` · Tel: <strong>${r.phone}</strong>` : ""}
                  </li>
                `).join("")}
              </ul>
            </div>
          ` : ""}

          ${isANARE ? `
            <div style="margin-top: 20px; padding: 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; font-size: 13px; color: #1e40af; line-height: 1.6;">
              <strong>⚖️ Partenariat Réglementaire & Suivi Citoyen (ANARE-CI / SIGNA-CI) :</strong><br/>
              Cette transmission directe s'inscrit dans le cadre du renforcement du suivi citoyen et de la régulation proactive des infrastructures électriques sur le territoire ivoirien. SIGNA-CI se tient à la disposition de l'ANARE-CI pour établir une passerelle d'échange permanente et optimiser la résolution des anomalies d'infrastructures auprès du concessionnaire CIE.
            </div>
          ` : ""}

          <!-- Footer -->
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #6b7280; line-height: 1.5;">
            <strong>SIGNA-CI</strong> · Plateforme Citoyenne Ivoirienne d'Alerte et de Suivi des Infrastructures Publiques
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
    const dateStr = q.createdAt ? safeFormatDate(q.createdAt, "d MMMM yyyy à HH:mm") : null;
    const durationStr = q.createdAt ? safeFormatDuration(q.createdAt) : null;

    const details: string[] = [];
    details.push(`• *Incident à ${group.commune} · ${q.name}*${sigCount}`);
    details.push(`  - Type : ${q.description ? `"${q.description}"` : q.category ? q.category.replace(/_/g, " ") : (q.serviceType === "electricity" ? "Électricité" : q.serviceType === "water" ? "Eau potable" : "Voirie & Infrastructure")}`);
    if (q.landmark) details.push(`  - Repère : ${q.landmark}`);
    if (q.addressText) details.push(`  - Adresse : ${q.addressText}`);
    if (dateStr) details.push(`  - Date : Signalé le ${dateStr}${durationStr ? ` (${durationStr})` : ""}`);
    details.push(`  - Soutiens / Votants : ${q.verifications} citoyen.ne(s) — Urgence ${urgLabel}`);
    if (q.lat && q.lng) details.push(`  - Localisation GPS : https://www.google.com/maps/search/?api=1&query=${q.lat},${q.lng}`);
    if (q.reportId) details.push(`  - Fiche Incident : https://signa.ci/signalement/${q.reportId}`);

    return details.join("\n");
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
    `— L'équipe SIGNA-CI (https://signa.ci)`,
  ];
  return lines.join("\n");
}

function buildBatchEmailTextClient(group: RelayGroup): string {
  return buildWhatsAppMessage(group);
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
  cc_email: "jeananvoh@gmail.com",
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
      try {
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

        const reportIds = [...new Set((data as any[]).map((r: any) => r?.report_id).filter((id): id is string => typeof id === "string" && id.trim().length > 5))];
        if (reportIds.length === 0) return (data as any[]).map((log: any) => ({ ...log, report: null })) as RelayLog[];

        const { data: reports } = await supabase
          .from("reports")
          .select("*")
          .in("id", reportIds);

        const userIds = [...new Set((reports ?? []).map((r: any) => r?.user_id).filter(Boolean))];
        const { data: profiles } = userIds.length > 0
          ? await supabase.from("profiles").select("user_id, phone, commune, quartier").in("user_id", userIds as string[])
          : { data: [] };

        const { data: notifs } = await supabase
          .from("notifications")
          .select("report_id, title, message")
          .in("report_id", reportIds);

        const notifMap = new Map((notifs ?? []).map((n: any) => [n.report_id, n]));
        const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
        const reportMap = new Map((reports ?? []).map((r: any) => {
          const prof = profileMap.get(r.user_id);
          const notif = notifMap.get(r.id);
          return [r.id, {
            ...r,
            reporter_phone: prof?.phone ?? null,
            profile_commune: prof?.commune ?? null,
            profile_quartier: prof?.quartier ?? null,
            notif_title: notif?.title ?? null,
            notif_message: notif?.message ?? null,
          }];
        }));

        return (data as any[]).map((log: any) => ({
          ...log,
          report: reportMap.get(log.report_id) ?? null,
        })) as RelayLog[];
      } catch (err) {
        console.error("Erreur critique chargement relay_logs:", err);
        return [] as RelayLog[];
      }
    },
    refetchInterval: enabled ? 15_000 : false,
    staleTime: 5_000,
  });
}

// ─── Groupement des pending ───────────────────────────────────────────────────

function groupPending(logs: RelayLog[] = []): RelayGroup[] {
  if (!Array.isArray(logs)) return [];
  const map = new Map<string, RelayGroup>();

  for (const log of logs) {
    if (!log || (log.status && log.status !== "pending")) continue;
    const operator = log.operator || "MAIRIE";
    const rep: any = log.report ?? {
      id: log.report_id || "unknown",
      created_at: log.created_at || new Date().toISOString(),
      commune: "Abidjan",
      quartier: "Secteur non spécifié",
      service_type: operator === "CIE" ? "electricity" : operator === "SODECI" ? "water" : "infrastructure",
      verifications: 1,
      urgency: "medium",
      reporter_phone: null,
    };

    const communeName = resolveCommuneName(
      rep.commune,
      rep.location,
      rep.latitude,
      rep.longitude,
      rep.profile_commune,
      rep.description,
      rep.address_text,
      rep.landmark,
      rep.notif_title,
      rep.notif_message
    );

    const key = `${operator}::${communeName}`;
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

    const cleanQ = cleanQuartierName(
      rep.quartier,
      rep.custom_quartier,
      rep.address_text,
      rep.landmark,
      rep.profile_quartier,
      rep.description,
      rep.location,
      rep.id,
      rep.notif_title,
      rep.notif_message
    );
    const existing = g.quartiers.find((q) => q.reportId && q.reportId === rep.id);
    if (existing) {
      existing.verifications += rep.verifications || 1;
      const urgencyRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      if ((urgencyRank[rep.urgency] ?? 0) > (urgencyRank[existing.urgency] ?? 0)) {
        existing.urgency = rep.urgency;
      }
      if (!existing.createdAt && (rep.created_at || log.created_at)) {
        existing.createdAt = rep.created_at || log.created_at;
      }
    } else {
      g.quartiers.push({
        name: cleanQ,
        verifications: rep.verifications || 1,
        urgency: rep.urgency || "medium",
        count: 1,
        addressText: rep.address_text,
        landmark: rep.landmark,
        description: rep.description,
        category: rep.category,
        serviceType: rep.service_type,
        createdAt: rep.created_at || log.created_at,
        lat: rep.latitude,
        lng: rep.longitude,
        reportId: rep.id,
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
  const [historyPeriod, setHistoryPeriod] = useState<"all" | "today" | "week" | "month" | "year">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sendingGroup, setSendingGroup] = useState<string | null>(null);

  const [pendingOpFilter, setPendingOpFilter] = useState<string>("ALL");
  const [bulkSending, setBulkSending] = useState<boolean>(false);

  const { data: relayConfig, refetch: refetchConfig } = useRelayConfig();
  const [draftConfig, setDraftConfig] = useState<RelayConfig | null>(null);
  const effectiveConfig = draftConfig ?? relayConfig;

  // Modale de confirmation de sécurité Mode Production
  const [prodModalConfig, setProdModalConfig] = useState<{
    isOpen: boolean;
    isBulk: boolean;
    relayIds?: string[];
    groupKey?: string;
    opFilter?: string;
    targetTitle?: string;
    destEmail?: string;
    count?: number;
  }>({ isOpen: false, isBulk: false });

  const handleRequestSendSingle = (group: RelayGroup) => {
    const isTest = (draftConfig?.test_mode ?? effectiveConfig?.test_mode) === "true";
    if (!isTest) {
      setProdModalConfig({
        isOpen: true,
        isBulk: false,
        relayIds: group.relayIds,
        groupKey: group.key,
        targetTitle: `${group.commune} (${OPERATOR_CONFIG[group.operator]?.label || group.operator})`,
        destEmail: group.email_to,
        count: group.quartiers.length,
      });
    } else {
      sendGroup.mutate({ relay_ids: group.relayIds, groupKey: group.key });
    }
  };

  const handleRequestSendBulk = (opFilter: string) => {
    const isTest = (draftConfig?.test_mode ?? effectiveConfig?.test_mode) === "true";
    const targets = pendingGroups.filter((g) => opFilter === "ALL" || g.operator === opFilter);
    if (targets.length === 0) return;

    if (!isTest) {
      setProdModalConfig({
        isOpen: true,
        isBulk: true,
        opFilter,
        targetTitle: opFilter === "ALL" ? "Tous les opérateurs" : OPERATOR_CONFIG[opFilter as keyof typeof OPERATOR_CONFIG]?.label || opFilter,
        destEmail: opFilter === "ALL" ? "Adresses officielles de tous les groupes" : targets[0]?.email_to,
        count: targets.length,
      });
    } else {
      sendAllOperatorGroups(opFilter);
    }
  };

  const [showResendKey, setShowResendKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);

  const handleTestKey = async () => {
    const key = (draftConfig?.resend_api_key || effectiveConfig?.resend_api_key || "").trim();
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

  const filteredHistoryLogs = historyLogs.filter((log) => {
    if (historyPeriod === "all") return true;
    const dateStr = log.sent_at || log.created_at;
    if (!dateStr) return true;
    if (historyPeriod === "today") return safeIsToday(dateStr);
    if (historyPeriod === "week") return safeIsThisWeek(dateStr);
    if (historyPeriod === "month") return safeIsThisMonth(dateStr);
    if (historyPeriod === "year") return safeIsThisYear(dateStr);
    return true;
  });

  const historyPeriodCounts = {
    all: historyLogs.length,
    today: historyLogs.filter((l) => safeIsToday(l.sent_at || l.created_at)).length,
    week: historyLogs.filter((l) => safeIsThisWeek(l.sent_at || l.created_at)).length,
    month: historyLogs.filter((l) => safeIsThisMonth(l.sent_at || l.created_at)).length,
    year: historyLogs.filter((l) => safeIsThisYear(l.sent_at || l.created_at)).length,
  };

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

      if (!resendApiKey) {
        throw new Error("Aucune clé API Resend n'est configurée dans l'onglet Paramètres. Veuillez saisir votre clé API Resend (re_...).");
      }

      if (!targetGroup) {
        throw new Error("Impossible de récupérer les détails du groupe de signalements.");
      }

      const isTest = (draftConfig?.test_mode ?? effectiveConfig?.test_mode) === "true";
      const testEmail = (draftConfig?.test_email || effectiveConfig?.test_email || "jeananvoh@gmail.com").trim();
      const ccEmail = (draftConfig?.cc_email || effectiveConfig?.cc_email || "jeananvoh@gmail.com").trim();
      const finalTo = isTest ? testEmail : targetGroup.email_to;
      const subject = isTest
        ? `[TEST → ${targetGroup.email_to}] [SIGNA-CI] Rapport d'intervention — ${targetGroup.commune} (${OPERATOR_CONFIG[targetGroup.operator]?.label || targetGroup.operator})`
        : `[SIGNA-CI] Rapport d'intervention — ${targetGroup.commune} (${OPERATOR_CONFIG[targetGroup.operator]?.label || targetGroup.operator})`;

      const html = buildBatchEmailHtmlClient(targetGroup);

      // 1. Tenter l'envoi réel Resend via le proxy client Same-Origin (garantit l'utilisation de la vraie clé admin)
      const resendRes = await sendResendDirectEmail({
        apiKey: resendApiKey,
        toEmail: finalTo,
        ccEmail: ccEmail,
        subject,
        htmlContent: html,
      });

      if (!resendRes.ok) {
        let diag = resendRes.error || "Refus d'envoi par l'API Resend.";
        if (resendRes.status === 403 || diag.toLowerCase().includes("only send to your own")) {
          diag = `Resend en Mode Sandbox restreint l'envoi vers l'adresse exacte de votre compte Resend.com. Pour envoyer à (${finalTo}), renseignez cette adresse comme 'Email de test' dans l'onglet Paramètres ou ajoutez votre domaine sur Resend.com.`;
        } else if (resendRes.status === 401 || diag.toLowerCase().includes("invalid api key")) {
          diag = "La clé API Resend renseignée est invalide. Veuillez vérifier votre clé (re_...) dans l'onglet Paramètres.";
        }
        throw new Error(diag);
      }

      // 2. Mettre à jour le statut des relais en "sent" dans la base Supabase
      const nowIso = new Date().toISOString();
      const { error: rpcErr } = await (supabase as any).rpc("admin_mark_relay_sent", { p_relay_ids: relay_ids });
      if (rpcErr) {
        await (supabase as any)
          .from("relay_logs")
          .update({ status: "sent", sent_at: nowIso })
          .in("id", relay_ids);
      }

      // 3. Notifier automatiquement les citoyens concernés
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

      return { sent: relay_ids.length, finalTo, isTest };
    },
    onSuccess: (data: any, variables: { relay_ids: string[]; groupKey: string }) => {
      queryClient.setQueryData(["admin-relay-logs-all"], (old: RelayLog[] | undefined) => {
        if (!old) return [];
        return old.map((log) => {
          if (variables.relay_ids.includes(log.id)) {
            return { ...log, status: "sent", sent_at: new Date().toISOString() };
          }
          return log;
        });
      });
      queryClient.invalidateQueries({ queryKey: ["admin-relay-logs-all"] });

      const destMsg = data?.isTest
        ? `Transmis à votre e-mail de test (${data?.finalTo})`
        : `Transmis au destinataire officiel (${data?.finalTo})`;

      toast({
        title: "✉️ Email Resend transmis avec succès",
        description: `${data?.sent ?? 0} signalement(s) traités. ${destMsg}. Vérifiez également votre dossier Spam / Courrier indésirable.`,
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

  // ── Suppression définitive d'un ou plusieurs relais de la file ───────────
  const deleteRelayGroup = useMutation({
    mutationFn: async (relayIds: string[]) => {
      const { error } = await (supabase as any)
        .from("relay_logs")
        .delete()
        .in("id", relayIds);
      if (error) throw error;
      return relayIds;
    },
    onSuccess: (deletedIds: string[]) => {
      queryClient.setQueryData(["admin-relay-logs-all"], (old: RelayLog[] | undefined) => {
        if (!old) return [];
        return old.filter((log) => !deletedIds.includes(log.id));
      });
      queryClient.invalidateQueries({ queryKey: ["admin-relay-logs-all"] });
      toast({
        title: "🗑️ Fiche de relais retirée",
        description: "La fiche a été supprimée de la file d'attente avec succès.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Erreur lors de la suppression",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const sendAllOperatorGroups = async (opFilter: string) => {
    const targets = pendingGroups.filter((g) => opFilter === "ALL" || g.operator === opFilter);
    if (targets.length === 0) return;

    setBulkSending(true);
    let successCount = 0;
    let failCount = 0;

    for (const group of targets) {
      try {
        await sendGroup.mutateAsync({
          relay_ids: group.relayIds,
          groupKey: group.key,
        });
        successCount++;
      } catch (_) {
        failCount++;
      }
    }

    setBulkSending(false);
    toast({
      title: `⚡ Envoi des relais terminé (${successCount}/${targets.length})`,
      description: failCount > 0 
        ? `${successCount} groupe(s) transmis avec succès. ${failCount} groupe(s) ont rencontré une alerte.`
        : `Tous les ${successCount} groupe(s) de signalements ${opFilter !== "ALL" ? opFilter : ""} ont été transmis par e-mail avec succès.`,
    });
  };

  // ── Sauvegarder la config ──────────────────────────────────────────────────
  const saveConfig = useMutation({
    mutationFn: async (cfg: RelayConfig) => {
      // 1. Tenter l'RPC SECURITY DEFINER (contourne les restrictions RLS)
      try {
        const { error: rpcErr } = await (supabase as any).rpc("admin_save_relay_config", {
          p_config: cfg,
        });
        if (!rpcErr) return;
      } catch (_) {
        // ignorer et passer au fallback direct
      }

      // 2. Fallback direct client (inclut label pour eviter l'erreur constraint Not Null)
      const rows = Object.entries(cfg).map(([key, value]) => ({
        key,
        value: value ?? "",
        label: key,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await (supabase as any)
        .from("relay_config")
        .upsert(rows, { onConflict: "key" });

      if (error) {
        // 3. Dernier recours : mises a jour individuelles par clé
        const updatePromises = Object.entries(cfg).map(([key, value]) =>
          (supabase as any)
            .from("relay_config")
            .update({ value: value ?? "", updated_at: new Date().toISOString() })
            .eq("key", key)
        );
        await Promise.all(updatePromises);
      }
    },
    onSuccess: () => {
      refetchConfig();
      setDraftConfig(null);
      toast({
        title: "Configuration sauvegardée avec succès",
        description: "Vos paramètres et votre clé API Resend ont été enregistrés.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Erreur de sauvegarde",
        description: err?.message || "Impossible d'enregistrer la configuration dans la base de données.",
        variant: "destructive",
      });
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

        const label = extractInfraLabel(report.description || "");
        const isCieRelated = report.service_type === "electricity" ||
          report.service_type === "streetlighting" ||
          report.service_type === "electricity_quality" ||
          (label && INFRA_CIE.has(label)) ||
          (report.description && (
            report.description.toLowerCase().includes("éclairage") ||
            report.description.toLowerCase().includes("eclairage") ||
            report.description.toLowerCase().includes("lampadaire") ||
            report.description.toLowerCase().includes("poteau") ||
            report.description.toLowerCase().includes("branchement") ||
            report.description.toLowerCase().includes("électricité") ||
            report.description.toLowerCase().includes("electricite")
          ));

        const isSodeciRelated = report.service_type === "water" ||
          report.service_type === "water_quality" ||
          (label && INFRA_SODECI.has(label)) ||
          (report.description && (
            report.description.toLowerCase().includes("fuite d'eau") ||
            report.description.toLowerCase().includes("canalisation") ||
            report.description.toLowerCase().includes("eau potable")
          ));

        if (isCieRelated) {
          relays.push({ report_id: report.id, operator: "CIE", email_to: "reclamation@cie.ci", status: "pending" });
          if (effectiveConfig?.anare_auto_dispatch !== "false") {
            relays.push({ report_id: report.id, operator: "ANARE", email_to: "reclamation@anare.ci", status: "pending" });
          }
        } else if (isSodeciRelated) {
          relays.push({ report_id: report.id, operator: "SODECI", email_to: "reclamation@sodeci.ci", status: "pending" });
          if (effectiveConfig?.onep_auto_dispatch !== "false") {
            relays.push({ report_id: report.id, operator: "ONEP", email_to: "reclamation@onep.ci", status: "pending" });
          }
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
      {/* Bannière d'alerte haute sécurité si Mode Production actif */}
      {effectiveConfig?.test_mode === "false" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-600 dark:bg-red-700 text-white font-bold p-3.5 px-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl border-2 border-red-700"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-yellow-300 shrink-0 animate-bounce" />
            <div>
              <div className="font-black text-sm tracking-wide flex items-center gap-2">
                🚨 MODE PRODUCTION (RÉEL) ACTIF !
                <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded font-mono font-extrabold uppercase">DANGER ENVOI RÉEL</span>
              </div>
              <div className="text-xs text-red-100 font-medium mt-0.5">
                Les e-mails seront transmis aux adresses officielles réelles des opérateurs.
                {effectiveConfig?.cc_email && ` · Copie (CC) active : ${effectiveConfig.cc_email}`}
              </div>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              const newCfg = { ...effectiveConfig, test_mode: "true" };
              saveConfig.mutate(newCfg);
              toast({
                title: "🛡️ Mode TEST Sécurisé Activé",
                description: "Les e-mails partent à présent uniquement vers votre e-mail de test sans contacter les opérateurs.",
              });
            }}
            className="bg-white text-red-700 hover:bg-red-50 font-black border border-red-200 text-xs h-8 gap-1.5 shrink-0 shadow-md"
          >
            <FlaskConical className="h-4 w-4 text-amber-600" />
            Basculer en Mode TEST Sécurisé
          </Button>
        </motion.div>
      )}

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
        (() => {
          const filteredPendingGroups = pendingGroups.filter(
            (g) => pendingOpFilter === "ALL" || g.operator === pendingOpFilter
          );

          return (
            <div className="space-y-4">
              {/* Barre de filtrage par opérateur & Envoi groupé */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border p-3 rounded-xl shadow-xs">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {[
                    { id: "ALL", label: "Tous les relais", count: pendingGroups.length },
                    { id: "CIE", label: "⚡ CIE", count: pendingGroups.filter((g) => g.operator === "CIE").length },
                    { id: "SODECI", label: "💧 SODECI", count: pendingGroups.filter((g) => g.operator === "SODECI").length },
                    { id: "MAIRIE", label: "🏛️ Mairies", count: pendingGroups.filter((g) => g.operator === "MAIRIE").length },
                    { id: "ANARE", label: "⚖️ ANARE-CI", count: pendingGroups.filter((g) => g.operator === "ANARE").length },
                    { id: "ONEP", label: "🛡️ ONEP", count: pendingGroups.filter((g) => g.operator === "ONEP").length },
                  ].map((f) => (
                    <Button
                      key={f.id}
                      size="sm"
                      variant={pendingOpFilter === f.id ? "default" : "outline"}
                      onClick={() => setPendingOpFilter(f.id)}
                      className="h-8 text-xs font-semibold gap-1.5"
                    >
                      <span>{f.label}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          pendingOpFilter === f.id ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {f.count}
                      </span>
                    </Button>
                  ))}
                </div>

                {filteredPendingGroups.length > 0 && (
                  <Button
                    size="sm"
                    variant="default"
                    disabled={bulkSending}
                    onClick={() => handleRequestSendBulk(pendingOpFilter)}
                    className="h-8 text-xs font-bold gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm"
                  >
                    <Send className={`h-3.5 w-3.5 ${bulkSending ? "animate-spin" : ""}`} />
                    {bulkSending
                      ? "Envoi en masse..."
                      : pendingOpFilter === "ALL"
                      ? `Tout envoyer par Email (${pendingGroups.length})`
                      : `Envoyer tous les relais ${OPERATOR_CONFIG[pendingOpFilter]?.label || pendingOpFilter} (${filteredPendingGroups.length})`}
                  </Button>
                )}
              </div>

              {filteredPendingGroups.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card p-10 text-center space-y-4 shadow-sm">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500/70" />
                  <div className="space-y-1 max-w-lg mx-auto">
                    <h3 className="text-foreground font-bold text-lg">
                      {pendingOpFilter === "ALL"
                        ? "Aucun signalement en attente dans la file."
                        : `Aucun signalement ${pendingOpFilter} en attente dans cette catégorie.`}
                    </h3>
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
                filteredPendingGroups.map((group) => {
                  const opCfg = OPERATOR_CONFIG[group.operator] ?? OPERATOR_CONFIG.MAIRIE;
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
                      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-card border-b border-border">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${opCfg.bg} shrink-0`}>
                            <opCfg.icon className={`h-5 w-5 ${opCfg.color}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
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
                              <span className="flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                                <Users className="h-3 w-3 text-emerald-600" />
                                {group.totalConfirmations} citoyen.ne(s) votant(s)
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

                              {/* Bouton Retirer / Supprimer de la file */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (window.confirm(`Voulez-vous vraiment retirer la fiche ${group.operator} (${group.commune}) de la file d'attente ?`)) {
                                    deleteRelayGroup.mutate(group.relayIds);
                                  }
                                }}
                                disabled={isSending || deleteRelayGroup.isPending}
                                className="gap-1.5 text-red-600 border-red-500/40 hover:bg-red-500/10 text-xs h-8 font-semibold"
                                title="Retirer cette fiche de la file d'attente"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Retirer</span>
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

                                const text = buildBatchEmailTextClient(group);
                                const encoded = encodeURIComponent(text);
                                const url = waNumber
                                  ? `https://wa.me/${waNumber}?text=${encoded}`
                                  : `https://wa.me/?text=${encoded}`;

                                const alreadySent = !!group.waSentAt;

                                return (
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
                                );
                              })()}

                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-slate-600 border-slate-300 hover:bg-slate-100 text-xs h-8"
                                title="Copier le sujet et le contenu HTML du mail pour l'envoyer depuis votre boîte mail"
                                onClick={() => {
                                  const html = buildBatchEmailHtmlClient(group);
                                  const isTest = (draftConfig?.test_mode ?? effectiveConfig?.test_mode) === "true";
                                  const testEmail = (draftConfig?.test_email || effectiveConfig?.test_email || "jeananvoh@gmail.com").trim();
                                  const finalTo = isTest ? testEmail : group.email_to;
                                  const subject = isTest
                                    ? `[TEST → ${group.email_to}] [SIGNA-CI] Rapport d'intervention — ${group.commune} (${OPERATOR_CONFIG[group.operator]?.label || group.operator})`
                                    : `[SIGNA-CI] Rapport d'intervention — ${group.commune} (${OPERATOR_CONFIG[group.operator]?.label || group.operator})`;
                                  navigator.clipboard.writeText(`DESTINATAIRE: ${finalTo}\nSUJET: ${subject}\n\n${html}`);
                                  toast({
                                    title: "📋 Email copié !",
                                    description: `Le sujet et le contenu HTML ont été copiés dans le presse-papier pour ${finalTo}.`,
                                  });
                                }}
                              >
                                <Copy className="h-3.5 w-3.5 text-slate-500" />
                                Copier Mail
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => handleRequestSendSingle(group)}
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
                          const displayName = (q.name === "__other" || q.name === "Autre") ? "Secteur non spécifié" : q.name;
                          const confirmationBadge = `${q.verifications} citoyen.ne(s) votant(s)`;
                          const targetReportId = q.reportId || group.relayIds[0];

                          const specificLabel = q.description && q.description.trim() ? q.description.trim() : null;
                          const iconPrefix = q.serviceType === "electricity" ? "⚡" : q.serviceType === "water" ? "💧" : (q.category === "eclairage_public" || specificLabel?.toLowerCase().includes("lampadaire")) ? "💡" : "🏛️";
                          const typeLabel = specificLabel
                            ? `${iconPrefix} ${specificLabel}`
                            : q.serviceType === "electricity"
                            ? "⚡ Électricité"
                            : q.serviceType === "water"
                            ? "💧 Eau"
                            : q.serviceType === "streetlighting" || q.category === "eclairage_public"
                            ? "💡 Éclairage public"
                            : "🏛️ Infrastructure / Voirie";

                          const dateFormatted = q.createdAt ? safeFormatDate(q.createdAt, "d MMMM yyyy à HH:mm") : null;
                          const durationFormatted = q.createdAt ? safeFormatDuration(q.createdAt) : null;

                          return (
                            <div
                              key={idx}
                              className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 gap-2 hover:bg-muted/10 transition-colors"
                            >
                              <div className="flex flex-col gap-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 shrink-0">
                                    {typeLabel}
                                  </span>
                                  <span className="text-sm font-bold text-foreground">
                                    {group.commune} <span className="text-muted-foreground font-normal">·</span> {displayName}
                                  </span>
                                  {q.count && q.count > 1 && (
                                    <span className="text-xs text-muted-foreground shrink-0 font-medium">({q.count} signalements)</span>
                                  )}
                                </div>

                                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                  {dateFormatted && (
                                    <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                                      <Calendar className="h-3 w-3 text-primary shrink-0" />
                                      Signalé le {dateFormatted}
                                      {durationFormatted && (
                                        <span className="text-red-600 dark:text-red-400 font-bold ml-1">
                                          ({durationFormatted})
                                        </span>
                                      )}
                                    </span>
                                  )}
                                  {q.description && (
                                    <span className="truncate max-w-md italic text-muted-foreground">
                                      "{q.description}"
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-xs shrink-0 self-end sm:self-center">
                                <span className="text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{confirmationBadge}</span>
                                <span className={urgCfg.color}>{urgCfg.label}</span>
                                {targetReportId && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(`/signalement/${targetReportId}`, "_blank")}
                                    className="gap-1 text-xs h-7 px-2.5 border-primary/40 text-primary hover:bg-primary/10 font-bold shadow-xs"
                                    title="Ouvrir la fiche complète du déroulé de l'incident"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    Voir le signalement
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          );
        })()
      ) : tab === "history" ? (

        /* ── VUE : HISTORIQUE ───────────────────────────────────────────── */
        <div className="space-y-4">
          {/* Barre de filtres par Période (Date, Semaine, Mois, Année) */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-card p-3 rounded-xl border border-border shadow-sm">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Filter className="h-3.5 w-3.5 text-primary" />
              <span>Organiser l'historique :</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: "all", label: "Toutes les dates", count: historyPeriodCounts.all },
                { id: "today", label: "Aujourd'hui", count: historyPeriodCounts.today },
                { id: "week", label: "Cette Semaine", count: historyPeriodCounts.week },
                { id: "month", label: "Ce Mois", count: historyPeriodCounts.month },
                { id: "year", label: "Cette Année", count: historyPeriodCounts.year },
              ].map((p) => (
                <Button
                  key={p.id}
                  size="sm"
                  variant={historyPeriod === p.id ? "default" : "outline"}
                  onClick={() => setHistoryPeriod(p.id as any)}
                  className={`h-7 text-xs px-2.5 gap-1.5 font-medium transition-all ${
                    historyPeriod === p.id
                      ? "bg-primary text-primary-foreground font-bold shadow-sm"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{p.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    historyPeriod === p.id
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted-foreground/10 text-muted-foreground"
                  }`}>
                    {p.count}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {filteredHistoryLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm border border-dashed rounded-xl p-8 bg-card/50">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="font-semibold">Aucun envoi dans l'historique pour cette période.</p>
              <p className="text-xs text-muted-foreground mt-1">Sélectionnez un autre filtre ou transmettez un nouveau rapport depuis l'onglet « À envoyer ».</p>
            </div>
          ) : (
            filteredHistoryLogs.map((log) => {
              const statusCfg = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.pending;
              const opCfg     = OPERATOR_CONFIG[log.operator] ?? OPERATOR_CONFIG.MAIRIE;
              const isExpanded = expandedId === log.id;

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-xl border border-border bg-card overflow-hidden shadow-xs hover:border-primary/40 transition-colors"
                >
                  <div
                    className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
                  >
                    <div
                      onClick={() => window.open(`/signalement/${log.report_id}`, "_blank")}
                      className="flex items-center gap-3 min-w-0 cursor-pointer group"
                      title="Cliquer pour ouvrir les détails de ce signalement"
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${opCfg.bg} shrink-0 group-hover:scale-105 transition-transform`}>
                        <opCfg.icon className={`h-4 w-4 ${opCfg.color}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-xs ${opCfg.color}`}>{opCfg.label}</span>
                          {log.report && (
                            <>
                              <span className="text-muted-foreground text-xs">·</span>
                              <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate flex items-center gap-1">
                                {cleanQuartierName(log.report.quartier, log.report.custom_quartier, log.report.address_text, log.report.landmark, log.report.profile_quartier, log.report.description)} ({resolveCommuneName(log.report.commune, log.report.location, log.report.latitude, log.report.longitude, log.report.profile_commune, log.report.description)})
                                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span>Destinataire : <strong className="text-foreground/80">{log.email_to}</strong></span>
                          {relayConfig?.test_mode === "true" && (
                            <span className="text-amber-600 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 text-[10px]">
                              TEST → {relayConfig?.test_email || "Email personnel de test"}
                            </span>
                          )}
                          <span>·</span>
                          <span className="font-medium text-foreground/80">
                            {safeFormatDate(log.sent_at || log.created_at)}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => window.open(`/signalement/${log.report_id}`, "_blank")}
                        className="gap-1.5 text-xs h-8 bg-primary text-primary-foreground font-semibold shadow-xs"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Ouvrir
                      </Button>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusCfg.bg} ${statusCfg.color}`}>
                        <statusCfg.icon className="h-3 w-3" />
                        {statusCfg.label}
                      </span>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        className="p-1 hover:bg-muted rounded-md transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border bg-muted/30 p-4 space-y-3 text-xs">
                      {log.report && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 bg-card p-3 rounded-lg border border-border">
                          <div>
                            <span className="text-muted-foreground">Catégorie :</span>{" "}
                            <strong className="text-foreground">{log.report.category || log.report.service_type}</strong>
                          </div>
                          <div>
                            {(() => {
                              const isInfraRep = log.operator === "MAIRIE" || log.report.service_type === "infrastructure" || log.report.category === "infrastructure" || log.report.category === "eclairage_public" || log.report.category === "voirie" || log.report.category === "lampadaire";
                              return (
                                <>
                                  <span className="text-muted-foreground">{isInfraRep ? "Votes & soutiens citoyens :" : "Confirmations voisins :"}</span>{" "}
                                  <strong className="text-emerald-600 font-bold">
                                    {log.report.verifications || 1} {isInfraRep ? "citoyen(s) votant(s)" : "foyer(s) impacté(s)"}
                                  </strong>
                                </>
                              );
                            })()}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Urgence :</span>{" "}
                            <strong className="text-foreground">{log.report.urgency || "medium"}</strong>
                          </div>
                          {log.report.latitude && log.report.longitude && (
                            <div className="col-span-full">
                              <span className="text-muted-foreground">Coordonnées GPS :</span>{" "}
                              <code className="text-foreground font-mono">{log.report.latitude.toFixed(5)}, {log.report.longitude.toFixed(5)}</code>
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${log.report.latitude},${log.report.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="ml-2 text-primary hover:underline font-semibold"
                              >
                                📍 Voir sur Google Maps
                              </a>
                            </div>
                          )}
                          {log.report.description && (
                            <div className="col-span-full border-t border-border pt-2 mt-1">
                              <span className="text-muted-foreground">Description :</span>{" "}
                              <p className="text-foreground/90 mt-0.5 italic">{log.report.description}</p>
                            </div>
                          )}
                        </div>
                      )}
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
                          variant="outline"
                          onClick={() => window.open(`/signalement/${log.report_id}`, "_blank")}
                          className="gap-1.5 text-xs font-medium"
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-primary" /> Voir la fiche complète du signalement
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
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

            {/* Email en copie systématique (CC) pour le suivi admin */}
            <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
              <label className="text-xs font-semibold text-foreground block flex items-center gap-1.5">
                <MailCheck className="h-3.5 w-3.5 text-primary" />
                <span>Email en copie systématique (CC) pour l'administrateur</span>
              </label>
              <input
                type="email"
                value={effectiveConfig.cc_email ?? "jeananvoh@gmail.com"}
                onChange={(e) =>
                  setDraftConfig({ ...(effectiveConfig as RelayConfig), cc_email: e.target.value })
                }
                placeholder="votre.email@gmail.com"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
              />
              <p className="text-[11px] text-muted-foreground">
                📩 Cet e-mail recevra automatiquement une copie (CC) de <strong>tous les e-mails transmis aux opérateurs</strong>, que ce soit en mode Production ou en mode Test.
              </p>
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

          {/* Dispatching Automatique des Régulateurs (ANARE-CI & ONEP) */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                Dispatching Automatique des Régulateurs (ANARE-CI & ONEP)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Choisissez d'inclure ou d'exclure automatiquement les régulateurs lors de la synchronisation des signalements.
              </p>
            </div>

            <div className="space-y-3">
              {/* ANARE-CI Switch */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-foreground">⚖️ ANARE-CI — Régulateur Électricité</span>
                    {effectiveConfig.anare_auto_dispatch !== "false" ? (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-extrabold px-2 py-0.5 rounded">Activé par défaut</span>
                    ) : (
                      <span className="text-[10px] bg-slate-500/20 text-slate-600 dark:text-slate-400 font-extrabold px-2 py-0.5 rounded">Désactivé</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Génère automatiquement une fiche vers l'ANARE-CI pour tout incident d'électricité (CIE).
                  </p>
                </div>
                <Switch
                  checked={effectiveConfig.anare_auto_dispatch !== "false"}
                  onCheckedChange={(checked) =>
                    setDraftConfig({ ...(effectiveConfig as RelayConfig), anare_auto_dispatch: checked ? "true" : "false" })
                  }
                />
              </div>

              {/* ONEP Switch */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-cyan-500/30 bg-cyan-500/5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-foreground">💧 ONEP — Office National de l'Eau Potable</span>
                    {effectiveConfig.onep_auto_dispatch !== "false" ? (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-extrabold px-2 py-0.5 rounded">Activé par défaut</span>
                    ) : (
                      <span className="text-[10px] bg-slate-500/20 text-slate-600 dark:text-slate-400 font-extrabold px-2 py-0.5 rounded">Désactivé</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Génère automatiquement une fiche vers l'ONEP pour tout incident d'eau potable (SODECI).
                  </p>
                </div>
                <Switch
                  checked={effectiveConfig.onep_auto_dispatch !== "false"}
                  onCheckedChange={(checked) =>
                    setDraftConfig({ ...(effectiveConfig as RelayConfig), onep_auto_dispatch: checked ? "true" : "false" })
                  }
                />
              </div>
            </div>
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

      {/* Modale de sécurité d'envoi en Production */}
      <Dialog open={prodModalConfig.isOpen} onOpenChange={(open) => !open && setProdModalConfig({ ...prodModalConfig, isOpen: false })}>
        <DialogContent className="max-w-md bg-card border-red-500/40 p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-500 flex items-center gap-2 text-base font-extrabold">
              <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse" />
              🛑 CONFIRMATION DE SÉCURITÉ — MODE PRODUCTION
            </DialogTitle>
            <DialogDescription className="text-foreground/90 text-xs mt-1.5 font-medium">
              Le <strong className="text-red-600 font-bold">MODE PRODUCTION (Réel)</strong> est actuellement activé sur SIGNA-CI.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-2.5 text-xs text-foreground mt-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-semibold">Cible / Opérateur :</span>
              <strong className="text-foreground font-bold">{prodModalConfig.targetTitle}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-semibold">Destinataire principal :</span>
              <code className="bg-background px-2 py-0.5 rounded font-mono font-bold text-red-600">{prodModalConfig.destEmail}</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-semibold">Copie conforme (CC) :</span>
              <code className="bg-background px-2 py-0.5 rounded font-mono font-bold text-emerald-600">
                {effectiveConfig?.cc_email || effectiveConfig?.test_email || "jeananvoh@gmail.com"}
              </code>
            </div>
            {prodModalConfig.count && (
              <div className="flex items-center justify-between pt-1 border-t border-red-500/20">
                <span className="text-muted-foreground font-semibold">Relais concernés :</span>
                <span className="font-bold text-foreground">{prodModalConfig.count} groupe(s)</span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground italic mt-2">
            ⚠️ Cet e-mail sera immédiatement transmis à l'adresse de production officielle de l'opérateur. Une copie conforme (CC) vous sera automatiquement délivrée.
          </p>

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newCfg = { ...effectiveConfig, test_mode: "true" };
                saveConfig.mutate(newCfg);
                setProdModalConfig({ ...prodModalConfig, isOpen: false });
                toast({
                  title: "🛡️ Basculé en Mode TEST Sécurisé",
                  description: "Le mode TEST est réactivé. Vous pouvez tester vos envois en toute sécurité.",
                });
              }}
              className="w-full sm:w-auto text-amber-600 border-amber-500/40 hover:bg-amber-500/10 font-bold text-xs gap-1.5"
            >
              <FlaskConical className="h-4 w-4" />
              Basculer en Mode TEST
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                const cfg = prodModalConfig;
                setProdModalConfig({ ...prodModalConfig, isOpen: false });
                if (cfg.isBulk && cfg.opFilter) {
                  sendAllOperatorGroups(cfg.opFilter);
                } else if (cfg.relayIds && cfg.groupKey) {
                  sendGroup.mutate({ relay_ids: cfg.relayIds, groupKey: cfg.groupKey });
                }
              }}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 font-extrabold text-xs gap-1.5 shadow-md"
            >
              <Send className="h-4 w-4" />
              Confirmer l'Envoi PRODUCTION
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRelayPage;
