import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Clock, Power, Zap, Droplets, Loader2, PartyPopper, AlertTriangle,
  ThumbsUp, Trash2, Wrench, ArrowRight, ArrowLeft, ZoomIn, Eye, Sparkles, Filter,
  ShieldCheck, Check, Layers, Copy, MapPin, Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Header from "@/components/Header";
import NeighborCorroboration from "@/components/NeighborCorroboration";
import CorroborationStatus from "@/components/CorroborationStatus";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { COMMUNE_COLORS, COMMUNES } from "@/lib/communes";
import { cn } from "@/lib/utils";
import { useAnalytics } from "@/hooks/useAnalytics";
import { RESOLUTION } from "@/lib/content";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface MyReport {
  id: string;
  service_type: string;
  report_category: string;
  description: string;
  commune: string;
  quartier: string;
  status: string;
  urgency: string;
  created_at: string;
  start_time: string;
  verifications: number;
  last_reminder_at: string | null;
  repair_photos?: string[] | null;
  repair_note?: string | null;
  repair_declared_at?: string | null;
  repair_status?: string | null;
  resolved_with_transfer?: boolean | null;
}

interface TriageReport {
  id: string;
  service_type: string;
  report_category: string;
  description: string;
  commune: string;
  quartier: string;
  status: string;
  urgency: string;
  created_at: string;
  start_time?: string;
  verifications: number;
  photo_urls?: string[];
  street_name?: string;
  door_number?: string;
  address_notes?: string;
  user_id?: string;
  repair_photos?: string[] | null;
  repair_note?: string | null;
  repair_declared_at?: string | null;
  repair_status?: string | null;
  resolved_with_transfer?: boolean | null;
}

const NoActiveReportsSVG = () => (
  <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-5 h-24 w-auto" aria-hidden="true">
    <rect x="0" y="74" width="160" height="1.5" rx="1" fill="currentColor" opacity="0.12" />
    <rect x="12" y="48" width="36" height="27" rx="3" fill="currentColor" opacity="0.1" />
    <path d="M8 50L30 29L52 50" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" opacity="0.2" />
    <rect x="22" y="61" width="16" height="13" rx="2" fill="currentColor" opacity="0.15" />
    <rect x="112" y="48" width="36" height="27" rx="3" fill="currentColor" opacity="0.1" />
    <path d="M108 50L130 29L152 50" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" opacity="0.2" />
    <rect x="122" y="61" width="16" height="13" rx="2" fill="currentColor" opacity="0.15" />
    <circle cx="80" cy="50" r="20" fill="hsl(var(--success))" opacity="0.1" />
    <circle cx="80" cy="50" r="20" stroke="hsl(var(--success))" strokeWidth="1.5" opacity="0.25" />
    <path d="M71 50L77 56L90 43" stroke="hsl(var(--success))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.65" />
  </svg>
);

const VerificationPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const reportIdFromNotif = searchParams.get("report");
  const notifType = searchParams.get("type"); // "confirmation" or null
  const [reports, setReports] = useState<MyReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Type of the report being corroborated (from notification link)
  const [notifReportType, setNotifReportType] = useState<{ serviceType: string; reportCategory: string } | null>(null);

  // Resolve dialog
  const [resolveTarget, setResolveTarget] = useState<MyReport | null>(null);
  const [resolveTime, setResolveTime] = useState("");
  const [resolving, setResolving] = useState(false);
  const [justResolved, setJustResolved] = useState<string | null>(null);
  const [resolvedWithTransfer, setResolvedWithTransfer] = useState(true);

  // Confirm still ongoing
  const [confirming, setConfirming] = useState<string | null>(null);

  // Delete report
  const [deleteTarget, setDeleteTarget] = useState<MyReport | null>(null);
  const [deleteChip, setDeleteChip] = useState<string>("");
  const [deleteReason, setDeleteReason] = useState("");
  const { track } = useAnalytics();
  const cardOpenedAt = useRef<Record<string, number>>({});
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchMyActiveReports = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("reports")
      .select("id, service_type, report_category, description, commune, quartier, status, urgency, created_at, start_time, verifications, last_reminder_at, repair_photos, repair_note, repair_declared_at, repair_status, resolved_with_transfer")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (!error && data) setReports(data as MyReport[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchMyActiveReports();
  }, [user]);

  // Mode actif : "triage" (Mode Triage Éclair) ou "mes_alertes"
  const [activeTab, setActiveTab] = useState<"triage" | "mes_alertes">(() => {
    return searchParams.get("tab") === "mes_alertes" ? "mes_alertes" : "triage";
  });

  // États du Mode Triage Éclair
  const [triageReports, setTriageReports] = useState<TriageReport[]>([]);
  const [triageIndex, setTriageIndex] = useState(0);
  const [triageLoading, setTriageLoading] = useState(true);
  const [triageCommuneFilter, setTriageCommuneFilter] = useState<string>("all");
  const [sessionVerifiedCount, setSessionVerifiedCount] = useState(0);
  const [zoomPhotoUrl, setZoomPhotoUrl] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTriageReports = useCallback(async () => {
    setTriageLoading(true);
    try {
      let query = supabase
        .from("reports")
        .select("id, service_type, report_category, description, commune, quartier, status, urgency, created_at, start_time, verifications, photo_urls, street_name, door_number, address_notes, user_id, repair_photos, repair_note, repair_declared_at, repair_status, resolved_with_transfer")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(80);

      if (user) {
        query = query.neq("user_id", user.id);
      }
      if (triageCommuneFilter !== "all") {
        query = query.eq("commune", triageCommuneFilter);
      }

      const { data, error } = await query;
      if (!error && data) {
        setTriageReports(data as TriageReport[]);
        setTriageIndex(0);
      }
    } catch {
      /* silent */
    } finally {
      setTriageLoading(false);
    }
  }, [user, triageCommuneFilter]);

  useEffect(() => {
    if (activeTab === "triage") {
      fetchTriageReports();
    }
  }, [activeTab, fetchTriageReports]);

  const handleValidateCurrent = useCallback(async () => {
    const cur = triageReports[triageIndex];
    if (!cur || actionLoading) return;
    if (!user) {
      toast.error("Connectez-vous pour certifier les signalements du quartier.");
      return;
    }
    setActionLoading(true);
    if ("vibrate" in navigator) navigator.vibrate([25]);

    try {
      const { error } = await supabase.rpc("corroborate_report", { p_report_id: cur.id });
      if (error) {
        if (error.message?.includes("déjà confirmé")) {
          toast.info("Vous avez déjà certifié ce signalement.");
        } else {
          throw error;
        }
      } else {
        toast.success("✅ Signalement validé et certifié !", {
          description: `Impact renforcé pour ${cur.commune}, quartier ${cur.quartier}`,
        });
      }

      const nextCount = sessionVerifiedCount + 1;
      setSessionVerifiedCount(nextCount);
      if (nextCount % 5 === 0) {
        confetti({ particleCount: 75, spread: 65, origin: { y: 0.6 } });
      }

      setTriageIndex((prev) => prev + 1);
    } catch (err: any) {
      toast.error(err.message || "Erreur de validation");
    } finally {
      setActionLoading(false);
    }
  }, [triageReports, triageIndex, actionLoading, user, sessionVerifiedCount]);

  const handleSkipCurrent = useCallback(() => {
    if (actionLoading) return;
    if ("vibrate" in navigator) navigator.vibrate([15]);
    toast.info("⏭️ Signalement passé");
    setTriageIndex((prev) => prev + 1);
  }, [actionLoading]);

  const handleDuplicateCurrent = useCallback(() => {
    if (actionLoading) return;
    if ("vibrate" in navigator) navigator.vibrate([20]);
    toast.warning("⚠️ Noté comme doublon potentiel");
    setTriageIndex((prev) => prev + 1);
  }, [actionLoading]);

  // Raccourcis physiques sur PC : [ → ] Valider, [ ← ] Passer, [ D ] Doublon
  useEffect(() => {
    if (activeTab !== "triage") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleValidateCurrent();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleSkipCurrent();
      } else if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        handleDuplicateCurrent();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, handleValidateCurrent, handleSkipCurrent, handleDuplicateCurrent]);

  const handleConfirmStillOngoing = async (report: MyReport) => {
    const lastReminder = report.last_reminder_at ? new Date(report.last_reminder_at).getTime() : 0;
    const now = Date.now();
    if (now - lastReminder < 60 * 60 * 1000) {
      toast.info("Vous avez déjà relancé ce signalement récemment.");
      return;
    }

    setConfirming(report.id);
    cardOpenedAt.current[report.id] = Date.now();
    try {
      const newReminderAt = new Date().toISOString();
      const { error } = await supabase.rpc("confirm_report_still_ongoing", { p_report_id: report.id });
      if (error) {
        // Fallback in case RPC is not yet applied
        const { error: updateError } = await supabase
          .from("reports")
          .update({ last_reminder_at: newReminderAt })
          .eq("id", report.id);
        if (updateError) throw updateError;
      }

      setReports(prev => prev.map(r =>
        r.id === report.id ? { ...r, last_reminder_at: newReminderAt } : r
      ));
      track("verification_ongoing", {
        report_id: report.id,
        category: report.report_category,
        service: report.service_type,
        commune: report.commune,
        time_to_decision_ms: cardOpenedAt.current[report.id]
          ? Date.now() - cardOpenedAt.current[report.id]
          : null,
      });
      toast.success("Signalement relancé avec succès.");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setConfirming(null);
    }
  };

  const openResolveDialog = (report: MyReport) => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    cardOpenedAt.current[report.id] = Date.now();
    setResolveTime(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`);
    setResolvedWithTransfer(report.resolved_with_transfer !== false);
    setResolveTarget(report);
  };

  const handleResolve = async () => {
    if (!resolveTarget) return;
    const isInfra = resolveTarget.report_category === "infrastructure";
    if (!isInfra && !resolveTime) return;
    setResolving(true);
    try {
      const resolvedAt = isInfra ? new Date().toISOString() : new Date(resolveTime).toISOString();
      if (resolveTarget.repair_status === "pending_review") {
        const { error: rpcErr } = await (supabase as any).rpc("moderate_repair_declaration", {
          p_report_id: resolveTarget.id,
          p_decision: "approved",
          p_resolved_with_transfer: resolvedWithTransfer,
          p_moderator_note: "Validé lors de la vérification terrain",
        });
        if (rpcErr) throw rpcErr;
      } else {
        const { error } = await supabase.rpc("resolve_report", {
          p_report_id: resolveTarget.id,
          p_resolved_at: resolvedAt,
        });
        if (error) throw error;
        await supabase
          .from("reports")
          .update({ resolved_with_transfer: resolvedWithTransfer })
          .eq("id", resolveTarget.id);
      }
      const resolvedId = resolveTarget.id;
      track("verification_resolved", {
        report_id: resolvedId,
        category: resolveTarget.report_category,
        service: resolveTarget.service_type,
        commune: resolveTarget.commune,
        time_to_decision_ms: cardOpenedAt.current[resolvedId]
          ? Date.now() - cardOpenedAt.current[resolvedId]
          : null,
      });
      const successMsg = RESOLUTION[isInfra ? "infrastructure" : "outage"].toastSuccess(
        resolveTarget.service_type,
      );
      setJustResolved(resolvedId);
      setResolveTarget(null);
      toast.success(successMsg);
      setTimeout(() => {
        setReports((prev) => prev.filter((r) => r.id !== resolvedId));
        setJustResolved(null);
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setResolving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !deleteReason.trim()) return;
    setDeleting(deleteTarget.id);
    try {
      const { error } = await supabase.from("reports").delete().eq("id", deleteTarget.id).eq("user_id", user!.id);
      if (error) throw error;
      
      setReports((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      track("report_deleted", {
        report_id: deleteTarget.id,
        category: deleteTarget.report_category,
        service: deleteTarget.service_type,
        commune: deleteTarget.commune,
        reason_chip: deleteChip,
      });
      toast.success("Signalement supprimé");
      setDeleteTarget(null);
      setDeleteReason("");
      setDeleteChip("");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-6xl py-8">
        {/* Corroboration from notification */}
        {reportIdFromNotif && notifType !== "confirmation" ? (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
              {notifReportType?.reportCategory === "infrastructure" ? (
                <>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10">
                    <Wrench className="h-8 w-8 text-success" />
                  </div>
                  <h1 className="font-display text-2xl font-bold text-foreground">Un problème dans votre quartier</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Vos voisins signalent un problème d'infrastructure — soutenez leur demande de réparation
                  </p>
                </>
              ) : notifReportType?.serviceType === "electricity" ? (
                <>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-electricity/10">
                    <Zap className="h-8 w-8 text-electricity" />
                  </div>
                  <h1 className="font-display text-2xl font-bold text-foreground">L'électricité est coupée</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Vos voisins ont signalé une coupure CIE — confirmez si vous êtes aussi concerné(e)
                  </p>
                </>
              ) : notifReportType?.serviceType === "water" ? (
                <>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-water/10">
                    <Droplets className="h-8 w-8 text-water" />
                  </div>
                  <h1 className="font-display text-2xl font-bold text-foreground">L'eau est coupée</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Vos voisins ont signalé une coupure SODECI — confirmez si vous êtes aussi concerné(e)
                  </p>
                </>
              ) : (
                <>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-urgent/10">
                    <AlertTriangle className="h-8 w-8 text-urgent" />
                  </div>
                  <h1 className="font-display text-2xl font-bold text-foreground">Un problème dans votre quartier</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Vos voisins ont fait un signalement — confirmez si vous êtes concerné(e)
                  </p>
                </>
              )}
            </motion.div>
            <NeighborCorroboration
              reportId={reportIdFromNotif}
              onDone={() => setSearchParams({})}
              onReportLoaded={(serviceType, reportCategory) =>
                setNotifReportType({ serviceType, reportCategory })
              }
            />
          </>
        ) : reportIdFromNotif && notifType === "confirmation" ? (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10">
                <ThumbsUp className="h-8 w-8 text-success" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground">Confirmation reçue !</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {notifReportType?.reportCategory === "infrastructure"
                  ? "Un citoyen a soutenu votre signalement"
                  : "Un voisin a confirmé votre signalement de coupure"}
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card p-6 shadow-card text-center space-y-4"
            >
              <div className="rounded-xl bg-success/10 p-5">
                <CheckCircle2 className="mx-auto h-10 w-10 text-success mb-2" />
                <p className="font-bold text-foreground">Votre signalement gagne en visibilité</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {notifReportType?.reportCategory === "infrastructure"
                    ? "Chaque soutien renforce votre demande de réparation auprès de la Mairie."
                    : "Chaque confirmation renforce la crédibilité de votre signalement dans nos rapports aux opérateurs."}
                </p>
              </div>
              <Button variant="outline" onClick={() => setSearchParams({})}>
                Voir mes signalements actifs
              </Button>
            </motion.div>
          </>
        ) : (
          <>
            {/* Sélecteur d'onglets principal : Mode Triage Éclair vs Mes Alertes */}
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center p-1.5 rounded-2xl bg-muted/80 border border-border shadow-xs max-w-md w-full">
                <button
                  type="button"
                  onClick={() => setActiveTab("triage")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all",
                    activeTab === "triage"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span>Mode Triage Éclair</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-300">
                    Pro
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("mes_alertes")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all",
                    activeTab === "mes_alertes"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Mes Alertes {reports.length > 0 ? `(${reports.length})` : ""}</span>
                </button>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                MODE TRIAGE ÉCLAIR (VÉRIFICATEURS & MODÉRATEURS)
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "triage" && (
              <div className="space-y-6 max-w-2xl mx-auto">
                {/* En-tête Triage avec Compteur de Gamification */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
                  <div>
                    <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                      <span>⚡ Mode Triage Éclair</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold">
                        Terrain & Modération
                      </span>
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Raccourcis clavier : <strong>[ → ]</strong> Valider · <strong>[ ← ]</strong> Passer · <strong>[ D ]</strong> Doublon
                    </p>
                  </div>

                  {/* Badge Gamification Session */}
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs font-bold shrink-0 shadow-2xs">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>🎯 {sessionVerifiedCount} certifiés cette session</span>
                  </div>
                </div>

                {/* Filtre par commune */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none text-xs">
                  <span className="text-[11px] font-semibold text-muted-foreground shrink-0 mr-1">Zone :</span>
                  <button
                    type="button"
                    onClick={() => setTriageCommuneFilter("all")}
                    className={cn(
                      "px-3 py-1.5 rounded-xl font-bold shrink-0 transition-all",
                      triageCommuneFilter === "all"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted/70 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    Tout Abidjan
                  </button>
                  {COMMUNES.map((c) => (
                    <button
                      key={c.nom}
                      type="button"
                      onClick={() => setTriageCommuneFilter(c.nom)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-xl font-semibold shrink-0 transition-all flex items-center gap-1.5",
                        triageCommuneFilter === c.nom
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-muted/70 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.couleur }} />
                      <span>{c.nom}</span>
                    </button>
                  ))}
                </div>

                {/* Contenu principal du triage */}
                {triageLoading ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-20 rounded-3xl border border-dashed border-border bg-card/50">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-semibold text-muted-foreground">Recherche des signalements à certifier…</p>
                  </div>
                ) : triageReports.length === 0 || triageIndex >= triageReports.length ? (
                  /* Fin de la file / Rien à trier */
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-3xl border-2 border-emerald-500/20 bg-emerald-500/5 p-8 text-center space-y-4 shadow-sm"
                  >
                    <div className="flex justify-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                        <PartyPopper className="h-8 w-8" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-foreground">File de triage terminée !</h2>
                      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                        Tous les signalements pour cette zone ont été vérifiés. Merci pour votre engagement civique !
                      </p>
                    </div>
                    <div className="inline-block px-4 py-2 rounded-xl bg-card border border-border text-xs font-bold text-foreground">
                      🎉 {sessionVerifiedCount} signalement{sessionVerifiedCount > 1 ? "s" : ""} certifié{sessionVerifiedCount > 1 ? "s" : ""} dans cette session
                    </div>
                    <div className="pt-2">
                      <Button
                        type="button"
                        onClick={fetchTriageReports}
                        className="font-bold bg-primary text-primary-foreground rounded-xl px-6 py-2.5"
                      >
                        Recharger la file ↺
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  /* Carte de modération en cours */
                  (() => {
                    const cur = triageReports[triageIndex];
                    const color = COMMUNE_COLORS[cur.commune] || "#10B981";
                    const isElec = cur.service_type === "electricity";
                    const isInfra = cur.report_category === "infrastructure";
                    const hasPhoto = cur.photo_urls && cur.photo_urls.length > 0;
                    const primaryPhoto = hasPhoto ? cur.photo_urls![0] : null;

                    return (
                      <motion.div
                        key={cur.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ duration: 0.2 }}
                        className="rounded-3xl border-2 border-border bg-card overflow-hidden shadow-md"
                      >
                        {/* Barre d'en-tête de la carte */}
                        <div
                          className="flex items-center justify-between px-4 py-3 text-white"
                          style={{ backgroundColor: color }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/20">
                              {isInfra ? <Wrench className="h-4 w-4" /> : isElec ? <Zap className="h-4 w-4" /> : <Droplets className="h-4 w-4" />}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-black uppercase tracking-wider">
                                {isInfra ? "Voirie / Mairie" : isElec ? "CIE · Électricité" : "SODECI · Eau Potable"}
                              </p>
                              <p className="text-sm font-bold truncate">{cur.commune}</p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-black/20 font-medium">
                              {triageIndex + 1} / {triageReports.length}
                            </span>
                            <p className="text-[10px] text-white/80 mt-0.5">{getTimeAgo(cur.created_at)}</p>
                          </div>
                        </div>

                        {/* Photo tactile avec bouton loupe */}
                        {hasPhoto ? (
                          <div
                            onClick={() => setZoomPhotoUrl(primaryPhoto)}
                            className="relative group cursor-zoom-in bg-muted/30 overflow-hidden max-h-72 flex items-center justify-center"
                          >
                            <img
                              src={primaryPhoto!}
                              alt="Preuve terrain"
                              className="w-full h-72 object-cover transition-transform duration-200 group-hover:scale-102"
                            />
                            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 text-white text-xs font-bold backdrop-blur-xs shadow-md">
                              <ZoomIn className="h-3.5 w-3.5" />
                              <span>Agrandir HD</span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-6 text-center bg-muted/10 border-b border-border/50">
                            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                              <span>📷</span> Déclaration citoyenne sans photo
                            </p>
                          </div>
                        )}

                        {/* Détails du signalement */}
                        <div className="p-5 space-y-4">
                          {/* Emplacement & PADA */}
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span>{cur.commune}, quartier {cur.quartier}</span>
                            </div>
                            {cur.street_name && (
                              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold mt-1 pl-5">
                                🏠 Voie PADA : {cur.street_name} {cur.door_number ? `· Porte n° ${cur.door_number}` : ""}
                              </p>
                            )}
                          </div>

                          {/* Description */}
                          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60">
                            <p className="text-xs text-muted-foreground font-semibold mb-1">Description citoyenne :</p>
                            <p className="text-sm text-foreground font-medium italic">"{cur.description}"</p>
                          </div>

                          {/* Preuve de réparation citoyenne transmise */}
                          {cur.repair_status === "pending_review" && (
                            <div className="p-3.5 rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Camera className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                                    Preuve de réparation citoyenne transmise
                                  </span>
                                </div>
                                <span className="text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold px-1.5 py-0.5 rounded">
                                  À valider
                                </span>
                              </div>
                              {cur.repair_note && (
                                <p className="text-xs italic text-amber-900 dark:text-amber-200 bg-background/50 p-2 rounded-lg border border-amber-500/20">
                                  « {cur.repair_note} »
                                </p>
                              )}
                              {cur.repair_photos && cur.repair_photos.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto pt-1">
                                  {cur.repair_photos.map((p, idx) => (
                                    <img
                                      key={idx}
                                      src={p}
                                      alt="Preuve après réparation"
                                      onClick={() => setZoomPhotoUrl(p)}
                                      className="h-16 w-16 object-cover rounded-xl border border-amber-500/30 cursor-pointer hover:opacity-90"
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Statut corroborations & urgence */}
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                            <CorroborationStatus verifications={cur.verifications} reportCategory={cur.report_category} compact />
                            {cur.urgency === "critical" && (
                              <span className="px-2 py-0.5 rounded-md bg-destructive/15 text-destructive font-black text-[10px]">
                                🔥 URGENCE ÉLEVÉE
                              </span>
                            )}
                          </div>

                          {/* ── Boutons d'Action Tactiles Géants ── */}
                          <div className="grid grid-cols-3 gap-2.5 pt-2">
                            {/* Passer / Flou */}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleSkipCurrent}
                              disabled={actionLoading}
                              className="py-6 flex flex-col items-center justify-center gap-1 rounded-2xl border-2 hover:bg-muted text-muted-foreground hover:text-foreground"
                            >
                              <ArrowLeft className="h-5 w-5" />
                              <span className="text-xs font-bold">Passer [←]</span>
                            </Button>

                            {/* Doublon */}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleDuplicateCurrent}
                              disabled={actionLoading}
                              className="py-6 flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15"
                            >
                              <Copy className="h-5 w-5" />
                              <span className="text-xs font-bold">Doublon [D]</span>
                            </Button>

                            {/* Valider & Certifier */}
                            <Button
                              type="button"
                              onClick={handleValidateCurrent}
                              disabled={actionLoading}
                              className="py-6 flex flex-col items-center justify-center gap-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md"
                            >
                              {actionLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <Check className="h-5 w-5" />
                              )}
                              <span className="text-xs font-bold">Valider [→]</span>
                            </Button>
                          </div>

                          {/* Astuce Raccourcis Clavier sur Desktop */}
                          <p className="text-[11px] text-center text-muted-foreground hidden sm:block">
                            💡 Raccourcis clavier : <strong>Flèche droite [→]</strong> pour valider · <strong>Flèche gauche [←]</strong> pour passer · <strong>Touche [D]</strong> pour doublon
                          </p>
                        </div>
                      </motion.div>
                    );
                  })()
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                ONGLET : MES ALERTES ACTIVES
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "mes_alertes" && (
              <>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                  </div>
                  <h1 className="font-display text-2xl font-bold text-foreground">Mes alertes actives</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Informez vos voisins dès que la situation change
                  </p>
                </motion.div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Chargement…</p>
          </div>
        ) : reports.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-border bg-card px-6 py-14 text-center shadow-card"
          >
            <NoActiveReportsSVG />
            <p className="font-display text-lg font-bold text-foreground">Tout va bien pour l'instant</p>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
              Aucune alerte active. Vous serez notifié dès qu'un voisin signale un problème dans votre quartier.
            </p>
          </motion.div>
        ) : (
          <AnimatePresence>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
              {reports.map((r, i) => {
                const color = COMMUNE_COLORS[r.commune] || "#6B7280";
                const isElec = r.service_type === "electricity";
                const isInfra = r.report_category === "infrastructure";
                const isResolved = justResolved === r.id;
                const timeAgo = getTimeAgo(r.created_at);

                const serviceIcon = isInfra
                  ? <Wrench className="h-4 w-4" />
                  : isElec ? <Zap className="h-4 w-4" /> : <Droplets className="h-4 w-4" />;
                const serviceLabel = isInfra
                  ? "Infrastructure"
                  : isElec ? "Électricité" : "Eau";

                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{
                      opacity: isResolved ? 0.5 : 1,
                      y: 0,
                      scale: isResolved ? 0.95 : 1,
                    }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
                  >
                    {/* Header band */}
                    <div
                      className="flex items-center justify-between px-4 py-2.5"
                      style={{ backgroundColor: color }}
                    >
                      <div className="flex items-center gap-2 text-white">
                        {serviceIcon}
                        <span className="text-sm font-bold">
                          {serviceLabel} — {r.commune}
                        </span>
                      </div>
                      <span className="text-xs text-white/70">{timeAgo}</span>
                    </div>

                    {isResolved ? (
                      <div className="flex items-center justify-center gap-2 p-6">
                        <PartyPopper className="h-6 w-6 text-success" />
                        <span className="font-bold text-success">
                          {RESOLUTION[isInfra ? "infrastructure" : "outage"].cardResolved}
                        </span>
                      </div>
                    ) : (
                      <div className="p-4">
                        <p className="text-sm text-muted-foreground mb-2">{r.description}</p>
                        {r.quartier && (
                          <p className="text-xs text-muted-foreground mb-3">📍 {r.quartier}</p>
                        )}

                        {/* Corroboration status */}
                        <div className="mb-4">
                          <CorroborationStatus verifications={r.verifications} reportCategory={r.report_category} />
                        </div>

                        {r.urgency === "critical" && (
                          <div className="flex items-center gap-1.5 text-xs text-destructive font-semibold animate-pulse mb-3">
                            🔥 Signalement critique — escalade automatique
                          </div>
                        )}

                        {/* CTA — résolution primaire, confirmation secondaire */}
                        <div className="space-y-2">
                          <Button
                            onClick={() => openResolveDialog(r)}
                            className="w-full py-5 text-base bg-success text-success-foreground hover:bg-success/90 font-bold shadow-sm"
                          >
                            <Power className="mr-2 h-5 w-5" />
                            {RESOLUTION[isInfra ? "infrastructure" : "outage"].resolvedCta}
                          </Button>
                          <Button
                            onClick={() => handleConfirmStillOngoing(r)}
                            disabled={confirming === r.id}
                            variant="outline"
                            size="sm"
                            className="w-full border-urgent/40 text-urgent hover:bg-urgent/8 hover:border-urgent font-medium text-sm"
                          >
                            {confirming === r.id ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            {RESOLUTION[isInfra ? "infrastructure" : "outage"].ongoingCta}
                          </Button>
                        </div>
                        
                        <div className="mt-4 flex justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeleteTarget(r)}
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            Supprimer ce signalement
                          </Button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}

        {/* Resolve dialog */}
        <Dialog open={!!resolveTarget} onOpenChange={(open) => !open && setResolveTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                {resolveTarget?.report_category === "infrastructure"
                  ? RESOLUTION.infrastructure.dialogTitle
                  : RESOLUTION.outage.dialogTitle}
              </DialogTitle>
            </DialogHeader>
            {resolveTarget && (() => {
              const isInfra = resolveTarget.report_category === "infrastructure";
              const isElec = resolveTarget.service_type === "electricity";
              const emoji = isInfra ? "🏗️" : isElec ? "⚡" : "💧";
              const label = isInfra
                ? "Le problème a été réparé à"
                : isElec
                  ? "L'électricité est de retour à"
                  : "L'eau est de retour à";
              return (
                <div className="space-y-5">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="rounded-xl bg-success/10 p-4 text-center"
                  >
                    <div className="text-3xl mb-2">{emoji}</div>
                    <p className="text-sm font-semibold text-foreground">
                      {label}{" "}
                      <span className="font-bold" style={{ color: COMMUNE_COLORS[resolveTarget.commune] }}>
                        {resolveTarget.commune}
                      </span>
                    </p>
                  </motion.div>

                  {!isInfra && (
                    <div className="space-y-2">
                      <label htmlFor="resolve-time" className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        À quelle heure c'est revenu ?
                      </label>
                      <Input
                        id="resolve-time"
                        type="datetime-local"
                        value={resolveTime}
                        onChange={(e) => setResolveTime(e.target.value)}
                        className="text-base"
                      />
                    </div>
                  )}

                  {/* Qualification de la résolution pour les rapports aux opérateurs et mairies */}
                  <div className="space-y-2 text-left pt-1">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Origine de la résolution (Rapports statistiques)
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setResolvedWithTransfer(true)}
                        className={cn(
                          "p-2.5 rounded-xl border text-xs text-left transition-all",
                          resolvedWithTransfer
                            ? "border-emerald-500 bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 font-bold ring-2 ring-emerald-500/30"
                            : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <p className="flex items-center gap-1 font-bold">✅ Avec transfert</p>
                        <p className="text-[10px] font-normal opacity-80 mt-0.5 leading-tight">Transmis aux services partenaires SIGNA</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setResolvedWithTransfer(false)}
                        className={cn(
                          "p-2.5 rounded-xl border text-xs text-left transition-all",
                          !resolvedWithTransfer
                            ? "border-blue-500 bg-blue-500/15 text-blue-900 dark:text-blue-200 font-bold ring-2 ring-blue-500/30"
                            : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <p className="flex items-center gap-1 font-bold">ℹ️ Sans transfert</p>
                        <p className="text-[10px] font-normal opacity-80 mt-0.5 leading-tight">Constat terrain / Maintenance spontanée</p>
                      </button>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-success text-success-foreground hover:bg-success/90 py-6 text-base font-bold"
                    onClick={handleResolve}
                    disabled={resolving || (!isInfra && !resolveTime)}
                  >
                    {resolving ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Envoi…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        {isInfra ? "Confirmer la résolution" : "Confirmer le rétablissement"}
                      </>
                    )}
                  </Button>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Delete confirmation dialog */}
        <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteReason(""); setDeleteChip(""); } }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Supprimer ce signalement ?
              </DialogTitle>
              <DialogDescription>
                Cette action est irréversible. Le signalement sera définitivement supprimé.
              </DialogDescription>
            </DialogHeader>

            {deleteTarget && (
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <span>{
                    deleteTarget.report_category === "infrastructure"
                      ? "🏗️"
                      : deleteTarget.service_type === "electricity"
                        ? "⚡"
                        : "💧"
                  }</span>
                  <span className="font-medium">{deleteTarget.commune}</span>
                  {deleteTarget.quartier && <span className="text-muted-foreground">· {deleteTarget.quartier}</span>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{deleteTarget.description}</p>
              </div>
            )}

            <div className="space-y-3">
              <Label>Pourquoi supprimez-vous ce signalement ?</Label>
              <div className="flex flex-wrap gap-2">
                {(["Doublon", "Erreur de localisation", "Problème résolu", "Autre"] as const).map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setDeleteChip(chip);
                      if (chip !== "Autre") setDeleteReason(chip);
                      else setDeleteReason("");
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      deleteChip === chip
                        ? "border-destructive bg-destructive/10 text-destructive"
                        : "border-border bg-background text-muted-foreground hover:border-border hover:bg-muted/60",
                    )}
                  >
                    {chip}
                  </button>
                ))}
              </div>
              {deleteChip === "Autre" && (
                <Textarea
                  id="delete-reason"
                  placeholder="Précisez la raison..."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="min-h-[72px] resize-none"
                  maxLength={300}
                  autoFocus
                />
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setDeleteTarget(null); setDeleteReason(""); setDeleteChip(""); }}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDelete}
                disabled={!deleteReason.trim() || !!deleting}
              >
                {deleting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Suppression...</>
                ) : "Confirmer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )}

            {/* Modal de Zoom Photo HD */}
            <Dialog open={Boolean(zoomPhotoUrl)} onOpenChange={(open) => !open && setZoomPhotoUrl(null)}>
              <DialogContent className="max-w-3xl p-3 bg-black/95 border-border/20 text-white">
                <DialogHeader className="sr-only">
                  <DialogTitle>Photo du signalement agrandie</DialogTitle>
                </DialogHeader>
                <div className="relative flex items-center justify-center min-h-[300px] max-h-[80vh] overflow-hidden rounded-2xl">
                  {zoomPhotoUrl && (
                    <img
                      src={zoomPhotoUrl}
                      alt="Agrandissement HD"
                      className="max-h-[75vh] w-auto object-contain rounded-xl"
                    />
                  )}
                </div>
                <div className="pt-2 flex justify-between items-center text-xs text-white/70">
                  <span>Preuve photo capturée sur le terrain</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoomPhotoUrl(null)}
                    className="text-xs text-white border-white/20 hover:bg-white/10"
                  >
                    Fermer [Échap]
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </main>
    </div>
  );
};

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

export default VerificationPage;
