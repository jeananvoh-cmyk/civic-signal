/**
 * Système de priorisation des signalements adapté au contexte ivoirien (Abidjan, climat tropical).
 *
 * Références utilisées :
 *
 * EAU
 * - Sphère Handbook (2018) — standard humanitaire international : 15 L/pers/jour minimum vital ;
 *   accès coupé sans alternative = situation d'urgence. Utilisé pour les seuils de durée eau.
 * - Adaptation climatique tropical : risque de déshydratation accéléré (chaleur + humidité)
 *   justifie le multiplicateur ×1.5 par rapport aux seuils tempérés.
 * - Note : les Directives OMS sur la qualité de l'eau potable (2022) portent sur la qualité
 *   chimique/microbiologique, pas sur les durées d'interruption — elles ne sont PAS citées ici.
 *
 * ÉLECTRICITÉ
 * - Loi n° 2014-132 du 24 mars 2014 portant Code de l'Électricité de Côte d'Ivoire —
 *   cadre légal national (continuité de service, obligations concessionnaire CIE).
 * - ANARE-CI (Autorité nationale de régulation) — TMC national 2025 : 18,82 h d'interruption
 *   annuelle moyenne. Utilisé comme référence de calibrage des seuils.
 * - IEEE 1366 (SAIDI/SAIFI) cité comme cadre méthodologique de mesure de fiabilité réseau,
 *   non comme source des seuils numériques (ceux-ci sont adaptés au contexte ivoirien).
 *
 * POPULATIONS VULNÉRABLES
 * - Sphère Handbook (2018) — multiplicateurs de risque bébés, femmes enceintes, personnes âgées.
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
  /** "infrastructure" active le scoring infrastructure (sans verrou de zone) */
  report_category?: string | null;
  /**
   * [Infrastructure uniquement] Nombre d'autres signalements du même type
   * détectés aux mêmes coordonnées GPS (via get_nearby_reports).
   * Remplace impacted_people — l'impact est mesuré par la répétition, pas déclaré.
   */
  corroborating_reports?: number;
  /**
   * [Infrastructure uniquement] Votes/réactions communautaires sur la photo.
   * Champ réservé — fonctionnalité à venir.
   */
  photo_votes?: number;
  /** Contexte de zone (quartier) — pour activation du scoring avancé (outages) */
  zoneContext?: {
    /** Nombre total de signalements actifs dans ce quartier */
    totalReportsInQuartier: number;
    /** Nombre de signalements confirmés (≥1 vérification) dans ce quartier */
    confirmedReportsInQuartier: number;
  };
}

// ── Seuils d'activation zone ──
/** Le scoring avancé (zone crisis) s'active quand un quartier atteint ces seuils */
const ZONE_ACTIVATION_THRESHOLD = 50;
const ZONE_CONFIRMATION_RATE_THRESHOLD = 0.5; // 50%

// ────────────────────────── Constantes ──────────────────────────

/** Pondération service : l'eau est plus critique en climat tropical chaud & humide (Sphère Handbook) */
const SERVICE_WEIGHT: Record<string, number> = {
  water: 1.5,
  electricity: 1.0,
  mairie: 0.6,
};

/** Seuils de durée eau — basés sur Sphère Handbook (15 L/pers/jour) + adaptation climatique tropicale */
const WATER_DURATION_THRESHOLDS = [
  { mins: 48 * 60, pts: 40, label: ">48h sans eau — urgence sanitaire (Sphère Handbook)" },
  { mins: 24 * 60, pts: 32, label: ">24h sans eau — seuil d'urgence (Sphère Handbook)" },
  { mins: 12 * 60, pts: 22, label: ">12h sans eau — risque déshydratation (climat tropical)" },
  { mins: 6 * 60, pts: 12, label: ">6h sans eau — alerte (Sphère Handbook)" },
  { mins: 2 * 60, pts: 4, label: ">2h sans eau" },
];

/** Seuils de durée électricité — basés sur ANARE-CI TMC national (18,82h/an) + méthode IEEE 1366 */
const ELEC_DURATION_THRESHOLDS = [
  { mins: 48 * 60, pts: 30, label: ">48h sans électricité — interruption critique (Code Électricité CI)" },
  { mins: 24 * 60, pts: 24, label: ">24h sans électricité — dépasse TMC annuel ANARE-CI" },
  { mins: 12 * 60, pts: 16, label: ">12h — seuil zone urbaine dense (méthode IEEE 1366)" },
  { mins: 6 * 60, pts: 10, label: ">6h sans électricité" },
  { mins: 2 * 60, pts: 4, label: ">2h sans électricité" },
];

/**
 * Seuils de durée pour signalements INFRASTRUCTURE (en jours)
 * Les problèmes ponctuels sont chroniques — on mesure en jours, pas en heures
 */
const INFRA_DURATION_THRESHOLDS = [
  { days: 30, pts: 30, label: ">30j sans intervention — abandon total" },
  { days: 14, pts: 20, label: ">14j sans intervention — négligence grave" },
  { days:  7, pts: 12, label: ">7j sans intervention" },
  { days:  3, pts:  6, label: ">3j sans action — délai dépassé" },
  { days:  1, pts:  2, label: ">1j sans prise en charge" },
];

/** Seuils P1–P4 adaptés au scoring infrastructure (scores bruts plus bas que outages) */
function infraScoreToLevel(score: number): PriorityLevel {
  if (score >= 40) return "P1";
  if (score >= 22) return "P2";
  if (score >= 10) return "P3";
  return "P4";
}

/** Multiplicateurs vulnérabilité (Sphère Handbook / OMS tropical) */
const VULNERABILITY = {
  babies: { ptsEach: 6, label: "Nourrisson(s) — risque déshydratation ×4" },
  pregnant: { ptsEach: 4, label: "Femme(s) enceinte(s) — risque sanitaire ×3" },
  elderly: { ptsEach: 3, label: "Personne(s) âgée(s) — risque thermique ×2" },
};

/** Points par tranche de personnes impactées (échelle logarithmique) — outages uniquement */
function impactPoints(count: number): { pts: number; label: string } {
  if (count >= 50) return { pts: 15, label: `${count} personnes impactées — impact massif` };
  if (count >= 20) return { pts: 10, label: `${count} personnes impactées — impact élevé` };
  if (count >= 5) return { pts: 5, label: `${count} personnes impactées` };
  if (count >= 2) return { pts: 2, label: `${count} personnes impactées` };
  return { pts: 0, label: "" };
}

/**
 * Points d'impact infrastructure basés sur d'autres signalements GPS proches (même type).
 * L'impact n'est pas déclaré par le signalant — il est mesuré par la répétition objective.
 */
function gpsCorroborationPoints(count: number): { pts: number; label: string } {
  if (count >= 6) return { pts: 22, label: `${count} signalements au même endroit — point noir documenté` };
  if (count >= 3) return { pts: 15, label: `${count} signalements au même endroit — problème récurrent` };
  if (count >= 1) return { pts: 8, label: `${count} autre(s) signalement(s) au même endroit` };
  return { pts: 0, label: "" };
}

/** Points pour votes/réactions communautaires sur la photo (fonctionnalité à venir) */
function photoVotePoints(votes: number): { pts: number; label: string } {
  if (votes >= 6) return { pts: 12, label: `${votes} votes photo — problème très visible` };
  if (votes >= 3) return { pts: 7, label: `${votes} votes photo` };
  if (votes >= 1) return { pts: 3, label: `${votes} vote(s) photo` };
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

// ────────────────────────── Scoring Infrastructure ──────────────────────────

/**
 * Scoring dédié aux signalements infrastructure (nid de poule, fuite, lampadaire…)
 * Pas de verrou de zone — chaque problème est scoré individuellement dès sa création.
 * Durées mesurées en jours (problèmes chroniques, pas urgences horaires).
 */
function calculateInfraPriority(input: PriorityInput): PriorityResult {
  // Scoring inactif tant qu'aucun voisin n'a confirmé le problème
  if (input.verifications < 1) {
    return {
      score: 0,
      level: "P4",
      ...PRIORITY_META.P4,
      factors: ["En attente de vérification citoyenne"],
    };
  }

  const factors: string[] = [];
  let rawScore = 0;

  // 1. Durée sans intervention (en jours depuis created_at)
  const ageDays = (Date.now() - new Date(input.created_at).getTime()) / 86400000;
  for (const t of INFRA_DURATION_THRESHOLDS) {
    if (ageDays >= t.days) {
      rawScore += t.pts;
      factors.push(t.label);
      break;
    }
  }

  // 2. Zone sensible : signal binaire si lieu fréquenté (école, marché, hôpital…)
  // Détecté via urgency="high" positionné à la création en présence de vulnérables déclarés
  if (input.urgency === "high") {
    rawScore += 8;
    factors.push("Zone sensible signalée (+8pts)");
  }

  // 3. Impact objectif : signalements GPS proches du même type
  const gps = gpsCorroborationPoints(input.corroborating_reports ?? 0);
  if (gps.pts > 0) {
    rawScore += gps.pts;
    factors.push(gps.label);
  }

  // 4. Votes photo communautaires (fonctionnalité à venir — 0 pts par défaut)
  const pv = photoVotePoints(input.photo_votes ?? 0);
  if (pv.pts > 0) {
    rawScore += pv.pts;
    factors.push(pv.label);
  }

  // 5. Bonus confirmations citoyennes (fiabilité)
  const verif = verificationPoints(input.verifications);
  if (verif.pts > 0) {
    rawScore += verif.pts;
    factors.push(verif.label);
  }

  // Pas de pondération service — infraScoreToLevel est calibré pour le score brut
  const level = infraScoreToLevel(rawScore);
  return { score: rawScore, level, ...PRIORITY_META[level], factors };
}

// ────────────────────────── Calcul principal ──────────────────────────

export function calculatePriority(input: PriorityInput): PriorityResult {
  // Resolved reports get P4
  if (input.status === "resolved") {
    return { score: 0, level: "P4", ...PRIORITY_META.P4, factors: ["Résolu"] };
  }

  // Signalements infrastructure → scoring dédié, pas de verrou de zone
  if (input.report_category === "infrastructure") {
    return calculateInfraPriority(input);
  }

  // ── Gate : le scoring avancé ne s'active que si la zone atteint les seuils ──
  // Sans contexte de zone OU si les seuils ne sont pas atteints → P4 par défaut
  if (!input.zoneContext) {
    return { score: 0, level: "P4", ...PRIORITY_META.P4, factors: ["Scoring inactif — contexte de zone manquant"] };
  }

  const { totalReportsInQuartier, confirmedReportsInQuartier } = input.zoneContext;
  const confirmationRate = totalReportsInQuartier > 0
    ? confirmedReportsInQuartier / totalReportsInQuartier
    : 0;

  if (
    totalReportsInQuartier < ZONE_ACTIVATION_THRESHOLD ||
    confirmationRate < ZONE_CONFIRMATION_RATE_THRESHOLD
  ) {
    const reasons: string[] = [];
    if (totalReportsInQuartier < ZONE_ACTIVATION_THRESHOLD) {
      reasons.push(`${totalReportsInQuartier}/${ZONE_ACTIVATION_THRESHOLD} signalements requis`);
    }
    if (confirmationRate < ZONE_CONFIRMATION_RATE_THRESHOLD) {
      reasons.push(`${Math.round(confirmationRate * 100)}% confirmés (min ${Math.round(ZONE_CONFIRMATION_RATE_THRESHOLD * 100)}%)`);
    }
    return {
      score: 0,
      level: "P4",
      ...PRIORITY_META.P4,
      factors: [`Scoring inactif — ${reasons.join(", ")}`],
    };
  }

  // ── Zone activée : calcul complet ──
  const factors: string[] = [];
  let rawScore = 0;

  factors.push(
    `🚨 Zone activée : ${totalReportsInQuartier} signalements, ${Math.round(confirmationRate * 100)}% confirmés`
  );

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

  // 6. Zone crisis intensity bonus
  if (totalReportsInQuartier >= 100) {
    rawScore += 15;
    factors.push(`Crise majeure : ${totalReportsInQuartier} signalements (+15pts)`);
  } else if (totalReportsInQuartier >= 75) {
    rawScore += 10;
    factors.push(`Crise élevée : ${totalReportsInQuartier} signalements (+10pts)`);
  }

  // 7. Apply service weight
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
    return "Sphère Handbook (2018) — seuil vital 15 L/pers/jour • Adaptation climatique tropicale";
  }
  if (serviceType === "electricity") {
    return "Loi n° 2014-132 Code de l'Électricité CI • ANARE-CI TMC 2025 : 18,82h/an • Méthode IEEE 1366";
  }
  return "Charte des services publics municipaux • Sphère Handbook (2018)";
}
