import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Droplets, Building2, Handshake, MapPin, Users,
  Clock, CheckCircle2, Loader2, AlertTriangle, RefreshCw,
  TrendingUp, MessageSquare, Send, BarChart3, Ticket,
  Shield, Download, Filter, Search, ChevronRight,
  Sparkles, CheckCircle, ExternalLink
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Navigate } from "react-router-dom";

// ─── Types & Thèmes Opérateurs ────────────────────────────────────────────────

interface PartnerProfile {
  organization_name: string;
  partner_type: "cie" | "sodeci" | "mairie" | "ngo" | "other";
  commune: string | null;
}

interface Report {
  id: string;
  user_id: string;
  ticket_code?: string | null;
  service_type: string;
  report_category: string;
  description: string;
  commune: string;
  quartier: string;
  status: string;
  urgency: string;
  verifications: number;
  impacted_people: number;
  created_at: string;
  resolved_at: string | null;
  photo_url: string | null;
  photo_urls: string[] | null;
  operator_reference?: string | null;
  estimated_resolution_time?: string | null;
  operator_last_note?: string | null;
}

interface OperatorTheme {
  id: string;
  name: string;
  shortName: string;
  fullName: string;
  regulatorName: string;
  slaHours: number;
  icon: React.ElementType;
  primaryHex: string;
  primaryColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  bannerBg: string;
  bannerBorder: string;
  kpiBg: string;
  activeTabClass: string;
  primaryButtonClass: string;
  slogan: string;
  defaultServiceFilter: string;
}

const OPERATOR_THEMES: Record<string, OperatorTheme> = {
  cie: {
    id: "cie",
    name: "CIE",
    shortName: "CIE — Électricité",
    fullName: "Compagnie Ivoirienne d'Électricité",
    regulatorName: "Régulation ANARE-CI · SLA Cible < 24h",
    slaHours: 24,
    icon: Zap,
    primaryHex: "#F59E0B",
    primaryColor: "text-amber-500",
    badgeBg: "bg-amber-500/10",
    badgeBorder: "border-amber-500/30",
    badgeText: "text-amber-600 dark:text-amber-400",
    bannerBg: "bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent",
    bannerBorder: "border-amber-500/30",
    kpiBg: "bg-amber-500/5 border-amber-500/20",
    activeTabClass: "data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 font-bold",
    primaryButtonClass: "bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold",
    slogan: "Supervision du réseau électrique, incidents Haute & Basse Tension",
    defaultServiceFilter: "electricity",
  },
  sodeci: {
    id: "sodeci",
    name: "SODECI",
    shortName: "SODECI — Eau Potable",
    fullName: "Société de Distribution d'Eau de la Côte d'Ivoire",
    regulatorName: "Régulation ONEP · SLA Cible < 48h",
    slaHours: 48,
    icon: Droplets,
    primaryHex: "#0EA5E9",
    primaryColor: "text-sky-500",
    badgeBg: "bg-sky-500/10",
    badgeBorder: "border-sky-500/30",
    badgeText: "text-sky-600 dark:text-sky-400",
    bannerBg: "bg-gradient-to-r from-sky-500/15 via-sky-500/5 to-transparent",
    bannerBorder: "border-sky-500/30",
    kpiBg: "bg-sky-500/5 border-sky-500/20",
    activeTabClass: "data-[state=active]:bg-sky-500 data-[state=active]:text-white font-bold",
    primaryButtonClass: "bg-sky-500 hover:bg-sky-600 text-white font-bold",
    slogan: "Supervision de la distribution d'eau potable, pénuries & fuites urbaines",
    defaultServiceFilter: "water",
  },
  mairie: {
    id: "mairie",
    name: "Mairie",
    shortName: "Mairie — Services Techniques",
    fullName: "Services Techniques Municipaux (DST)",
    regulatorName: "District Autonome d'Abidjan · SLA Cible < 72h",
    slaHours: 72,
    icon: Building2,
    primaryHex: "#10B981",
    primaryColor: "text-emerald-500",
    badgeBg: "bg-emerald-500/10",
    badgeBorder: "border-emerald-500/30",
    badgeText: "text-emerald-600 dark:text-emerald-400",
    bannerBg: "bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent",
    bannerBorder: "border-emerald-500/30",
    kpiBg: "bg-emerald-500/5 border-emerald-500/20",
    activeTabClass: "data-[state=active]:bg-emerald-500 data-[state=active]:text-white font-bold",
    primaryButtonClass: "bg-emerald-600 hover:bg-emerald-700 text-white font-bold",
    slogan: "Voirie communale, curage des caniveaux, salubrité & éclairage public",
    defaultServiceFilter: "infrastructure",
  },
  ngo: {
    id: "ngo",
    name: "Observatoire",
    shortName: "Observatoire Citoyen",
    fullName: "Observatoire Indépendant & Société Civile",
    regulatorName: "Veille Citoyenne & Audit Indépendant",
    slaHours: 48,
    icon: Handshake,
    primaryHex: "#6366F1",
    primaryColor: "text-indigo-500",
    badgeBg: "bg-indigo-500/10",
    badgeBorder: "border-indigo-500/30",
    badgeText: "text-indigo-600 dark:text-indigo-400",
    bannerBg: "bg-gradient-to-r from-indigo-500/15 via-indigo-500/5 to-transparent",
    bannerBorder: "border-indigo-500/30",
    kpiBg: "bg-indigo-500/5 border-indigo-500/20",
    activeTabClass: "data-[state=active]:bg-indigo-500 data-[state=active]:text-white font-bold",
    primaryButtonClass: "bg-indigo-600 hover:bg-indigo-700 text-white font-bold",
    slogan: "Contrôle civique et consolidation des indicateurs de qualité de service",
    defaultServiceFilter: "all",
  },
};

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  electricity: <Zap className="h-4 w-4 text-amber-500" />,
  water: <Droplets className="h-4 w-4 text-sky-500" />,
  infrastructure: <Building2 className="h-4 w-4 text-emerald-500" />,
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:     { label: "À traiter",        color: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20" },
  processing: { label: "En intervention", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" },
  resolved:   { label: "Résolu & Rétabli", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" },
};

const URGENCY_COLORS: Record<string, string> = {
  critical: "border-l-red-500",
  high:     "border-l-orange-400",
  medium:   "border-l-yellow-400",
  low:      "border-l-emerald-400",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

// ─── Composant Principal ──────────────────────────────────────────────────────

const PartnerDashboardPage = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<{ report: Report; newStatus: string } | null>(null);
  const [actionComment, setActionComment] = useState("");
  const [actionOperatorRef, setActionOperatorRef] = useState("");
  const [actionEtaHours, setActionEtaHours] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [communeFilter, setCommuneFilter] = useState("all");

  // Vérifier le rôle partenaire
  const { data: isPartner, isLoading: roleLoading } = useQuery({
    queryKey: ["is-partner", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "partner" });
      return data === true;
    },
    enabled: !!user,
  });

  // Charger le profil partenaire
  const { data: partnerProfile } = useQuery<PartnerProfile | null>({
    queryKey: ["partner-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_profiles")
        .select("organization_name, partner_type, commune")
        .eq("user_id", user!.id)
        .single();
      if (error) return null;
      return data as PartnerProfile;
    },
    enabled: !!user && isPartner === true,
  });

  // Détection du type opérateur (avec fallback CIE par défaut et sélecteur interactif)
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("cie");

  // Synchroniser avec le profil si disponible
  useMemo(() => {
    if (partnerProfile?.partner_type && OPERATOR_THEMES[partnerProfile.partner_type]) {
      setSelectedOperatorId(partnerProfile.partner_type);
    }
  }, [partnerProfile]);

  const currentTheme = OPERATOR_THEMES[selectedOperatorId] || OPERATOR_THEMES.cie;
  const OperatorIcon = currentTheme.icon;

  // Charger les signalements
  const { data: reports = [], isLoading: reportsLoading } = useQuery<Report[]>({
    queryKey: ["partner-reports", selectedOperatorId],
    queryFn: async () => {
      let query = supabase
        .from("reports")
        .select("id, user_id, ticket_code, service_type, report_category, description, commune, quartier, status, urgency, verifications, impacted_people, created_at, resolved_at, photo_url, photo_urls, operator_reference, estimated_resolution_time, operator_last_note")
        .order("created_at", { ascending: false })
        .limit(200);

      // Si CIE -> électricité, si SODECI -> eau, si Mairie -> infrastructure
      if (currentTheme.defaultServiceFilter !== "all") {
        query = query.eq("service_type", currentTheme.defaultServiceFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Report[];
    },
  });

  // Filtrage combiné (recherche & commune)
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (communeFilter !== "all" && r.commune !== communeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = r.description?.toLowerCase().includes(q);
        const matchQuartier = r.quartier?.toLowerCase().includes(q);
        const matchTicket = r.ticket_code?.toLowerCase().includes(q);
        const matchRef = r.operator_reference?.toLowerCase().includes(q);
        if (!matchDesc && !matchQuartier && !matchTicket && !matchRef) return false;
      }
      return true;
    });
  }, [reports, communeFilter, searchQuery]);

  // Mutation : mise à jour du statut
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      reportId,
      ticketCode,
      status,
      operatorRef,
      publicNote,
      etaHours,
    }: {
      reportId: string;
      ticketCode?: string | null;
      status: string;
      operatorRef?: string;
      publicNote?: string;
      etaHours?: number;
    }) => {
      setUpdatingId(reportId);
      const etaDate = etaHours ? new Date(Date.now() + etaHours * 3600000).toISOString() : null;
      const { error } = await supabase.rpc("operator_update_ticket", {
        p_report_id: reportId,
        p_ticket_code: ticketCode || null,
        p_status: status,
        p_operator_name: partnerProfile?.organization_name || currentTheme.fullName,
        p_operator_reference: operatorRef || null,
        p_public_note: publicNote || null,
        p_estimated_resolution: etaDate,
      });
      if (error) {
        const { error: fallbackErr } = await supabase.rpc("partner_update_report_status", {
          p_report_id: reportId,
          p_status: status,
        });
        if (fallbackErr) throw fallbackErr;
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["partner-reports"] });
      const msg = status === "processing"
        ? "Prise en charge validée · Transmise au centre de supervision"
        : status === "resolved"
        ? "Incident marqué Résolu et clôturé ✅"
        : "Statut mis à jour";
      toast.success(msg);
    },
    onError: (err: any) => toast.error(err.message || "Erreur lors de la mise à jour"),
    onSettled: () => setUpdatingId(null),
  });

  // Export CSV Opérateur
  const handleExportCSV = () => {
    if (filteredReports.length === 0) {
      toast.error("Aucun dossier à exporter.");
      return;
    }

    const headers = [
      "Date Signalement",
      "N° Ticket SIGNA",
      "Réf. Opérateur",
      "Service",
      "Commune",
      "Quartier",
      "Description Incident",
      "Statut",
      "SLA Cible (Heures)",
      "Délai Résolution",
      "Note Publique Opérateur",
      "Soutiens Citoyens",
    ];

    const rows = filteredReports.map((r) => [
      `"${new Date(r.created_at).toLocaleDateString("fr-FR")}"`,
      `"${r.ticket_code || "–"}"`,
      `"${r.operator_reference || "–"}"`,
      `"${r.service_type}"`,
      `"${r.commune}"`,
      `"${r.quartier || "–"}"`,
      `"${(r.description || "").replace(/"/g, '""')}"`,
      `"${r.status === "resolved" ? "Résolu" : r.status === "processing" ? "En cours" : "À traiter"}"`,
      `"${currentTheme.slaHours}h"`,
      `"${r.resolved_at ? new Date(r.resolved_at).toLocaleDateString("fr-FR") : "–"}"`,
      `"${(r.operator_last_note || "").replace(/"/g, '""')}"`,
      `"${r.verifications || 0}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Rapport_${currentTheme.name}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Export CSV ${currentTheme.name} téléchargé avec succès !`);
  };

  // ─── Guards ───────────────────────────────────────────────────────────────

  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (isPartner === false) return <Navigate to="/" replace />;

  // ─── Données KPIs ─────────────────────────────────────────────────────────

  const active     = filteredReports.filter((r) => r.status === "active");
  const processing = filteredReports.filter((r) => r.status === "processing");
  const resolved   = filteredReports.filter((r) => r.status === "resolved");

  const resolutionRate = filteredReports.length > 0
    ? Math.round((resolved.length / filteredReports.length) * 100)
    : 0;

  const avgResolutionHours = (() => {
    const withTime = resolved.filter((r) => r.resolved_at);
    if (!withTime.length) return null;
    const avg = withTime.reduce((sum, r) => {
      return sum + (new Date(r.resolved_at!).getTime() - new Date(r.created_at).getTime());
    }, 0) / withTime.length;
    const h = avg / 3_600_000;
    return h < 24 ? `${Math.round(h)} h` : `${Math.round(h / 24)} j`;
  })();

  const handleActionConfirm = async () => {
    if (!actionDialog) return;
    const { report, newStatus } = actionDialog;
    const etaNum = actionEtaHours ? parseInt(actionEtaHours, 10) : undefined;
    await updateStatusMutation.mutateAsync({
      reportId: report.id,
      ticketCode: report.ticket_code,
      status: newStatus,
      operatorRef: actionOperatorRef.trim() || undefined,
      publicNote: actionComment.trim() || undefined,
      etaHours: etaNum && !isNaN(etaNum) ? etaNum : undefined,
    });
    if (actionComment.trim()) {
      await supabase.from("report_comments").insert({
        report_id: report.id,
        user_id: user!.id,
        content: actionComment.trim(),
      });
    }
    setActionDialog(null);
    setActionComment("");
    setActionOperatorRef("");
    setActionEtaHours("");
  };

  // ─── Sous-composant Carte Rapport ─────────────────────────────────────────

  const ReportCard = ({ report }: { report: Report }) => {
    const isUpdating = updatingId === report.id;
    const statusInfo = STATUS_LABELS[report.status] ?? { label: report.status, color: "bg-muted text-muted-foreground" };
    const borderColor = URGENCY_COLORS[report.urgency] ?? "border-l-muted";

    return (
      <Card className={`border-l-4 ${borderColor} rounded-2xl border-border bg-card shadow-sm hover:shadow-md transition-all`}>
        <CardContent className="p-4 sm:p-5 space-y-3">
          {/* En-tête de carte */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted">
                {SERVICE_ICONS[report.service_type] ?? <Building2 className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div>
                <span className="text-sm font-bold text-foreground line-clamp-1">{report.description}</span>
                <p className="text-[11px] text-muted-foreground">{report.report_category || report.service_type}</p>
              </div>
            </div>
            <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>

          {/* Localisation + confirmations */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              {report.quartier ? `${report.quartier}, ` : ""}{report.commune}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {report.verifications} confirmation{report.verifications > 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(report.created_at)}
            </span>
            {report.urgency === "critical" && (
              <span className="flex items-center gap-1 text-red-600 font-bold bg-red-500/10 px-2 py-0.5 rounded-md">
                <AlertTriangle className="h-3 w-3" /> Urgence Haute
              </span>
            )}
          </div>

          {/* Ticket & Référence interne */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/60">
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-lg">
              <Ticket className="h-3 w-3" /> {report.ticket_code || `SIG-${report.commune.slice(0,3).toUpperCase()}-${report.id.slice(0,4).toUpperCase()}`}
            </span>
            {report.operator_reference && (
              <span className="inline-flex items-center text-[11px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-lg border border-border">
                Réf: {report.operator_reference}
              </span>
            )}
            {report.operator_last_note && (
              <p className="w-full text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-2 mt-1">
                "{report.operator_last_note}"
              </p>
            )}
          </div>

          {/* Boutons d'Action Opérateur */}
          <div className="flex gap-2 pt-2 flex-wrap items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {report.status === "active" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-bold text-amber-600 dark:text-amber-400 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20"
                  disabled={isUpdating}
                  onClick={() => {
                    setActionDialog({ report, newStatus: "processing" });
                    setActionOperatorRef(`OT-${currentTheme.name}-${Math.floor(1000 + Math.random() * 9000)}`);
                    setActionComment("");
                  }}
                >
                  {isUpdating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                  Prendre en charge
                </Button>
              )}
              {report.status !== "resolved" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20"
                  disabled={isUpdating}
                  onClick={() => {
                    setActionDialog({ report, newStatus: "resolved" });
                    setActionOperatorRef(report.operator_reference || `OT-${currentTheme.name}-${Math.floor(1000 + Math.random() * 9000)}`);
                    setActionComment("Intervention technique terminée et service rétabli avec succès.");
                  }}
                >
                  {isUpdating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
                  Marquer Résolu
                </Button>
              )}
              {report.status === "resolved" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                  disabled={isUpdating}
                  onClick={() => updateStatusMutation.mutate({ reportId: report.id, status: "active" })}
                >
                  <RefreshCw className="mr-1.5 h-3 w-3" /> Rouvrir le dossier
                </Button>
              )}
            </div>

            <a
              href={`/signalement/${report.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary font-semibold flex items-center gap-1"
            >
              Fiche publique <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ─── Rendu Principal ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* 🏢 BANNIÈRE COBRANDÉE OPÉRATEUR (CIE / SODECI / MAIRIE) */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl border ${currentTheme.bannerBorder} ${currentTheme.bannerBg} p-6 sm:p-8 backdrop-blur-sm shadow-sm relative overflow-hidden`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl shadow-md"
                style={{ backgroundColor: currentTheme.primaryHex }}
              >
                <OperatorIcon className="h-8 w-8 text-slate-950" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={`${currentTheme.badgeBg} ${currentTheme.badgeText} ${currentTheme.badgeBorder} border font-bold text-xs`}>
                    Espace Opérateur Officiel
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5 text-primary" /> {currentTheme.regulatorName}
                  </span>
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  {partnerProfile?.organization_name || currentTheme.fullName}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {currentTheme.slogan}
                </p>
              </div>
            </div>

            {/* Sélecteur de vue opérateur & Export */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-card border border-border shadow-sm">
                <span className="text-[11px] font-bold text-muted-foreground px-2">Vue :</span>
                <Select value={selectedOperatorId} onValueChange={setSelectedOperatorId}>
                  <SelectTrigger className="h-9 w-[180px] rounded-xl border-none font-bold text-xs bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cie" className="text-xs font-bold text-amber-600">
                      ⚡ CIE (Électricité)
                    </SelectItem>
                    <SelectItem value="sodeci" className="text-xs font-bold text-sky-600">
                      💧 SODECI (Eau Potable)
                    </SelectItem>
                    <SelectItem value="mairie" className="text-xs font-bold text-emerald-600">
                      🏛️ Mairie (Voirie / DST)
                    </SelectItem>
                    <SelectItem value="ngo" className="text-xs font-bold text-indigo-600">
                      🤝 Observatoire Citoyen
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="h-11 px-4 rounded-xl border-border text-xs font-bold gap-2 shadow-sm"
              >
                <Download className="h-4 w-4 text-primary" />
                Exporter (CSV)
              </Button>
            </div>
          </div>
        </motion.div>

        {/* 4 KPIS OPÉRATEUR AUX COULEURS DU CONCESSIONNAIRE */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className={`rounded-3xl border border-border p-5 bg-card shadow-sm`}>
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>Dossiers Assignés</span>
              <OperatorIcon className={`h-4 w-4 ${currentTheme.primaryColor}`} />
            </div>
            <div className="text-3xl font-black text-foreground mt-2">{filteredReports.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Sur le Grand Abidjan</p>
          </Card>

          <Card className={`rounded-3xl border border-border p-5 bg-card shadow-sm`}>
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>En cours d'intervention</span>
              <RefreshCw className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-3xl font-black text-amber-500 mt-2">{active.length + processing.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">{processing.length} pris en charge</p>
          </Card>

          <Card className={`rounded-3xl border border-border p-5 bg-card shadow-sm`}>
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>Taux de Résolution</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{resolutionRate} %</div>
            <p className="text-[11px] text-muted-foreground mt-1">{resolved.length} pannes réparées</p>
          </Card>

          <Card className={`rounded-3xl border border-border p-5 bg-card shadow-sm`}>
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>Délai Moyen / SLA</span>
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div className="text-3xl font-black text-foreground mt-2">{avgResolutionHours ?? "–"}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Cible légale : &lt; {currentTheme.slaHours}h</p>
          </Card>
        </div>

        {/* RECHERCHE & FILTRAGE COMMUNE */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par quartier, n° ticket, ordre de travail..."
              className="pl-10 h-11 rounded-2xl border-border bg-card text-xs font-medium"
            />
          </div>
          <Select value={communeFilter} onValueChange={setCommuneFilter}>
            <SelectTrigger className="h-11 w-full sm:w-[200px] rounded-2xl border-border bg-card text-xs font-semibold">
              <SelectValue placeholder="Toutes les communes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les communes</SelectItem>
              <SelectItem value="Cocody">Cocody</SelectItem>
              <SelectItem value="Yopougon">Yopougon</SelectItem>
              <SelectItem value="Abobo">Abobo</SelectItem>
              <SelectItem value="Marcory">Marcory</SelectItem>
              <SelectItem value="Plateau">Plateau</SelectItem>
              <SelectItem value="Koumassi">Koumassi</SelectItem>
              <SelectItem value="Port-Bouët">Port-Bouët</SelectItem>
              <SelectItem value="Treichville">Treichville</SelectItem>
              <SelectItem value="Adjamé">Adjamé</SelectItem>
              <SelectItem value="Attécoubé">Attécoubé</SelectItem>
              <SelectItem value="Bingerville">Bingerville</SelectItem>
              <SelectItem value="Anyama">Anyama</SelectItem>
              <SelectItem value="Grand-Bassam">Grand-Bassam</SelectItem>
              <SelectItem value="Songon">Songon</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* LISTE DES SIGNALEMENTS PAR ONGLETS */}
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList className="w-full h-12 rounded-2xl bg-muted/60 p-1 border border-border">
            <TabsTrigger value="active" className={`flex-1 rounded-xl text-xs ${currentTheme.activeTabClass}`}>
              À Traiter <Badge variant="secondary" className="ml-1.5 text-[10px]">{active.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="processing" className={`flex-1 rounded-xl text-xs ${currentTheme.activeTabClass}`}>
              En Intervention <Badge variant="secondary" className="ml-1.5 text-[10px]">{processing.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="resolved" className={`flex-1 rounded-xl text-xs ${currentTheme.activeTabClass}`}>
              Résolus <Badge variant="secondary" className="ml-1.5 text-[10px]">{resolved.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {(["active", "processing", "resolved"] as const).map((tab) => {
            const list = tab === "active" ? active : tab === "processing" ? processing : resolved;
            return (
              <TabsContent key={tab} value={tab} className="space-y-3 mt-4">
                {reportsLoading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : list.length === 0 ? (
                  <Card className="rounded-3xl border border-dashed border-border bg-card/50 p-12 text-center">
                    <CheckCircle className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-sm font-bold text-foreground">Aucun signalement dans cette section</p>
                    <p className="text-xs text-muted-foreground mt-1">Tous les incidents correspondants ont été traités.</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {list.map((report) => <ReportCard key={report.id} report={report} />)}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </main>

      {/* DIALOG DE MISE À JOUR DU STATUT & NOTE PUBLIQUE */}
      <Dialog open={!!actionDialog} onOpenChange={(v) => { if (!v) setActionDialog(null); }}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              {actionDialog?.newStatus === "resolved"
                ? <><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Clôturer et marquer résolu</>
                : <><RefreshCw className="h-5 w-5 text-amber-600" /> Prise en charge de l'intervention</>}
            </DialogTitle>
          </DialogHeader>
          {actionDialog && (
            <div className="space-y-4 pt-2">
              <div className="rounded-2xl bg-muted/60 p-3.5 text-xs border border-border">
                <p className="font-bold text-foreground">{actionDialog.report.commune} · {actionDialog.report.quartier}</p>
                <p className="text-muted-foreground mt-1 line-clamp-2">{actionDialog.report.description}</p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">
                      N° Ordre de travail / Réf.
                    </label>
                    <Input
                      value={actionOperatorRef}
                      onChange={(e) => setActionOperatorRef(e.target.value)}
                      placeholder={`Ex: OT-${currentTheme.name}-8942`}
                      className="h-10 rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">
                      Délai prévisionnel
                    </label>
                    <Select value={actionEtaHours} onValueChange={setActionEtaHours}>
                      <SelectTrigger className="h-10 rounded-xl text-xs">
                        <SelectValue placeholder="Estimation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">~ 2 heures</SelectItem>
                        <SelectItem value="4">~ 4 heures</SelectItem>
                        <SelectItem value="12">~ 12 heures</SelectItem>
                        <SelectItem value="24">~ 24 heures (SLA CIE)</SelectItem>
                        <SelectItem value="48">~ 48 heures (SLA SODECI)</SelectItem>
                        <SelectItem value="72">~ 72 heures (Mairie)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                    Note publique pour les résidents
                  </label>
                  <Textarea
                    value={actionComment}
                    onChange={(e) => setActionComment(e.target.value)}
                    placeholder={actionDialog.newStatus === "resolved"
                      ? "Ex: Le câble Haute Tension a été réparé par l'équipe de permanence. Service rétabli à 100%."
                      : "Ex: Équipe technique dépêchée sur les lieux pour diagnostiquer la fuite."}
                    rows={3}
                    maxLength={200}
                    className="resize-none text-xs rounded-xl"
                  />
                  {actionComment.length > 150 && (
                    <p className="text-[11px] text-muted-foreground text-right">{actionComment.length}/200</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 rounded-xl h-11 text-xs font-bold" onClick={() => setActionDialog(null)}>
                  Annuler
                </Button>
                <Button
                  className={`flex-1 rounded-xl h-11 text-xs gap-2 ${actionDialog.newStatus === "resolved" ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold" : currentTheme.primaryButtonClass}`}
                  disabled={updateStatusMutation.isPending}
                  onClick={handleActionConfirm}
                >
                  {updateStatusMutation.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Send className="h-4 w-4" />}
                  Valider
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
};

export default PartnerDashboardPage;
