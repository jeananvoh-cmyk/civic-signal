import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Droplets, CheckCircle2, Clock, Loader2, AlertTriangle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { COMMUNE_COLORS } from "@/lib/communes";
import { toast } from "sonner";

interface ReportToCorroborate {
  id: string;
  service_type: string;
  description: string;
  commune: string;
  quartier: string;
  verifications: number;
  created_at: string;
  start_time: string;
}

interface NeighborCorroborationProps {
  reportId: string;
  onDone: () => void;
}

const NeighborCorroboration = ({ reportId, onDone }: NeighborCorroborationProps) => {
  const { user } = useAuth();
  const [report, setReport] = useState<ReportToCorroborate | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      if (!user || !reportId) return;

      // Use get_public_reports or direct query — but since RLS restricts direct access,
      // we use the corroborate flow: just try to fetch basic info via RPC or a public function.
      // Actually, let's query via get_nearby_reports won't work without coords.
      // The corroborate_report RPC will validate access. Let's fetch minimal info from notifications context.
      // Best approach: create a simple select that the RPC will validate anyway.
      
      // We can't directly SELECT other users' reports due to RLS.
      // Let's fetch from the notification itself to get context, then just show the corroborate button.
      const { data: notifData } = await supabase
        .from("notifications")
        .select("report_id, message, title")
        .eq("user_id", user.id)
        .eq("report_id", reportId)
        .limit(1)
        .single();

      if (!notifData) {
        setError("Signalement introuvable ou vous n'êtes pas autorisé.");
        setLoading(false);
        return;
      }

      // Parse info from notification message
      const isElec = notifData.message.includes("Électricité");
      const parts = notifData.message.replace("⚡ ", "").replace("💧 ", "").split(" — ");
      const serviceLabel = isElec ? "electricity" : "water";
      const locationParts = parts[1]?.split(", ") || ["", ""];

      // Check if already corroborated
      const { data: existing } = await supabase
        .from("corroborations")
        .select("id")
        .eq("report_id", reportId)
        .eq("user_id", user.id)
        .limit(1);

      if (existing && existing.length > 0) {
        setConfirmed(true);
      }

      setReport({
        id: reportId,
        service_type: serviceLabel,
        description: notifData.message,
        commune: locationParts[0] || "",
        quartier: locationParts[1] || "",
        verifications: 0,
        created_at: "",
        start_time: "",
      });
      setLoading(false);
    };

    fetchReport();
  }, [user, reportId]);

  const handleCorroborate = async () => {
    if (!user || !reportId) return;
    setConfirming(true);
    try {
      const { error } = await supabase.rpc("corroborate_report", { p_report_id: reportId });
      if (error) throw error;
      setConfirmed(true);
      toast.success("✅ Merci ! Votre confirmation a été enregistrée.");
    } catch (err: any) {
      const msg = err.message || "Erreur";
      if (msg.includes("déjà confirmé")) {
        setConfirmed(true);
        toast.info("Vous avez déjà confirmé ce signalement.");
      } else {
        toast.error(msg);
      }
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-8 shadow-card text-center"
      >
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Chargement du signalement…</p>
      </motion.div>
    );
  }

  if (error || !report) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-8 shadow-card text-center"
      >
        <AlertTriangle className="mx-auto h-8 w-8 text-urgent mb-3" />
        <p className="text-sm text-muted-foreground">{error || "Signalement introuvable."}</p>
        <Button variant="outline" className="mt-4" onClick={onDone}>
          Retour
        </Button>
      </motion.div>
    );
  }

  const isElec = report.service_type === "electricity";
  const color = COMMUNE_COLORS[report.commune] || "#6B7280";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card shadow-card overflow-hidden"
    >
      {/* Header band */}
      <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: color }}>
        <div className="flex items-center gap-2 text-white">
          {isElec ? <Zap className="h-5 w-5" /> : <Droplets className="h-5 w-5" />}
          <span className="text-sm font-bold">
            Coupure {isElec ? "d'Électricité" : "d'Eau"}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Location info */}
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-foreground">{report.commune}</p>
            {report.quartier && (
              <p className="text-sm text-muted-foreground">{report.quartier}</p>
            )}
          </div>
        </div>

        {/* Info banner */}
        <div className="rounded-xl bg-secondary/50 p-4">
          <p className="text-sm text-foreground">
            Un voisin a signalé une coupure {isElec ? "d'électricité" : "d'eau"} dans votre quartier.
            Si vous êtes aussi affecté(e), confirmez pour renforcer le signalement.
          </p>
        </div>

        {confirmed ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-xl bg-success/10 p-5 text-center"
          >
            <CheckCircle2 className="mx-auto h-10 w-10 text-success mb-2" />
            <p className="font-bold text-success">Confirmation enregistrée</p>
            <p className="text-sm text-muted-foreground mt-1">
              Merci d'avoir aidé votre communauté !
            </p>
            <Button variant="outline" className="mt-4" onClick={onDone}>
              Retour à mes signalements
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <Button
              onClick={handleCorroborate}
              disabled={confirming}
              className="w-full py-6 text-base font-bold border-urgent text-urgent-foreground bg-urgent hover:bg-urgent/90"
            >
              {confirming ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Envoi…
                </>
              ) : (
                <>
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  Oui, je confirme la coupure
                </>
              )}
            </Button>

            <Button variant="outline" className="w-full" onClick={onDone}>
              Non, tout va bien chez moi
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default NeighborCorroboration;
