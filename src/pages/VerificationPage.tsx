import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, CheckCircle2, Users, Clock, Power, Zap, Droplets, Loader2, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { findNearestCommune, COMMUNE_COLORS } from "@/lib/communes";
import { toast } from "sonner";

interface NearbyReport {
  id: string;
  service_type: string;
  description: string;
  commune: string;
  distance_m: number;
  nb_verifications: number;
  created_at: string;
}

const VerificationPage = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<NearbyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [detectedCommune, setDetectedCommune] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  // Resolve state
  const [resolveTarget, setResolveTarget] = useState<NearbyReport | null>(null);
  const [resolveTime, setResolveTime] = useState("");
  const [resolving, setResolving] = useState(false);
  const [justResolved, setJustResolved] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lon);
        const result = findNearestCommune(lat, lon);
        if (result.commune && result.isInPilotZone) setDetectedCommune(result.commune.nom);

        const { data, error } = await supabase.rpc("get_nearby_reports", {
          p_lat: lat,
          p_lon: lon,
          p_rayon_m: 200,
        });
        if (!error && data) {
          setReports(data as unknown as NearbyReport[]);
        }
        setLoading(false);
      },
      () => setLoading(false),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);

  const handleConfirm = async (reportId: string) => {
    setConfirming(reportId);
    try {
      const { error } = await supabase.rpc("corroborate_report", { p_report_id: reportId });
      if (error) throw error;
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, nb_verifications: r.nb_verifications + 1 } : r))
      );
      toast.success("Confirmation enregistrée !");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setConfirming(null);
    }
  };

  const openResolveDialog = (report: NearbyReport) => {
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
      const serviceLabel = resolveTarget.service_type === "electricity" ? "Électricité" : "Eau";
      setJustResolved(resolvedId);
      setResolveTarget(null);
      toast.success(`🎉 ${serviceLabel} rétablie ! Merci pour votre contribution.`);
      // Animate out after a moment
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

  const communeColor = detectedCommune ? COMMUNE_COLORS[detectedCommune] || "#6B7280" : "#6B7280";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-lg py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Vérification & Rétablissement</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Confirmez une coupure ou signalez le retour du service près de vous
          </p>
        </motion.div>

        {detectedCommune && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 flex items-center justify-center gap-2 rounded-xl p-3 text-sm font-bold text-white"
            style={{ backgroundColor: communeColor }}
          >
            <MapPin className="h-4 w-4" />
            {detectedCommune} — Signalements à proximité
          </motion.div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Recherche des signalements…</p>
          </div>
        ) : reports.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-success/20 bg-success/5 py-16 text-center"
          >
            <PartyPopper className="mx-auto h-12 w-12 text-success mb-4" />
            <p className="font-display text-lg font-bold text-foreground">Tout va bien !</p>
            <p className="mt-1 text-sm text-muted-foreground">Aucun signalement actif à proximité (&lt;200m)</p>
            {latitude && longitude && (
              <p className="mt-3 text-xs text-muted-foreground">
                📍 {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </p>
            )}
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
                      <span className="text-xs text-white/70">{Math.round(r.distance_m)}m</span>
                    </div>

                    {isResolved ? (
                      <div className="flex items-center justify-center gap-2 p-6">
                        <PartyPopper className="h-6 w-6 text-success" />
                        <span className="font-bold text-success">Service rétabli !</span>
                      </div>
                    ) : (
                      <div className="p-4">
                        <p className="text-sm text-muted-foreground mb-3">{r.description}</p>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {r.nb_verifications} confirmation{r.nb_verifications !== 1 ? "s" : ""}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {timeAgo}
                          </span>
                        </div>

                        {/* Two clear action buttons */}
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleConfirm(r.id)}
                            disabled={confirming === r.id}
                            className="text-xs font-semibold"
                            style={{ backgroundColor: color, color: "white" }}
                          >
                            {confirming === r.id ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Users className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Toujours coupé
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => openResolveDialog(r)}
                            className="text-xs font-semibold bg-success text-success-foreground hover:bg-success/90"
                          >
                            <Power className="mr-1.5 h-3.5 w-3.5" />
                            C'est revenu !
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

        {/* Resolve dialog — simple and focused */}
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
      </main>
    </div>
  );
};

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

export default VerificationPage;
