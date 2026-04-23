import { ConsumptionEstimate, formatDaysRemaining, formatDate } from "@/lib/consumptionEngine";
import { AlertTriangle, Battery, BatteryLow, BatteryMedium, BatteryFull, TrendingUp, TrendingDown, Minus, Info } from "lucide-react";

interface Props {
  estimate: ConsumptionEstimate;
  onAddReading: () => void;
}

function BatteryIcon({ pct }: { pct: number }) {
  if (pct <= 15) return <BatteryLow className="h-6 w-6 text-red-500" />;
  if (pct <= 40) return <BatteryMedium className="h-6 w-6 text-orange-500" />;
  return <BatteryFull className="h-6 w-6 text-emerald-500" />;
}

function TrendIcon({ trend }: { trend: ConsumptionEstimate["trend"] }) {
  if (trend === "increasing") return <TrendingUp className="h-3.5 w-3.5 text-red-500" />;
  if (trend === "decreasing") return <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />;
  if (trend === "stable") return <Minus className="h-3.5 w-3.5 text-sky-500" />;
  return null;
}

const CONFIDENCE_COLORS: Record<ConsumptionEstimate["confidence"], string> = {
  high:        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  medium:      "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
  low:         "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  insufficient:"bg-muted text-muted-foreground border-border",
};

export default function EstimationCard({ estimate, onAddReading }: Props) {
  const isInsufficient = estimate.confidence === "insufficient";

  // Calcul du % de batterie (basé sur les jours restants, max 60 jours = 100%)
  const batteryPct = estimate.days_remaining !== null
    ? Math.min(100, Math.round((estimate.days_remaining / 60) * 100))
    : 0;

  // Couleur urgence
  const urgentColor = estimate.days_remaining !== null && estimate.days_remaining <= 3
    ? "border-red-500/40 bg-red-50/50 dark:bg-red-950/20"
    : "border-border bg-card";

  return (
    <div className={`rounded-2xl border ${urgentColor} p-5 space-y-4`}>

      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Autonomie estimée
          </p>
          <p className="text-3xl font-extrabold text-foreground mt-0.5 leading-tight">
            {formatDaysRemaining(estimate.days_remaining)}
          </p>
          {estimate.end_date && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Fin estimée : <span className="font-medium text-foreground">{formatDate(estimate.end_date)}</span>
            </p>
          )}
        </div>
        <BatteryIcon pct={batteryPct} />
      </div>

      {/* Barre de progression */}
      {!isInsufficient && (
        <div className="space-y-1">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                batteryPct <= 15 ? "bg-red-500"
                : batteryPct <= 40 ? "bg-orange-500"
                : "bg-emerald-500"
              }`}
              style={{ width: `${batteryPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0</span>
            <span>{estimate.current_kwh !== null ? `${estimate.current_kwh} kWh restants` : ""}</span>
            <span>60j</span>
          </div>
        </div>
      )}

      {/* Métriques */}
      {!isInsufficient && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-muted/50 px-3 py-2">
            <p className="text-[10px] text-muted-foreground">Consommation/jour</p>
            <p className="text-lg font-bold text-foreground">
              {estimate.avg_kwh_per_day !== null ? `${estimate.avg_kwh_per_day} kWh` : "—"}
            </p>
          </div>
          <div className="rounded-xl bg-muted/50 px-3 py-2">
            <div className="flex items-center gap-1">
              <p className="text-[10px] text-muted-foreground">Tendance</p>
              <TrendIcon trend={estimate.trend} />
            </div>
            <p className="text-lg font-bold text-foreground">{estimate.trend_label}</p>
          </div>
        </div>
      )}

      {/* Badge confiance */}
      <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium ${CONFIDENCE_COLORS[estimate.confidence]}`}>
        <Info className="h-3 w-3" />
        {estimate.confidence_label}
        {estimate.data_points > 0 && ` (${estimate.data_points} point${estimate.data_points > 1 ? "s" : ""})`}
      </div>

      {/* Alerte ou avertissement */}
      {estimate.warning && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-400">{estimate.warning}</p>
        </div>
      )}

      {/* Bouton mise à jour */}
      <button
        onClick={onAddReading}
        className="w-full rounded-xl border-2 border-dashed border-primary/30 py-2.5 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
      >
        Mettre à jour mes kWh restants
      </button>

      {isInsufficient && (
        <p className="text-center text-xs text-muted-foreground">
          L'estimation s'affiche après l'enregistrement de votre première recharge et mise à jour.
        </p>
      )}
    </div>
  );
}
