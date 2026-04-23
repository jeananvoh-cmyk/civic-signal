import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Droplets, Wrench, CheckCircle2, Loader2, AlertTriangle, MapPin, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { COMMUNE_COLORS } from "@/lib/communes";
import { toast } from "sonner";

interface ReportToCorroborate {
  id: string;
  service_type: string;
  report_category: string;
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
  /** Called once the report type is resolved — lets the parent update its heading */
  onReportLoaded?: (serviceType: string, reportCategory: string) => void;
}

const NeighborCorroboration = ({ reportId, onDone, onReportLoaded }: NeighborCorroborationProps) => {
  const { user } = useAuth();
  const [report, setReport] = useState<ReportToCorroborate | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      if (!user || !reportId) return;

      // 1. Try to fetch the report directly (active reports are publicly readable)
      const { data: reportData } = await supabase
        .from("reports")
        .select("id, service_type, report_category, commune, quartier, verifications, created_at, start_time, description")
        .eq("id", reportId)
        .single();

      if (reportData) {
        // Check if already corroborated
        const { data: existing } = await supabase
          .from("corroborations")
          .select("id")
          .eq("report_id", reportId)
          .eq("user_id", user.id)
          .limit(1);

        if (existing && existing.length > 0) setConfirmed(true);

        const r = reportData as ReportToCorroborate;
        setReport(r);
        onReportLoaded?.(r.service_type, r.report_category);
        setLoading(false);
        return;
      }

      // 2. Fallback: parse from notification
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

      const msg = notifData.message ?? "";
      const title = notifData.title ?? "";
      const combined = msg + " " + title;

      // Detect type from message keywords
      const isInfra =
        combined.includes("nfrastructure") ||
        combined.includes("oirie") ||
        combined.includes("gout") ||
        combined.includes("arché") ||
        combined.includes("🏗") ||
        combined.includes("🛤") ||
        combined.includes("🕳") ||
        combined.includes("🏪");

      const isElec =
        !isInfra &&
        (combined.includes("lectricité") ||
          combined.includes("lectric") ||
          combined.includes("CIE") ||
          combined.includes("⚡"));

      const serviceLabel = isInfra ? "infrastructure" : isElec ? "electricity" : "water";
      const reportCategory = isInfra ? "infrastructure" : "outage";

      // Check if already corroborated
      const { data: existing } = await supabase
        .from("corroborations")
        .select("id")
        .eq("report_id", reportId)
        .eq("user_id", user.id)
        .limit(1);

      if (existing && existing.length > 0) setConfirmed(true);

      const parts = msg.split(" — ");
      const locationParts = parts[1]?.split(", ") || ["", ""];

      setReport({
        id: reportId,
        service_type: serviceLabel,
        report_category: reportCategory,
        description: msg,
        commune: locationParts[0] || "",
        quartier: locationParts[1] || "",
        verifications: 0,
        created_at: "",
        start_time: "",
      });
      onReportLoaded?.(serviceLabel, reportCategory);
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
      const isInfra = report?.report_category === "infrastructure";
      toast.success(isInfra
        ? "✅ Merci ! Votre demande de réparation a été enregistrée."
        : "✅ Merci ! Votre confirmation a été enregistrée.");
    } catch (err: any) {
      const msg = err.message || "Erreur";
      if (msg.includes("déjà confirmé")) {
        setConfirmed(true);
        toast.info("Vous avez déjà soutenu ce signalement.");
      } else if (msg.includes("Impossible de confirmer")) {
        setError("Ce signalement a été résolu ou supprimé. L'action n'est plus possible.");
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
    const isResolved = error?.includes("résolu ou supprimé");
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-8 shadow-card text-center"
      >
        {isResolved ? (
          <CheckCircle2 className="mx-auto h-8 w-8 text-success mb-3" />
        ) : (
          <AlertTriangle className="mx-auto h-8 w-8 text-urgent mb-3" />
        )}
        <p className="text-sm text-muted-foreground">{error || "Signalement introuvable."}</p>
        <Button variant="outline" className="mt-4" onClick={onDone}>
          Retour
        </Button>
      </motion.div>
    );
  }

  const isInfra = report.report_category === "infrastructure";
  const isElec = report.service_type === "electricity";
  const color = COMMUNE_COLORS[report.commune] || "#6B7280";

  // Détection du sous-type infrastructure depuis la description
  const detectInfraSubtype = (desc: string): { label: string; btnLabel: string; headerLabel: string } => {
    const d = (desc || "").toLowerCase();
    if (d.includes("caniveau") || d.includes("égout") || d.includes("drainage") || d.includes("drain"))
      return { label: "un caniveau bouché ou un problème de drainage", btnLabel: "Je confirme ce problème", headerLabel: "Caniveau / Drainage" };
    if (d.includes("route") || d.includes("chaussée") || d.includes("asphalte") || d.includes("nid-de-poule") || d.includes("trottoir"))
      return { label: "une route ou un trottoir dégradé", btnLabel: "Je confirme ce problème de voirie", headerLabel: "Route / Voirie" };
    if (d.includes("lampadaire") || d.includes("éclairage") || d.includes("lumière") || d.includes("poteau"))
      return { label: "un lampadaire ou un problème d'éclairage public", btnLabel: "Je confirme ce problème", headerLabel: "Éclairage public" };
    if (d.includes("fuite") || d.includes("canalisation") || d.includes("conduite"))
      return { label: "une fuite ou une canalisation défectueuse", btnLabel: "Je confirme cette fuite", headerLabel: "Fuite / Canalisation" };
    if (d.includes("déchet") || d.includes("ordure") || d.includes("dépôt sauvage") || d.includes("insalubri"))
      return { label: "un problème de salubrité dans votre quartier", btnLabel: "Je confirme ce problème", headerLabel: "Salubrité" };
    return { label: "un problème d'infrastructure", btnLabel: "Je demande aussi la réparation", headerLabel: "Voirie / Infrastructure" };
  };

  const infraSubtype = isInfra ? detectInfraSubtype(report.description) : null;

  // Extrait lisible de la description (max 90 car.)
  const descExcerpt = report.description
    ? report.description.slice(0, 90).trim() + (report.description.length > 90 ? "…" : "")
    : null;

  // Dynamic labels
  const headerLabel = isInfra
    ? (infraSubtype?.headerLabel ?? "Voirie / Infrastructure")
    : isElec
      ? "Coupure d'électricité"
      : "Coupure d'eau";

  const headerIcon = isInfra
    ? <Wrench className="h-5 w-5" />
    : isElec
      ? <Zap className="h-5 w-5" />
      : <Droplets className="h-5 w-5" />;

  const infoBannerText = isInfra
    ? `Un voisin a signalé ${infraSubtype?.label ?? "un problème d'infrastructure"} dans votre quartier.${descExcerpt ? ` Il décrit : « ${descExcerpt} »` : ""} Si vous êtes aussi concerné(e), soutenez ce signalement pour accélérer l'intervention de la mairie.`
    : `Un voisin a signalé une coupure ${isElec ? "d'électricité" : "d'eau"} dans votre quartier. Si vous êtes aussi affecté(e), confirmez pour renforcer le signalement.`;

  const confirmBtnLabel = isInfra
    ? (infraSubtype?.btnLabel ?? "Je demande aussi la réparation")
    : "Oui, je confirme la coupure";

  const declineBtnLabel = isInfra
    ? "Pas de problème dans mon secteur"
    : "Non, tout va bien chez moi";

  const confirmedTitle = isInfra ? "Demande enregistrée" : "Confirmation enregistrée";
  const confirmedDesc = isInfra
    ? "Merci ! Votre demande renforce la pression sur les services de la mairie."
    : "Merci d'avoir aidé votre communauté !";

  const supportCount = report.verifications > 0 ? report.verifications : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card shadow-card overflow-hidden"
    >
      {/* Header band */}
      <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: color }}>
        <div className="flex items-center gap-2 text-white">
          {headerIcon}
          <span className="text-sm font-bold">{headerLabel}</span>
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

        {/* Support count */}
        {supportCount !== null && (
          <p className="text-sm font-semibold text-foreground">
            <span className="text-primary">{supportCount}</span>{" "}
            {isInfra
              ? `citoyen${supportCount > 1 ? "s" : ""} demandent la réparation.`
              : `voisin${supportCount > 1 ? "s" : ""} ont confirmé la coupure.`}
          </p>
        )}

        {/* Info banner */}
        <div className="rounded-xl bg-secondary/50 p-4">
          <p className="text-sm text-foreground">{infoBannerText}</p>
        </div>

        {confirmed ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-xl bg-success/10 p-5 text-center"
          >
            <ThumbsUp className="mx-auto h-10 w-10 text-success mb-2" />
            <p className="font-bold text-success">{confirmedTitle}</p>
            <p className="text-sm text-muted-foreground mt-1">{confirmedDesc}</p>
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
                  {isInfra
                    ? <Wrench className="mr-2 h-5 w-5" />
                    : <AlertTriangle className="mr-2 h-5 w-5" />}
                  {confirmBtnLabel}
                </>
              )}
            </Button>

            <Button variant="outline" className="w-full" onClick={onDone}>
              {declineBtnLabel}
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default NeighborCorroboration;
