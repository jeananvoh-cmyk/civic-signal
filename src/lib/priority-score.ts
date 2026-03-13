/**
 * Système de priorisation des signalements basé sur les normes internationales
 * adaptées au contexte ivoirien (Abidjan, climat tropical).
 *
 * Sources :
 * - OMS : Accès à l'eau potable — interruption > 24h = urgence sanitaire
 *   (pondéré ×1.5 en climat tropical chaud & humide → déshydratation accélérée)
 * - IEEE 1366 : Indices de fiabilité réseau électrique (SAIDI/SAIFI)
 *   Seuil critique adapté : > 12h en zone urbaine dense
 * - Sphère Handbook : Standards humanitaires pour populations vulnérables
 *   Bébés, femmes enceintes, personnes âgées → multiplicateurs de risque
 *
 * Score final → niveau P1 (critique) à P4 (faible)
 */

// ────────────────────────── Types ──────────────────────────

export type PriorityLevel = "P1" | "P2" | "P3" | "P4";

export interface PriorityResult {
  /** Score numérique brut (0–100+) */
  score: number;
  /** Niveau de priorité P1–P4 */
  level: PriorityLevel;
  /** Libellé humain */
  label: string;
  /** Emoji */
  emoji: string;
  /** Classe CSS Tailwind (border / bg / text) */
  pillClass: string;
  /** Facteurs ayant contribué au score (pour tooltip admin) */
  factors: string[];
}

export interface PriorityInput {
  service_type: string;
  /** ISO date string du début de la coupure (start_time ou created_at) */
  start_time: string | null;
  created_at: string;
  status: string;
  verifications: number;
  impacted_people?: number | null;
  babies?: number | null;
  pregnant?: number | null;
  elderly?: number | null;
  urgency?: string;
}

// ────────────────────────── Constantes ──────────────────────────

/** Pondération service : l'eau est plus critique en climat tropical (OMS) */
const SERVICE_WEIGHT: Record<string, number> = {
  water: 1.5,
  electricity: 1.0,
  mairie: 0.6,
};

/** Seuils de durée en minutes et points associés */
const WATER_DURATION_THRESHOLDS = [
  { mins: 48 * 60, pts: 40, label: ">48h sans eau — urgence sanitaire OMS" },
  { mins: 24 * 60, pts: 32, label: ">24h sans eau — seuil OMS critique" },
  { mins: 12 * 60, pts: 22, label: ">12h sans eau — risque déshydratation" },
  { mins: 6 * 60, pts: 12, label: ">6h sans eau — alerte OMS" },
  { mins: 2 * 60, pts: 4, label: ">2h sans eau" },
];

const ELEC_DURATION_THRESHOLDS = [
  { mins: 48 * 60, pts: 30, label: ">48h sans électricité — critique IEEE" },
  { mins: 24 * 60, pts: 24, label: ">24h sans électricité — seuil IEEE" },
  { mins: 12 * 60, pts: 16, label: ">12h — seuil zone urbaine dense" },
  { mins: 6 * 60, pts: 10, label: ">6h sans électricité" },
  { mins: 2 * 60, pts: 4, label: ">2h sans électricité" },
];

/** Multiplicateurs vulnérabilité (Sphère Handbook / OMS tropical) */
const VULNERABILITY = {
  babies: { ptsEach: 6, label: "Nourrisson(s) — risque déshydratation ×4" },
  pregnant: { ptsEach: 4, label: "Femme(s) enceinte(s) — risque sanitaire ×3" },
  elderly: { ptsEach: 3, label: "Personne(s) âgée(s) — risque thermique ×2" },
};

/** Points par tranche de personnes impactées (échelle logarithmique) */
function impactPoints(count: number): { pts: number; label: string } {
  if (count >= 50) return { pts: 15, label: `${count} personnes impactées — impact massif` };
  if (count >= 20) return { pts: 10, label: `${count} personnes impactées — impact élevé` };
  if (count >= 5) return { pts: 5, label: `${count} personnes impactées` };
  if (count >= 2) return { pts: 2, label: `${count} personnes impactées` };
  return { pts: 0, label: "" };
}

/** Points par confirmation de voisins (fiabilité) */
function verificationPoints(v: number): { pts: number; label: string } {
  if (v >= 5) return { pts: 10, label: `${v} confirmations — haute fiabilité` };
  if (v >= 3) return { pts: 6, label: `${v} confirmations — zone confirmée` };
  if (v >= 1) return { pts: 2, label: `${v} confirmation(s)` };
  return { pts: 0, label: "" };
}

/** Escalade par ancienneté sans réponse (jours depuis création) */
function neglectPoints(days: number): { pts: number; label: string } {
  if (days >= 14) return { pts: 15, label: `${Math.floor(days)}j sans intervention — escalade maximale` };
  if (days >= 7) return { pts: 10, label: `${Math.floor(days)}j sans intervention` };
  if (days >= 3) return { pts: 5, label: `${Math.floor(days)}j sans réponse` };
  return { pts: 0, label: "" };
}

// ────────────────────────── Niveaux ──────────────────────────

const PRIORITY_META: Record<PriorityLevel, { label: string; emoji: string; pillClass: string }> = {
  P1: {
    label: "Critique",
    emoji: "🔴",
    pillClass: "text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-800",
  },
  P2: {
    label: "Élevé",
    emoji: "🟠",
    pillClass: "text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-950/40 border border-orange-300 dark:border-orange-800",
  },
  P3: {
    label: "Modéré",
    emoji: "🟡",
    pillClass: "text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800",
  },
  P4: {
    label: "Faible",
    emoji: "🟢",
    pillClass: "text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-950/40 border border-green-300 dark:border-green-800",
  },
};

function scoreToLevel(score: number): PriorityLevel {
  if (score >= 55) return "P1";
  if (score >= 35) return "P2";
  if (score >= 18) return "P3";
  return "P4";
}

// ────────────────────────── Calcul ──────────────────────────

export function calculatePriority(input: PriorityInput): PriorityResult {
  // Resolved reports get P4
  if (input.status === "resolved") {
    return { score: 0, level: "P4", ...PRIORITY_META.P4, factors: ["Résolu"] };
  }

  const factors: string[] = [];
  let rawScore = 0;

  // 1. Duration score
  const refTime = input.start_time || input.created_at;
  const durationMins = (Date.now() - new Date(refTime).getTime()) / 60000;
  const thresholds = input.service_type === "water" ? WATER_DURATION_THRESHOLDS : ELEC_DURATION_THRESHOLDS;
  for (const t of thresholds) {
    if (durationMins >= t.mins) {
      rawScore += t.pts;
      factors.push(t.label);
      break;
    }
  }

  // 2. Vulnerability score (Sphère Handbook)
  const babies = input.babies ?? 0;
  const pregnant = input.pregnant ?? 0;
  const elderly = input.elderly ?? 0;
  if (babies > 0) {
    const pts = Math.min(babies * VULNERABILITY.babies.ptsEach, 24);
    rawScore += pts;
    factors.push(`${babies} nourrisson(s) (+${pts}pts)`);
  }
  if (pregnant > 0) {
    const pts = Math.min(pregnant * VULNERABILITY.pregnant.ptsEach, 16);
    rawScore += pts;
    factors.push(`${pregnant} femme(s) enceinte(s) (+${pts}pts)`);
  }
  if (elderly > 0) {
    const pts = Math.min(elderly * VULNERABILITY.elderly.ptsEach, 15);
    rawScore += pts;
    factors.push(`${elderly} personne(s) âgée(s) (+${pts}pts)`);
  }

  // 3. Impact scale
  const impacted = input.impacted_people ?? 1;
  const imp = impactPoints(impacted);
  if (imp.pts > 0) {
    rawScore += imp.pts;
    factors.push(imp.label);
  }

  // 4. Verification bonus (fiabilité communautaire)
  const verif = verificationPoints(input.verifications);
  if (verif.pts > 0) {
    rawScore += verif.pts;
    factors.push(verif.label);
  }

  // 5. Neglect escalation
  const ageDays = (Date.now() - new Date(input.created_at).getTime()) / 86400000;
  const neg = neglectPoints(ageDays);
  if (neg.pts > 0) {
    rawScore += neg.pts;
    factors.push(neg.label);
  }

  // 6. Apply service weight
  const weight = SERVICE_WEIGHT[input.service_type] ?? 1.0;
  const finalScore = Math.round(rawScore * weight);

  if (weight !== 1.0) {
    const serviceName = input.service_type === "water" ? "Eau (×1.5 OMS tropical)" : "Infrastructure (×0.6)";
    factors.push(`Pondération ${serviceName}`);
  }

  const level = scoreToLevel(finalScore);

  return {
    score: finalScore,
    level,
    ...PRIORITY_META[level],
    factors,
  };
}

/**
 * Norme de référence pour un affichage textuel
 */
export function getNormReference(serviceType: string): string {
  if (serviceType === "water") {
    return "OMS — Directives qualité eau potable (2022) • Sphère Handbook";
  }
  if (serviceType === "electricity") {
    return "IEEE 1366 — Indices fiabilité réseau • Adapté zone urbaine tropicale";
  }
  return "Standards municipaux • Sphère Handbook";
}
