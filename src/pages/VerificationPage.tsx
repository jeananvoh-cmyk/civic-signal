import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, CheckCircle2, Users, Clock, Power } from "lucide-react";
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

  // Resolve dialog state
  const [resolveTarget, setResolveTarget] = useState<NearbyReport | null>(null);
  const [resolveTime, setResolveTime] = useState("");
  const [resolving, setResolving] = useState(false);

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
        const nearest = findNearestCommune(lat, lon);
        if (nearest) setDetectedCommune(nearest.nom);

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
    // Pre-fill with current time
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
      setReports((prev) => prev.filter((r) => r.id !== resolveTarget.id));
      setResolveTarget(null);
      toast.success(`✅ ${resolveTarget.service_type === "electricity" ? "Électricité" : "Eau"} de retour ! Signalement résolu.`);
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
      <main className="container max-w-md py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Vérification communautaire</h1>
          <p className="mt-1 text-sm text-muted-foreground">Confirmez ou signalez le retour du service (&lt;200m)</p>
        </motion.div>

        {detectedCommune && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 rounded-xl p-4 text-center text-white font-bold"
            style={{ backgroundColor: communeColor }}
          >
            <MapPin className="inline h-5 w-5 mr-1" />
            {detectedCommune} détecté
          </motion.div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : reports.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-12 text-center"
          >
            <CheckCircle2 className="mx-auto h-12 w-12 text-success mb-3" />
            <p className="text-muted-foreground">Aucun signalement actif à proximité (&lt;200m)</p>
            <p className="text-xs text-muted-foreground mt-1">
              {latitude && longitude
                ? `Position : ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
                : "GPS non disponible"}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {reports.map((r, i) => {
              const color = COMMUNE_COLORS[r.commune] || "#6B7280";
              const emoji = r.service_type === "electricity" ? "⚡" : "💧";
              const serviceLabel = r.service_type === "electricity" ? "Électricité" : "Eau";
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-xl border border-border bg-card p-4 shadow-card"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{emoji}</span>
                      <span className="font-bold text-sm" style={{ color }}>{r.commune}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{Math.round(r.distance_m)}m</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{r.description}</p>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {r.nb_verifications} voisin{r.nb_verifications !== 1 ? "s" : ""} confirment
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleConfirm(r.id)}
                      disabled={confirming === r.id}
                      style={{ backgroundColor: color, color: "white" }}
                    >
                      {confirming === r.id ? "..." : "Confirmer coupure"}
                    </Button>
                  </div>
                  {/* Resolve button */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-success text-success hover:bg-success hover:text-success-foreground"
                    onClick={() => openResolveDialog(r)}
                  >
                    <Power className="mr-1.5 h-4 w-4" />
                    {serviceLabel} est de retour
                  </Button>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Resolve dialog */}
        <Dialog open={!!resolveTarget} onOpenChange={(open) => !open && setResolveTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                Confirmer le retour
              </DialogTitle>
            </DialogHeader>
            {resolveTarget && (
              <div className="space-y-4">
                <div className="rounded-lg bg-success/10 p-3 text-center">
                  <p className="text-sm font-medium text-success">
                    {resolveTarget.service_type === "electricity" ? "⚡ Électricité" : "💧 Eau"} est de retour à{" "}
                    <span className="font-bold">{resolveTarget.commune}</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Heure de retour du service
                  </label>
                  <Input
                    type="datetime-local"
                    value={resolveTime}
                    onChange={(e) => setResolveTime(e.target.value)}
                    className="text-base"
                  />
                </div>

                <Button
                  className="w-full bg-success text-success-foreground hover:bg-success/90"
                  onClick={handleResolve}
                  disabled={resolving || !resolveTime}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {resolving ? "Envoi..." : "Confirmer le retour"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default VerificationPage;
