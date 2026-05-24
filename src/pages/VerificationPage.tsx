import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Clock, Power, Zap, Droplets, Loader2, PartyPopper, AlertTriangle, ThumbsUp, Trash2, Wrench } from "lucide-react";
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
import { COMMUNE_COLORS } from "@/lib/communes";
import { toast } from "sonner";

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

  // Confirm still ongoing
  const [confirming, setConfirming] = useState<string | null>(null);

  // Delete report
  const [deleteTarget, setDeleteTarget] = useState<MyReport | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchMyActiveReports = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("reports")
      .select("id, service_type, report_category, description, commune, quartier, status, urgency, created_at, start_time, verifications, last_reminder_at")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (!error && data) setReports(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchMyActiveReports();
  }, [user]);

  const handleConfirmStillOngoing = async (report: MyReport) => {
    setConfirming(report.id);
    try {
      const { data: currentReport, error: fetchErr } = await supabase
        .from("reports")
        .select("reminder_count, last_reminder_at")
        .eq("id", report.id)
        .single();

      if (fetchErr) throw fetchErr;

      if (currentReport?.last_reminder_at) {
        const elapsed = Date.now() - new Date(currentReport.last_reminder_at).getTime();
        if (elapsed < 3_600_000) {
          const minsLeft = Math.ceil((3_600_000 - elapsed) / 60_000);
          toast.error(`Veuillez patienter encore ${minsLeft} minute(s) avant de relancer.`);
          return;
        }
      }

      const newReminderAt = new Date().toISOString();
      const { error } = await supabase
        .from("reports")
        .update({
          reminder_count: (currentReport?.reminder_count || 0) + 1,
          last_reminder_at: newReminderAt,
        })
        .eq("id", report.id);

      if (error) throw error;

      setReports(prev => prev.map(r =>
        r.id === report.id ? { ...r, last_reminder_at: newReminderAt } : r
      ));
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
    setResolveTime(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`);
    setResolveTarget(report);
  };

  const handleResolve = async () => {
    if (!resolveTarget) return;
    const isInfra = resolveTarget.report_category === "infrastructure";
    if (!isInfra && !resolveTime) return;
    setResolving(true);
    try {
      const resolvedAt = isInfra ? new Date().toISOString() : new Date(resolveTime).toISOString();
      const { error } = await supabase.rpc("resolve_report", {
        p_report_id: resolveTarget.id,
        p_resolved_at: resolvedAt,
      });
      if (error) throw error;
      const resolvedId = resolveTarget.id;
      const successMsg = isInfra
        ? "🎉 Problème résolu ! Merci pour le suivi."
        : resolveTarget.service_type === "electricity"
          ? "🎉 L'électricité est de retour ! Merci."
          : "🎉 L'eau est de retour ! Merci.";
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
      const { error: logError } = await supabase.from("report_deletions").insert({
        report_id: deleteTarget.id,
        user_id: user!.id,
        reason: deleteReason.trim(),
        service_type: deleteTarget.service_type,
        commune: deleteTarget.commune,
        quartier: deleteTarget.quartier,
        description: deleteTarget.description,
      });
      if (logError) throw logError;

      const { error } = await supabase.from("reports").delete().eq("id", deleteTarget.id).eq("user_id", user!.id);
      if (error) throw error;
      
      setReports((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      toast.success("Signalement supprimé");
      setDeleteTarget(null);
      setDeleteReason("");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-lg py-8">
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
            <div className="space-y-4">
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
                          {isInfra ? "Problème résolu !" : "Service rétabli !"}
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
                            {isInfra ? "Problème résolu !" : "Tout va bien !"}
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
                            {isInfra ? "Non, le problème persiste" : "Toujours coupé chez moi"}
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
                  ? "Problème résolu"
                  : "Service rétabli"}
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
        <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteReason(""); } }}>
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

            <div className="space-y-2">
              <Label htmlFor="delete-reason">Pourquoi supprimez-vous ce signalement ?</Label>
              <Textarea
                id="delete-reason"
                placeholder="Ex : signalement en double, erreur de saisie..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="min-h-[80px] resize-none"
                maxLength={300}
              />
              <p className="text-xs text-muted-foreground text-right">{deleteReason.length}/300</p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setDeleteTarget(null); setDeleteReason(""); }}
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
