import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Clock, Power, Zap, Droplets, Loader2, PartyPopper, AlertTriangle, ThumbsUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Header from "@/components/Header";
import NeighborCorroboration from "@/components/NeighborCorroboration";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { COMMUNE_COLORS } from "@/lib/communes";
import { toast } from "sonner";

interface MyReport {
  id: string;
  service_type: string;
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

const VerificationPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const reportIdFromNotif = searchParams.get("report");
  const notifType = searchParams.get("type"); // "confirmation" or null
  const [reports, setReports] = useState<MyReport[]>([]);
  const [loading, setLoading] = useState(true);

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
      .select("id, service_type, description, commune, quartier, status, urgency, created_at, start_time, verifications, last_reminder_at")
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
    // Check rate limit: max 1 per hour
    if (report.last_reminder_at) {
      const lastReminder = new Date(report.last_reminder_at).getTime();
      const now = Date.now();
      const hoursSinceLast = (now - lastReminder) / (1000 * 60 * 60);
      if (hoursSinceLast < 1) {
        const minsLeft = Math.ceil((1 - hoursSinceLast) * 60);
        toast.error(`Veuillez patienter encore ${minsLeft} minute(s) avant de relancer.`);
        return;
      }
    }

    setConfirming(report.id);
    try {
      const { data: currentReport, error: fetchErr } = await supabase
        .from("reports")
        .select("reminder_count")
        .eq("id", report.id)
        .single();
        
      if (fetchErr) throw fetchErr;

      const newReminderAt = new Date().toISOString();

      const { error } = await supabase
        .from("reports")
        .update({ 
          reminder_count: (currentReport?.reminder_count || 0) + 1,
          last_reminder_at: newReminderAt
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
    if (!resolveTarget || !resolveTime) return;
    setResolving(true);
    try {
      const resolvedAt = new Date(resolveTime).toISOString();
      const { error } = await supabase.rpc("resolve_report", {
        p_report_id: resolveTarget.id,
        p_resolved_at: resolvedAt,
      });
      if (error) throw error;
      const resolvedId = resolveTarget.id;
      const serviceLabel = resolveTarget.service_type === "electricity" ? "L'électricité" : "L'eau";
      setJustResolved(resolvedId);
      setResolveTarget(null);
      toast.success(`🎉 ${serviceLabel} est de retour ! Merci.`);
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

      const { error } = await supabase.from("reports").delete().eq("id", deleteTarget.id);
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
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-urgent/10">
                <AlertTriangle className="h-8 w-8 text-urgent" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground">Confirmer une coupure</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Un voisin a signalé une coupure dans votre quartier
              </p>
            </motion.div>
            <NeighborCorroboration
              reportId={reportIdFromNotif}
              onDone={() => setSearchParams({})}
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
                Un voisin a confirmé votre signalement de coupure
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
                  Plus de voisins confirment, plus le signalement est prioritaire.
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
              <h1 className="font-display text-2xl font-bold text-foreground">Mes signalements actifs</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Confirmez le retour du service ou signalez que la coupure est toujours en cours
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
            className="rounded-2xl border border-border bg-card py-16 text-center shadow-card"
          >
            <ThumbsUp className="mx-auto h-12 w-12 text-success mb-4" />
            <p className="font-display text-lg font-bold text-foreground">Aucun signalement actif</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Vous n'avez pas de coupure en cours à vérifier.
            </p>
          </motion.div>
        ) : (
          <AnimatePresence>
            <div className="space-y-4">
              {reports.map((r, i) => {
                const color = COMMUNE_COLORS[r.commune] || "#6B7280";
                const isElec = r.service_type === "electricity";
                const isResolved = justResolved === r.id;
                const timeAgo = getTimeAgo(r.created_at);

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
                        {isElec ? <Zap className="h-4 w-4" /> : <Droplets className="h-4 w-4" />}
                        <span className="text-sm font-bold">
                          {isElec ? "Électricité" : "Eau"} — {r.commune}
                        </span>
                      </div>
                      <span className="text-xs text-white/70">{timeAgo}</span>
                    </div>

                    {isResolved ? (
                      <div className="flex items-center justify-center gap-2 p-6">
                        <PartyPopper className="h-6 w-6 text-success" />
                        <span className="font-bold text-success">Service rétabli !</span>
                      </div>
                    ) : (
                      <div className="p-4">
                        <p className="text-sm text-muted-foreground mb-2">{r.description}</p>
                        {r.quartier && (
                          <p className="text-xs text-muted-foreground mb-3">📍 {r.quartier}</p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                          {r.urgency === "critical" && (
                            <span className="flex items-center gap-1 text-destructive font-semibold animate-pulse">
                              🔥 Critique
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {r.verifications} confirmation{r.verifications !== 1 ? "s" : ""}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            Signalé {timeAgo}
                          </span>
                        </div>

                        {/* Two clear action buttons */}
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            onClick={() => handleConfirmStillOngoing(r)}
                            disabled={confirming === r.id}
                            variant="outline"
                            className="border-urgent text-urgent hover:bg-urgent hover:text-urgent-foreground font-semibold"
                          >
                            {confirming === r.id ? (
                              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                            ) : (
                              <AlertTriangle className="mr-1.5 h-4 w-4" />
                            )}
                            Toujours coupé
                          </Button>
                          <Button
                            onClick={() => openResolveDialog(r)}
                            className="bg-success text-success-foreground hover:bg-success/90 font-semibold"
                          >
                            <Power className="mr-1.5 h-4 w-4" />
                            Tout va bien
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
                <Power className="h-5 w-5" />
                Service rétabli
              </DialogTitle>
            </DialogHeader>
            {resolveTarget && (
              <div className="space-y-5">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="rounded-xl bg-success/10 p-4 text-center"
                >
                  <div className="text-3xl mb-2">
                    {resolveTarget.service_type === "electricity" ? "⚡" : "💧"}
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {resolveTarget.service_type === "electricity" ? "L'électricité" : "L'eau"} est de retour à{" "}
                    <span className="font-bold" style={{ color: COMMUNE_COLORS[resolveTarget.commune] }}>
                      {resolveTarget.commune}
                    </span>
                  </p>
                </motion.div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    À quelle heure c'est revenu ?
                  </label>
                  <Input
                    type="datetime-local"
                    value={resolveTime}
                    onChange={(e) => setResolveTime(e.target.value)}
                    className="text-base"
                  />
                </div>

                <Button
                  className="w-full bg-success text-success-foreground hover:bg-success/90 py-6 text-base font-bold"
                  onClick={handleResolve}
                  disabled={resolving || !resolveTime}
                >
                  {resolving ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Envoi…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Confirmer le rétablissement
                    </>
                  )}
                </Button>
              </div>
            )}
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
