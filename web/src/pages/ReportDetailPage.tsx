import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useGoBack } from "@/hooks/useGoBack";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Zap, Droplets, MapPin, Calendar, CheckCircle2,
  Clock, Users, AlertTriangle, ExternalLink, Loader2, Shield, ThumbsUp,
  LogIn, UserPlus, Wrench, PartyPopper, Radio, AlertOctagon,
  Ticket, Landmark, Copy, Check, Pencil, X, Save
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import PhotoGallery from "@/components/PhotoGallery";
import DurationBadge from "@/components/DurationBadge";
import ShareButton from "@/components/ShareButton";
import ReportComments from "@/components/ReportComments";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { supabase } from "@/integrations/supabase/client";
import { COMMUNE_COLORS } from "@/lib/communes";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useRelayConfig } from "@/hooks/useRelayConfig";
import { useUserRole } from "@/hooks/useUserRole";
import { extractInfraLabel, cleanDescription } from "@/lib/report-display";
import { getInfraIllustration } from "@/lib/infra-icons";
import { getDisplayTicketCode, formatPadaAddress } from "@/lib/pada";

interface ReportDetail {
  id: string;
  user_id: string;
  ticket_code?: string | null;
  pada_commune_code?: string | null;
  pada_street_name?: string | null;
  pada_formatted_address?: string | null;
  service_type: string;
  report_category: string;
  description: string;
  commune: string;
  quartier: string;
  status: string;
  urgency: string;
  created_at: string;
  start_time: string;
  resolved_at: string | null;
  validated: boolean;
  validated_at: string | null;
  forwarded_to_operator_at: string | null;
  photo_url: string | null;
  photo_urls: string[] | null;
  verifications: number;
  repair_verifications: number | null;
  impacted_people: number;
  babies: number;
  pregnant: number;
  elderly: number;
  operator_name?: string | null;
  operator_reference?: string | null;
  estimated_resolution_time?: string | null;
  operator_last_note?: string | null;
}

const SERVICE_LABELS: Record<string, string> = {
  electricity: "Électricité",
  water: "Eau",
  infrastructure: "Infrastructure",
};

const URGENCY_LABELS: Record<string, string> = {
  low: "Faible",
  medium: "Modérée",
  high: "Élevée",
  critical: "Critique",
};

const URGENCY_COLORS: Record<string, string> = {
  low: "bg-success/10 text-success border-success/30",
  medium: "bg-warning/10 text-warning border-warning/30",
  high: "bg-warning/10 text-warning border-warning/30",
  critical: "bg-destructive/10 text-destructive border-destructive/30",
};

const TimelineStep = ({
  done, label, date, icon, progress,
}: {
  done: boolean; label: string; date?: string | null; icon: React.ReactNode; progress?: string;
}) => (
  <div className={`flex items-start gap-3 ${done ? "opacity-100" : "opacity-30"}`}>
    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
      done ? "border-primary bg-primary/10 text-primary" : "border-muted-foreground/30 text-muted-foreground"
    }`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-semibold text-foreground">
        {label}
        {progress && <span className="ml-1.5 text-xs font-normal text-muted-foreground">({progress})</span>}
      </p>
      {date && <p className="text-xs text-muted-foreground">{new Date(date).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</p>}
      {!date && done && <p className="text-xs text-muted-foreground">–</p>}
    </div>
  </div>
);

const ReportDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isResolveAction = searchParams.get("action") === "resolve";
  const goBack = useGoBack("/tableau-de-bord");
  const { user } = useAuth();
  const { data: thresholdStr } = useRelayConfig("corroboration_threshold", "3");
  const corroborationThreshold = parseInt(thresholdStr ?? "3", 10);
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [corroborating, setCorroborating] = useState(false);
  const [corroborated, setCorroborated] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [reopening, setReopening] = useState(false);

  const isElecMeta = report?.service_type === "electricity";
  const isInfraMeta = report?.report_category === "infrastructure";
  const metaDesc = report
    ? isInfraMeta
      ? `Problème d'infrastructure signalé à ${report.quartier || report.commune} — ${report.description.slice(0, 100)}`
      : `Coupure de ${isElecMeta ? "courant" : "eau"} signalée à ${report.quartier || ""} ${report.commune}. ${report.verifications} confirmation(s).`
    : "Détail d'un signalement citoyen sur SIGNA-CI.";

  usePageMeta({
    title: report
      ? isInfraMeta
        ? `Infrastructure — ${report.commune}`
        : `Coupure ${isElecMeta ? "électricité" : "eau"} — ${report.commune}`
      : "Signalement SIGNA-CI",
    description: metaDesc,
  });

  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editDescValue, setEditDescValue] = useState("");
  const [isSavingDesc, setIsSavingDesc] = useState(false);

  const handleStartEditDesc = () => {
    if (!report) return;
    setEditDescValue(report.description);
    setIsEditingDesc(true);
  };

  const handleSaveDescription = async () => {
    if (!report || !editDescValue.trim()) return;
    if (editDescValue.trim().length < 5) {
      toast.error("La description doit comporter au moins 5 caractères");
      return;
    }
    setIsSavingDesc(true);
    try {
      const { error } = await supabase
        .from("reports")
        .update({ description: editDescValue.trim(), updated_at: new Date().toISOString() } as any)
        .eq("id", report.id);

      if (error) {
        const { error: rpcError } = await supabase.rpc("update_report_description", {
          p_report_id: report.id,
          p_description: editDescValue.trim(),
        });
        if (rpcError) throw rpcError;
      }

      setReport((prev) => (prev ? { ...prev, description: editDescValue.trim() } : prev));
      setIsEditingDesc(false);
      toast.success("Description mise à jour avec succès !");
    } catch (err: any) {
      toast.error("Impossible de modifier la description", {
        description: err?.message || "Erreur de mise à jour",
      });
    } finally {
      setIsSavingDesc(false);
    }
  };

  useEffect(() => {
    if (!id) return;

    const processReportData = (data: any) => {
      const formattedReport: ReportDetail = {
        id: data.id,
        user_id: data.user_id || "",
        ticket_code: data.ticket_code,
        pada_commune_code: data.pada_commune_code,
        pada_street_name: data.pada_street_name,
        pada_formatted_address: data.pada_formatted_address,
        service_type: data.service_type || "electricity",
        report_category: data.report_category || "outage",
        description: data.description || "",
        commune: data.commune || "",
        quartier: data.quartier || "",
        status: data.status || "active",
        urgency: data.urgency || "medium",
        created_at: data.created_at,
        start_time: data.start_time || data.created_at,
        resolved_at: data.resolved_at,
        validated: data.validated !== false,
        validated_at: data.validated_at,
        forwarded_to_operator_at: data.forwarded_to_operator_at,
        photo_url: data.photo_url,
        photo_urls: data.photo_urls,
        verifications: Number(data.verifications || 0),
        repair_verifications: data.repair_verifications ? Number(data.repair_verifications) : null,
        impacted_people: Number(data.impacted_people || 1),
        babies: Number(data.babies || 0),
        pregnant: Number(data.pregnant || 0),
        elderly: Number(data.elderly || 0),
        operator_name: data.operator_name,
        operator_reference: data.operator_reference,
        estimated_resolution_time: data.estimated_resolution_time,
        operator_last_note: data.operator_last_note,
      };

      setReport(formattedReport);
      setNotFound(false);

      if (isResolveAction && formattedReport.status !== "resolved") {
        toast.info("⚡ Confirmez si le service est rétabli en cliquant sur 'Oui, rétabli !'", { duration: 6000 });
      }

      // Charger l'historique des statuts
      supabase
        .from("report_status_history")
        .select("id, old_status, new_status, operator_name, operator_reference, public_note, estimated_resolution_time, created_at")
        .eq("report_id", id)
        .order("created_at", { ascending: true })
        .then(({ data: histData }) => {
          if (histData) setStatusHistory(histData);
        });

      // Vérifier si l'utilisateur a déjà soutenu / corroboré
      if (user) {
        if (formattedReport.report_category === "infrastructure") {
          supabase
            .from("report_support_votes")
            .select("id")
            .eq("report_id", id)
            .eq("user_id", user.id)
            .maybeSingle()
            .then(({ data: voteData }) => {
              if (voteData) setCorroborated(true);
            });
        } else {
          supabase
            .from("corroborations")
            .select("id")
            .eq("report_id", id)
            .eq("user_id", user.id)
            .maybeSingle()
            .then(({ data: corrData }) => {
              if (corrData) setCorroborated(true);
            });
        }
      }
    };

    const fetchReport = async () => {
      // 1. Essayer la fonction RPC publique par ID
      try {
        const { data: rpcData } = await (supabase as any).rpc("get_public_report_by_id", {
          p_report_id: id,
        });
        if (rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
          processReportData(rpcData[0]);
          setLoading(false);
          return;
        }
      } catch (e) {}

      // 2. Essayer get_public_reports
      try {
        const { data: pubData } = await (supabase as any).rpc("get_public_reports");
        if (pubData && Array.isArray(pubData)) {
          const found = pubData.find((r: any) => r.id === id);
          if (found) {
            processReportData(found);
            setLoading(false);
            return;
          }
        }
      } catch (e) {}

      // 3. Fallback direct via table reports
      const { data, error } = await supabase
        .from("reports")
        .select("id, user_id, ticket_code, pada_commune_code, pada_street_name, pada_formatted_address, service_type, report_category, description, commune, quartier, status, urgency, created_at, start_time, resolved_at, validated, validated_at, forwarded_to_operator_at, photo_url, photo_urls, verifications, repair_verifications, impacted_people, babies, pregnant, elderly, operator_name, operator_reference, estimated_resolution_time, operator_last_note")
        .eq("id", id)
        .eq("validated", true)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        processReportData(data);
      }
      setLoading(false);
    };

    fetchReport();
  }, [id, user, isResolveAction]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (notFound || !report) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground mb-4">Signalement introuvable.</p>
          <Button variant="outline" onClick={goBack}>Retour</Button>
        </div>
      </div>
    );
  }

  const { isAdmin, isModerator } = useUserRole();
  const color = COMMUNE_COLORS[report.commune] || "#888";
  const isElec = report.service_type === "electricity";
  const isResolved = report.status === "resolved";
  const isInfra = report.report_category === "infrastructure";
  const hasVulnerable = report.babies > 0 || report.pregnant > 0 || report.elderly > 0;
  const isAuthor = user?.id === report.user_id;
  const canCorroborate = user && !isAuthor && !isResolved;
  const canViewFullDomesticPada = isInfra || isAuthor || isAdmin || isModerator;

  // Négligé : actif depuis >7j sans aucune corroboration
  const ageDays = Math.floor(
    (Date.now() - new Date(report.created_at).getTime()) / 86400000
  );
  const isChronic = report.status === "chronic";
  const isNeglected =
    report.status === "active" &&
    ageDays >= 7 &&
    report.verifications === 0;

  // Calcul durée de résolution si résolu
  const resolvedDuration = (() => {
    if (!report.resolved_at) return null;
    const from = new Date(report.start_time || report.created_at);
    const to = new Date(report.resolved_at);
    const diffH = Math.round((to.getTime() - from.getTime()) / 3600000);
    if (diffH < 1) return "moins d'1 heure";
    if (diffH < 24) return `${diffH}h`;
    return `${Math.round(diffH / 24)} jour${Math.round(diffH / 24) > 1 ? "s" : ""}`;
  })();

  // Textes adaptés outage vs infrastructure
  const corroborateLabel = isInfra
    ? "Je soutiens cette demande"
    : "Je confirme cette coupure";
  const corroboratedLabel = isInfra ? "Soutien enregistré ✓" : "Confirmation enregistrée ✓";
  const shareText = isInfra
    ? `🚧 INFRASTRUCTURE — ${report.quartier ? `${report.quartier}, ` : ""}${report.commune}\n\n${cleanDescription(report.description)}\n\n✊ Soutenez cette demande sur SIGNA-CI :`
    : `${isElec ? "⚡" : "💧"} ALERTE COUPURE — ${report.quartier ? `${report.quartier}, ` : ""}${report.commune}\n\nCoupure ${isElec ? "d'électricité" : "d'eau"} en cours. Toujours sans intervention.\n📢 Rejoignez-nous sur SIGNA-CI pour faire pression sur ${isElec ? "CIE" : "SODECI"}.\nPlus on est nombreux, plus vite ils interviennent !`;

  const handleReopen = async () => {
    if (!user) { toast.error("Connectez-vous pour signaler que le problème persiste"); return; }
    setReopening(true);
    try {
      const { error } = await (supabase as any).rpc("reopen_infrastructure_report", {
        p_report_id: report.id,
        p_reason: "Signalé toujours présent par un riverain.",
      });
      if (error) throw error;
      setReport((prev) => prev ? { ...prev, status: "active", resolved_at: null } : prev);
      toast.success("⚠️ Signalement réouvert. Les équipes techniques ont été notifiées.");
    } catch (err: any) {
      toast.error("Impossible de réouvrir : " + (err?.message || ""));
    } finally {
      setReopening(false);
    }
  };

  const handleResolve = async () => {
    if (!user) { toast.error("Connectez-vous pour marquer ce signalement comme résolu"); return; }
    setResolving(true);
    try {
      const { error } = await supabase
        .from("reports")
        .update({ status: "resolved", resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", report.id);
      if (error) throw error;
      setReport((prev) => prev ? { ...prev, status: "resolved", resolved_at: new Date().toISOString() } : prev);
      toast.success("✅ Signalement marqué comme résolu ! Merci pour votre civisme.");
    } catch (err: any) {
      toast.error("Impossible de clôturer pour le moment : " + (err?.message || ""));
    } finally {
      setResolving(false);
    }
  };

  const handleCorroborate = async () => {
    if (!user) { toast.error("Connectez-vous pour soutenir ce signalement"); return; }
    setCorroborating(true);
    try {
      if (isInfra) {
        const { data, error } = await (supabase as any).rpc("vote_infrastructure_support", {
          p_report_id: report.id,
        });
        if (error) {
          await supabase.from("report_support_votes").insert({ report_id: report.id, user_id: user.id });
        }
        setCorroborated(true);
        setReport((prev) => prev ? { ...prev, verifications: prev.verifications + 1 } : prev);
        toast.success(`✅ ${corroboratedLabel} — merci !`);
      } else {
        const { error } = await supabase.rpc("corroborate_report", { p_report_id: report.id });
        if (error) throw error;
        setCorroborated(true);
        setReport((prev) => prev ? { ...prev, verifications: prev.verifications + 1 } : prev);
        toast.success(`✅ ${corroboratedLabel} — merci !`);
      }
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("déjà confirmé") || msg.includes("déjà voté")) toast.info("Vous avez déjà soutenu ce signalement.");
      else toast.error("Impossible d'enregistrer pour le moment.");
    } finally {
      setCorroborating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Colour bar */}
      <div className="h-1.5 w-full" style={{ backgroundColor: color }} />

      <main className="container max-w-6xl py-6">
        {/* Back */}
        <div className="mb-4">
          <button
            onClick={goBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
        </div>

        {/* ── Responsive Desktop 2-Column Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ════ GAUCHE : Détails du signalement & Médias (col-span-7) ════ */}
          <div className="lg:col-span-7 space-y-4">

            {/* ── Bannière RÉSOLU ── */}
            <AnimatePresence>
              {isResolved && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border-2 border-success/40 bg-success/8 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/15">
                      <PartyPopper className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="font-bold text-success">
                        {isInfra ? "Problème résolu !" : "Coupure terminée !"}
                      </p>
                      <p className="text-xs text-success/80 mt-0.5">
                        {isInfra
                          ? "Ce problème d'infrastructure a été pris en charge."
                          : `Le service ${isElec ? "électrique" : "en eau"} a été rétabli${resolutionDuration ? ` en ${resolutionDuration}` : ""}.`}
                      </p>
                      {report.verifications > 0 && (
                        <p className="text-xs text-success/70 mt-1">
                          {isInfra
                            ? <>Merci aux <strong>{report.verifications} citoyen{report.verifications > 1 ? "s" : ""}</strong> qui ont soutenu ce signalement.</>
                            : <>Merci aux <strong>{report.verifications} voisin{report.verifications > 1 ? "s" : ""}</strong> qui ont confirmé cette coupure.</>}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-success/20 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          const ticketDisplay = report.ticket_code ? `#${report.ticket_code}` : "";
                          const text = `✅ *BONNE NOUVELLE (${report.commune} · ${report.quartier})* :\n\nL'incident ${ticketDisplay ? `(${ticketDisplay}) ` : ""}"${report.description || (isInfra ? "Voirie / Éclairage" : isElec ? "Coupure de courant" : "Coupure d'eau")}" a été résolu et rétabli !\n\nSuivez l'état des infrastructures de notre quartier en direct sur SIGNA.ci :\n👉 ${window.location.href}`;
                          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
                        }}
                        className="bg-[#25D366] hover:bg-[#1EBE5D] text-slate-950 font-bold text-xs gap-1.5 shadow-sm"
                      >
                        <div className="h-4 w-4 rounded-full flex items-center justify-center">
                          <WhatsAppIcon className="h-3.5 w-3.5" />
                        </div>
                        <span>Annoncer aux voisins sur WhatsApp</span>
                      </Button>

                      <Button asChild size="sm" variant="outline" className="border-success/40 text-success hover:bg-success/10 text-xs gap-1.5">
                        <Link to="/signaler">
                          {isInfra ? <Wrench className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                          {isInfra ? "Signaler un autre problème" : "Signaler une coupure"}
                        </Link>
                      </Button>
                    </div>

                    {isInfra && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleReopen}
                        disabled={reopening}
                        className="text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 border border-dashed border-amber-500/30 gap-1.5"
                      >
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        <span>Ce n'est pas réparé ? Rouvrir</span>
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Bannière ACTIF — rappel live ── */}
            {!isResolved && (
              <div className="space-y-2.5">
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2.5"
                >
                  <Radio className="h-4 w-4 text-destructive animate-pulse shrink-0" />
                  <p className="text-xs font-semibold text-destructive">
                    {isInfra
                      ? "Problème toujours présent · En attente d'intervention"
                      : `Coupure de ${isElec ? "courant" : "d'eau"} en cours · Toujours sans intervention`}
                  </p>
                </motion.div>

                {/* ── Relance / Confirmation directe de retour de service ── */}
                {!isInfra && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm"
                  >
                    <div>
                      <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        Le service est-il rétabli dans votre quartier ?
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Aidez la communauté en confirmant si l'électricité ou l'eau est revenue.
                      </p>
                    </div>

                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 h-8 w-full sm:w-auto shrink-0 shadow-sm"
                      onClick={handleResolve}
                      disabled={resolving}
                    >
                      {resolving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Oui, rétabli !
                    </Button>
                  </motion.div>
                )}
              </div>
            )}

            {/* ── Bannière CHRONIQUE ── */}
            {isChronic && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border-2 border-destructive/40 bg-destructive/8 p-4 flex items-start gap-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/15">
                  <AlertOctagon className="h-4.5 w-4.5 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-destructive">
                    Problème chronique — {ageDays} jours sans résolution
                  </p>
                  <p className="text-xs text-destructive/80 mt-0.5">
                    Ce signalement dépasse 14 jours sans intervention. Partagez-le pour maintenir la pression collective.
                  </p>
                  <ShareButton
                    title={`Signalement SIGNA-CI — ${report.commune}`}
                    text={shareText}
                    url={`${window.location.origin}/signalement/${report.id}`}
                    variant="outline"
                    size="sm"
                    className="mt-2.5 border-destructive/40 text-destructive hover:bg-destructive/10 text-xs gap-1.5"
                  />
                </div>
              </motion.div>
            )}

            {/* ── Bannière NÉGLIGÉ (>7j, 0 corroboration, non chronique) ── */}
            {isNeglected && !isChronic && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border-2 border-warning/40 bg-warning/8 p-4 flex items-start gap-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/15">
                  <AlertOctagon className="h-4.5 w-4.5 text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-warning">
                    {ageDays} jours sans prise en charge
                  </p>
                  <p className="text-xs text-warning/80 mt-0.5">
                    {isInfra ? "Aucun citoyen n'a encore soutenu ce signalement." : "Aucun voisin n'a encore confirmé cette coupure."}
                    {canCorroborate
                      ? " Soyez le premier à le corroborer pour augmenter sa priorité."
                      : !user
                      ? " Connectez-vous pour être le premier à le confirmer."
                      : " Partagez-le pour mobiliser votre quartier."}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Header card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card shadow-card overflow-hidden"
            >
              {/* Commune banner */}
              <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: color }}>
                <div className="flex items-center gap-2 text-white">
                  {isInfra ? <Wrench className="h-4 w-4" /> : isElec ? <Zap className="h-4 w-4" /> : <Droplets className="h-4 w-4" />}
                  <span className="text-sm font-bold">{isInfra ? (extractInfraLabel(report.description) ?? "Infrastructure") : (SERVICE_LABELS[report.service_type] ?? report.service_type)}</span>
                </div>
                <Badge variant="outline" className={`text-white border-white/30 ${isResolved ? "bg-white/20" : "bg-white/10"}`}>
                  {isResolved ? "✅ Résolu" : "🔴 Actif"}
                </Badge>
              </div>

              <div className="p-5 space-y-4">
                {/* Commune + quartier */}
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-semibold text-foreground text-base">{report.commune}</span>
                  {report.quartier && <span className="text-sm text-muted-foreground">· {report.quartier}</span>}
                </div>

                {/* 🎫 Référence Officielle de Ticket & PADA */}
                <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Ticket Officiel : </span>
                        <span className="font-mono font-black text-foreground tracking-tight">
                          {getDisplayTicketCode({
                            ticket_code: report.ticket_code,
                            commune: report.commune,
                            created_at: report.created_at,
                            id: report.id,
                          })}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 gap-1 hover:bg-emerald-500/10"
                      onClick={() => {
                        const code = getDisplayTicketCode({
                          ticket_code: report.ticket_code,
                          commune: report.commune,
                          created_at: report.created_at,
                          id: report.id,
                        });
                        navigator.clipboard.writeText(code);
                        toast.success(`Ticket ${code} copié !`);
                      }}
                    >
                      <Copy className="h-3 w-3" />
                      <span>Copier</span>
                    </Button>
                  </div>

                  {/* Adresse PADA : visible publiquement pour les infrastructures (voirie, lampadaires), ou réservée à l'auteur & équipes techniques pour les coupures privées */}
                  {canViewFullDomesticPada && (
                    <div className="flex items-start gap-2 pt-0.5">
                      <Landmark className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Adressage PADA (MCLU) : </span>
                        <span className="text-foreground font-semibold">
                          {report.pada_formatted_address || formatPadaAddress({
                            commune: report.commune,
                            quartier: report.quartier,
                            streetName: report.pada_street_name || report.quartier,
                          })}
                        </span>
                        {!isInfra && isAuthor && (
                          <span className="text-[10px] text-muted-foreground block italic mt-0.5">
                            (Adresse confidentielle — transmise uniquement aux équipes techniques)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Description</span>
                    {user && report.user_id === user.id && report.status === "active" && !isEditingDesc && (
                      <button
                        type="button"
                        onClick={handleStartEditDesc}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <Pencil className="h-3 w-3" />
                        <span>Modifier</span>
                      </button>
                    )}
                  </div>
                  {isEditingDesc ? (
                    <div className="space-y-2 pt-1">
                      <textarea
                        value={editDescValue}
                        onChange={(e) => setEditDescValue(e.target.value)}
                        rows={3}
                        maxLength={600}
                        className="w-full rounded-xl border-2 border-primary/40 bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Précisez les détails ou l'évolution de votre signalement..."
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsEditingDesc(false)}
                          disabled={isSavingDesc}
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Annuler
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveDescription}
                          disabled={isSavingDesc || editDescValue.trim().length < 5}
                        >
                          {isSavingDesc ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          ) : (
                            <Save className="h-3.5 w-3.5 mr-1" />
                          )}
                          Enregistrer
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground leading-relaxed">{cleanDescription(report.description) || "Aucune description fournie."}</p>
                  )}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="outline" className={URGENCY_COLORS[report.urgency] ?? ""}>
                    Urgence {URGENCY_LABELS[report.urgency] ?? report.urgency}
                  </Badge>
                  {report.validated && (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                      <Shield className="h-3 w-3 mr-1" /> Validé
                    </Badge>
                  )}
                </div>

                {/* Galerie photos ou illustration représentative */}
                <PhotoGallery
                  photos={
                    (report.photo_urls && report.photo_urls.length > 0)
                      ? report.photo_urls
                      : report.photo_url ? [report.photo_url] : []
                  }
                  fallbackImage={getInfraIllustration(report.service_type, report.description)}
                  thumbHeight="h-56"
                />

                {/* Stats row */}
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border-t border-border pt-3">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(report.created_at).toLocaleDateString("fr-FR", { dateStyle: "long" })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {report.verifications} {isInfra ? `soutien${report.verifications !== 1 ? "s" : ""}` : `confirmation${report.verifications !== 1 ? "s" : ""}`}
                  </span>
                  {!isInfra && report.impacted_people > 1 && (
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      ~{report.impacted_people} personnes
                    </span>
                  )}
                  <DurationBadge
                    status={report.status}
                    resolved_at={report.resolved_at}
                    start_time={report.start_time}
                    created_at={report.created_at}
                    repair_verifications={report.repair_verifications}
                    verifications={report.verifications}
                  />
                </div>

                {/* Personnes vulnérables */}
                {!isInfra && hasVulnerable && (
                  <div className="rounded-xl bg-warning/10 border border-warning/20 px-3.5 py-2.5 text-xs text-warning space-y-0.5">
                    <p className="font-semibold">Personnes vulnérables signalées</p>
                    <div className="flex gap-3 flex-wrap">
                      {report.babies > 0 && <span>👶 {report.babies} bébé{report.babies > 1 ? "s" : ""}</span>}
                      {report.pregnant > 0 && <span>🤰 {report.pregnant} femme{report.pregnant > 1 ? "s" : ""} enceinte{report.pregnant > 1 ? "s" : ""}</span>}
                      {report.elderly > 0 && <span>👴 {report.elderly} personne{report.elderly > 1 ? "s" : ""} âgée{report.elderly > 1 ? "s" : ""}</span>}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Encart officiel Opérateur */}
            {(report.operator_name || report.operator_reference || report.operator_last_note) && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 space-y-3 shadow-card"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      {report.operator_name || "Opérateur / Mairie"}
                    </span>
                  </div>
                  {report.operator_reference && (
                    <Badge variant="outline" className="font-mono text-xs bg-background border-primary/30 text-primary">
                      Réf: {report.operator_reference}
                    </Badge>
                  )}
                </div>

                {report.operator_last_note && (
                  <p className="text-sm text-foreground italic bg-background/80 p-3 rounded-xl border border-border">
                    "{report.operator_last_note}"
                  </p>
                )}

                {report.estimated_resolution_time && !isResolved && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-0.5">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    <span>Intervention prévue d'ici : <strong>{new Date(report.estimated_resolution_time).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</strong></span>
                  </div>
                )}
              </motion.div>
            )}

          </div>

          {/* ════ DROITE : Suivi, Actions, Corroboration & Commentaires (col-span-5) ════ */}
          <div className="lg:col-span-5 space-y-4">

            {/* ── Bouton corroborer — utilisateur connecté non-auteur ── */}
            {canCorroborate && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl border border-border bg-card shadow-card p-4 space-y-2"
              >
                <Button
                  onClick={handleCorroborate}
                  disabled={corroborating || corroborated}
                  className="w-full gap-2 py-5 text-sm font-bold shadow-sm"
                >
                  {corroborating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ThumbsUp className="h-4 w-4" />
                  )}
                  {corroborated ? corroboratedLabel : corroborateLabel}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  {isInfra
                    ? "Votre soutien renforce la demande auprès des autorités"
                    : "Votre confirmation augmente la priorité de traitement"}
                </p>
              </motion.div>
            )}

            {/* ── CTA conversion — visiteur non connecté ── */}
            {!user && !isResolved && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 space-y-4 shadow-card"
              >
                <div className="text-center space-y-1">
                  <p className="text-base font-extrabold text-foreground">
                    {isInfra ? "🚧 Vous voyez aussi ce problème ?" : `${isElec ? "⚡" : "💧"} Vous subissez aussi cette coupure ?`}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isInfra
                      ? "Rejoignez SIGNA-CI et soutenez cette demande. Plus on est nombreux, plus les autorités agissent vite."
                      : `Rejoignez SIGNA-CI et confirmez cette coupure. Ensemble, on oblige ${isElec ? "CIE" : "SODECI"} à intervenir plus vite.`}
                  </p>
                </div>

                {/* Bénéfices rapides */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { icon: "✅", text: isInfra ? "Soutenir" : "Confirmer" },
                    { icon: "🔔", text: "Être alerté" },
                    { icon: "📊", text: "Suivre" },
                  ].map((b) => (
                    <div key={b.text} className="rounded-xl bg-background/60 border border-border px-2 py-2">
                      <p className="text-lg">{b.icon}</p>
                      <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">{b.text}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Button asChild className="w-full gap-2 font-bold py-3.5 text-xs">
                    <Link to={`/auth?redirect=/signalement/${report.id}&action=signup`}>
                      <UserPlus className="h-4 w-4" />
                      Créer mon compte — c'est gratuit
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full gap-2 text-xs">
                    <Link to={`/auth?redirect=/signalement/${report.id}&action=login`}>
                      <LogIn className="h-4 w-4" />
                      J'ai déjà un compte — Se connecter
                    </Link>
                  </Button>
                </div>
                <p className="text-center text-[11px] text-muted-foreground">
                  Inscription en 30s · Aucune publicité · Données protégées
                </p>
              </motion.div>
            )}

            {/* ── CTA visiteur — signalement résolu ── */}
            {!user && isResolved && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-2xl border border-border bg-card p-5 text-center space-y-3 shadow-card"
              >
                <p className="text-sm font-semibold text-foreground">
                  {isInfra
                    ? "Un autre problème dans votre quartier ?"
                    : "Un autre problème chez vous ?"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Rejoignez SIGNA-CI pour signaler, suivre et être alerté des coupures et problèmes d'infrastructure à Abidjan.
                </p>
                <div className="flex gap-2">
                  <Button asChild className="flex-1 gap-1.5 text-xs font-bold">
                    <Link to={`/auth?redirect=/signaler&action=signup`}>
                      <UserPlus className="h-4 w-4" /> S'inscrire
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="flex-1 gap-1.5 text-xs">
                    <Link to={`/auth?action=login`}>
                      <LogIn className="h-4 w-4" /> Se connecter
                    </Link>
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── CTA auteur — son propre signalement ── */}
            {user && isAuthor && !isResolved && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-xl border border-border bg-secondary/40 px-4 py-3 flex items-center justify-between gap-3 shadow-xs"
              >
                <div>
                  <p className="text-xs font-semibold text-foreground">C'est votre signalement</p>
                  <p className="text-xs text-muted-foreground">Partagez-le pour obtenir plus de confirmations</p>
                </div>
                <Link to="/verification">
                  <Button size="sm" variant="outline" className="text-xs gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Mettre à jour
                  </Button>
                </Link>
              </motion.div>
            )}

            {/* Timeline */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="rounded-2xl border border-border bg-card shadow-card p-4"
            >
              <h3 className="text-sm font-semibold text-foreground mb-4">Suivi du signalement</h3>
              <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-px before:bg-border">
                <TimelineStep
                  done
                  label="Signalement créé"
                  date={report.created_at}
                  icon={<Clock className="h-3.5 w-3.5" />}
                />
                <TimelineStep
                  done={report.validated}
                  label={report.validated ? "Validé par les modérateurs" : "En attente de validation"}
                  date={report.validated_at}
                  icon={<Shield className="h-3.5 w-3.5" />}
                />
                <TimelineStep
                  done={report.verifications >= corroborationThreshold}
                  label={isInfra
                    ? `${report.verifications} citoyen${report.verifications !== 1 ? "s" : ""} ont soutenu`
                    : `${report.verifications} voisin${report.verifications !== 1 ? "s" : ""} ont confirmé`}
                  date={report.verifications >= corroborationThreshold ? undefined : null}
                  icon={<Users className="h-3.5 w-3.5" />}
                  progress={report.verifications < corroborationThreshold ? `${report.verifications}/${corroborationThreshold}` : undefined}
                />
                <TimelineStep
                  done={!!report.forwarded_to_operator_at}
                  label={report.forwarded_to_operator_at ? "Transmis à l'opérateur" : "Transmission à l'opérateur en attente"}
                  date={report.forwarded_to_operator_at}
                  icon={<ExternalLink className="h-3.5 w-3.5" />}
                />
                <TimelineStep
                  done={isResolved}
                  label={isResolved ? "Problème résolu" : "En cours de traitement"}
                  date={report.resolved_at}
                  icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                />
              </div>
            </motion.div>

            {/* Actions + Partage */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="flex gap-2 flex-wrap"
            >
              <Button asChild variant="outline" className="flex-1 gap-2 min-w-[110px] text-xs">
                <Link to={`/commune/${encodeURIComponent(report.commune)}`}>
                  <ExternalLink className="h-3.5 w-3.5" />
                  {report.commune}
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1 gap-2 min-w-[110px] text-xs">
                <Link to="/carte">
                  <MapPin className="h-3.5 w-3.5" />
                  Carte
                </Link>
              </Button>
              <ShareButton
                title={`Signalement SIGNA-CI — ${report.commune}`}
                text={shareText}
                url={`${window.location.origin}/signalement/${report.id}`}
                variant="outline"
                size="sm"
                className="flex-1 min-w-[110px] text-xs"
              />
            </motion.div>

            {/* Commentaires */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <ReportComments reportId={report.id} />
            </motion.div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default ReportDetailPage;
