import { CheckCircle2, Clock, Users, ShieldCheck, Flame } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface CorroborationStatusProps {
  verifications: number;
  /** Number of confirmations needed for "fully confirmed" (default 5) */
  threshold?: number;
  /** Compact mode for list items */
  compact?: boolean;
}

/**
 * Paliers :
 * 0       → En attente (gris)
 * 1-2     → En cours de vérification (orange)
 * 3-4     → Confirmée par les voisins (vert)
 * 5+      → Confirmée et vérifiée (vert brillant + badge)
 */
const CorroborationStatus = ({ verifications, threshold = 5, compact = false }: CorroborationStatusProps) => {
  const percent = Math.min(100, (verifications / threshold) * 100);

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
      label: `${verifications} confirmation${verifications > 1 ? "s" : ""}`,
      sublabel: "vérification en cours",
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
      progressColor: "[&>div]:bg-amber-500",
    };
  } else if (verifications < threshold) {
    status = {
      icon: <CheckCircle2 className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />,
      label: "Confirmée par les voisins",
      sublabel: `${verifications} confirmation${verifications > 1 ? "s" : ""}`,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      progressColor: "[&>div]:bg-emerald-500",
    };
  } else {
    status = {
      icon: <ShieldCheck className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />,
      label: "Confirmée et vérifiée",
      sublabel: `${verifications} confirmations`,
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
          ? "Aucun voisin n'a encore confirmé cette coupure."
          : verifications < 3
          ? "Quelques voisins ont confirmé. Plus il y a de confirmations, plus le signalement est crédible."
          : verifications < threshold
          ? "Coupure confirmée par plusieurs voisins. Le signalement est crédible."
          : "Signalement massivement confirmé par le voisinage. Haute fiabilité."}
      </p>
    </div>
  );
};

export default CorroborationStatus;
