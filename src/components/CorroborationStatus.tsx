import { CheckCircle2, Clock, Users, ShieldCheck } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface CorroborationStatusProps {
  verifications: number;
  /** Number of confirmations needed for "fully confirmed" (default 5) */
  threshold?: number;
  /** Compact mode for list items */
  compact?: boolean;
  /** "infrastructure" reports use different wording */
  reportCategory?: string;
}

/**
 * Paliers :
 * 0       → En attente (gris)
 * 1-2     → En cours de vérification (orange)
 * 3-4     → Confirmée par les voisins (vert)
 * 5+      → Confirmée et vérifiée (vert brillant + badge)
 */
const CorroborationStatus = ({ verifications, threshold = 5, compact = false, reportCategory }: CorroborationStatusProps) => {
  const percent = Math.min(100, (verifications / threshold) * 100);
  const isInfra = reportCategory === "infrastructure";

  let status: { icon: React.ReactNode; label: string; sublabel: string; color: string; bg: string; progressColor: string };

  if (verifications === 0) {
    status = {
      icon: <Clock className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />,
      label: "En attente",
      sublabel: "en cours de vérification",
      color: "text-muted-foreground",
      bg: "bg-muted/50",
      progressColor: "[&>div]:bg-muted-foreground/30",
    };
  } else if (verifications < 3) {
    status = {
      icon: <Users className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />,
      label: isInfra
        ? `${verifications} citoyen${verifications > 1 ? "s" : ""} demandent la réparation`
        : `${verifications} confirmation${verifications > 1 ? "s" : ""}`,
      sublabel: "vérification en cours",
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
      progressColor: "[&>div]:bg-amber-500",
    };
  } else if (verifications < threshold) {
    status = {
      icon: <CheckCircle2 className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />,
      label: isInfra ? "Plusieurs citoyens demandent la réparation" : "Confirmée par les voisins",
      sublabel: isInfra
        ? `${verifications} demande${verifications > 1 ? "s" : ""}`
        : `${verifications} confirmation${verifications > 1 ? "s" : ""}`,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      progressColor: "[&>div]:bg-emerald-500",
    };
  } else {
    status = {
      icon: <ShieldCheck className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />,
      label: isInfra ? "Demande de réparation collective" : "Confirmée et vérifiée",
      sublabel: isInfra
        ? `${verifications} citoyens mobilisés`
        : `${verifications} confirmations`,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      progressColor: "[&>div]:bg-emerald-500",
    };
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 text-xs ${status.color}`}>
        {status.icon}
        <span className="font-medium">{status.label}</span>
        <span className="text-muted-foreground">— {status.sublabel}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl ${status.bg} p-3 space-y-2`}>
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 text-sm font-semibold ${status.color}`}>
          {status.icon}
          <span>{status.label}</span>
        </div>
        <span className={`text-xs font-medium ${status.color}`}>
          {verifications}/{threshold}
        </span>
      </div>
      <Progress value={percent} className={`h-1.5 ${status.progressColor}`} />
      <p className="text-xs text-muted-foreground">
        {verifications === 0
          ? isInfra
            ? "Aucun citoyen n'a encore soutenu cette demande de réparation."
            : "Aucun voisin n'a encore confirmé cette coupure."
          : verifications < 3
          ? isInfra
            ? "Quelques citoyens ont soutenu ce signalement. Plus il y a de demandes, plus la mairie agit rapidement."
            : "Quelques voisins ont confirmé. Plus il y a de confirmations, plus le signalement est crédible."
          : verifications < threshold
          ? isInfra
            ? "Ce problème est soutenu par plusieurs citoyens. La pression sur les services techniques augmente."
            : "Coupure confirmée par plusieurs voisins. Le signalement est crédible."
          : isInfra
          ? "Forte mobilisation citoyenne. Ce signalement a un poids important auprès des services de la mairie."
          : "Signalement massivement confirmé par le voisinage. Haute fiabilité."}
      </p>
    </div>
  );
};

export default CorroborationStatus;
