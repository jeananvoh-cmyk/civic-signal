import { Clock, ShieldCheck, AlertTriangle, Ban } from "lucide-react";
import {
  DurationConfidence,
  CONFIDENCE_META,
  formatConfidenceDuration,
  getDurationConfidence,
} from "@/lib/duration-confidence";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DurationBadgeProps {
  status: string;
  resolved_at: string | null;
  start_time: string | null;
  created_at: string;
  repair_verifications?: number | null;
  verifications?: number;
  /** Show full label or compact */
  compact?: boolean;
}

const CONFIDENCE_ICON: Record<DurationConfidence, typeof Clock> = {
  verified: ShieldCheck,
  estimated: AlertTriangle,
  expired: Ban,
  active: Clock,
};

export default function DurationBadge({
  status,
  resolved_at,
  start_time,
  created_at,
  repair_verifications,
  verifications,
  compact = false,
}: DurationBadgeProps) {
  const confidence = getDurationConfidence({
    status,
    resolved_at,
    start_time,
    created_at,
    repair_verifications,
    verifications,
  });

  const meta = CONFIDENCE_META[confidence];
  const duration = formatConfidenceDuration(start_time || created_at, resolved_at, confidence);
  const Icon = CONFIDENCE_ICON[confidence];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 cursor-help ${meta.pillClass}`}
          >
            <Icon className="h-3 w-3 shrink-0" />
            {compact ? duration : `${duration} · ${meta.label}`}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          <p className="font-semibold">{meta.emoji} {meta.label}</p>
          <p className="text-muted-foreground">{meta.description}</p>
          {confidence === "estimated" && (
            <p className="mt-1 text-muted-foreground italic">
              Le symbole ~ indique une durée approximative, non confirmée par des tiers.
            </p>
          )}
          {confidence === "active" && (
            <p className="mt-1 text-muted-foreground italic">
              "Au moins" car la coupure est toujours en cours.
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
