/**
 * Duration confidence system for outage reports.
 *
 * Confidence levels:
 * - verified:  resolved via owner + ≥1 repair confirmation, OR ≥3 repair confirmations (auto-resolve)
 * - estimated: resolved by owner alone (no cross-validation)
 * - expired:   never resolved, auto-expired after 14 days
 * - active:    still ongoing (not resolved)
 */

export type DurationConfidence = "verified" | "estimated" | "expired" | "active";

interface DurationConfidenceInput {
  status: string;
  resolved_at: string | null;
  start_time: string | null;
  created_at: string;
  repair_verifications?: number | null;
  verifications?: number;
}

export function getDurationConfidence(report: DurationConfidenceInput): DurationConfidence {
  if (report.status === "expired") return "expired";
  if (report.status === "active") return "active";

  // resolved
  if (report.status === "resolved") {
    // ≥1 repair confirmation = cross-validated
    if ((report.repair_verifications ?? 0) >= 1) return "verified";
    // OR ≥3 neighbor corroborations = strong signal
    if ((report.verifications ?? 0) >= 3) return "verified";
    return "estimated";
  }

  return "active";
}

export const CONFIDENCE_META: Record<
  DurationConfidence,
  { label: string; emoji: string; description: string; pillClass: string }
> = {
  verified: {
    label: "Durée vérifiée",
    emoji: "🟢",
    description: "Confirmée par des voisins",
    pillClass:
      "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800",
  },
  estimated: {
    label: "Durée estimée",
    emoji: "🟡",
    description: "Déclarée sans confirmation croisée",
    pillClass:
      "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800",
  },
  expired: {
    label: "Expiré",
    emoji: "⚫",
    description: "Jamais résolu — durée non exploitable",
    pillClass:
      "text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700",
  },
  active: {
    label: "En cours",
    emoji: "🔴",
    description: "Coupure toujours active",
    pillClass:
      "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800",
  },
};

/**
 * Format duration with confidence prefix.
 * - verified:  "12h30"
 * - estimated: "~12h30"
 * - active:    "Au moins 12h30"
 * - expired:   "—"
 */
export function formatConfidenceDuration(
  startStr: string | null,
  endStr: string | null,
  confidence: DurationConfidence
): string {
  if (confidence === "expired") return "—";

  const start = startStr ? new Date(startStr).getTime() : 0;
  if (!start) return "—";

  const end = endStr ? new Date(endStr).getTime() : Date.now();
  const ms = end - start;
  if (ms < 0) return "—";

  const mins = Math.floor(ms / 60000);
  let durationStr: string;
  if (mins < 60) {
    durationStr = `${mins} min`;
  } else {
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hours < 24) {
      durationStr = `${hours}h${remMins > 0 ? `${remMins}` : ""}`;
    } else {
      const days = Math.floor(hours / 24);
      durationStr = `${days}j ${hours % 24}h`;
    }
  }

  if (confidence === "active") return `Au moins ${durationStr}`;
  if (confidence === "estimated") return `~${durationStr}`;
  return durationStr;
}
