/**
 * Helpers for displaying report cards across the app.
 * Centralizes parsing of the description format:
 *   "[TypeLabel] User text. [X personne(s) dont ...]"
 */

/** Map of infra type label → display emoji */
export const INFRA_LABEL_EMOJI: Record<string, string> = {
  // CIE (Électricité & Éclairage Public)
  "Éclairage public": "💡",
  "Lampadaire & Éclairage public": "💡",
  "Lampadaire": "💡",
  "Lampadaires": "💡",
  "Lampadaire cassé": "💡",
  "Lampadaire hors service": "💡",
  "Éclairage Public Hors Service": "💡",
  "Poteaux / Pylônes": "🗼",
  "Poteaux/Pilônes": "🗼",
  "Poteau électrique": "🗼",
  "Poteaux/Pylônes à risque": "🗼",
  "Branchements dangereux": "⚠️",
  "Branchement dangereux": "⚠️",
  "Autres incidents CIE": "🚧",

  // SODECI (Eau Potable & Assainissement)
  "Canalisation publique": "🚰",
  "Fuite d'eau": "🚿",
  "Fuite d'eau à l'extérieur": "🚿",
  "Autre incident SODECI": "💧",
  "Égout bouché": "🕳️",
  "Débordement de regards": "🕳️",

  // Mairie (Voirie & Propreté)
  "Nid de poule": "🛣️",
  "Caniveau bouché": "🚧",
  "Voirie & Trottoirs": "🛤️",
  "Voirie dégradée": "🛤️",
  "Égout à ciel ouvert": "🕳️",
  "Déchets de marché": "🏪",
  "Dépôt sauvage & Ordures": "🗑️",
  "Dépôt sauvage": "🗑️",
  "Autre (Mairie)": "🏗️",
  "Autre": "🏗️",
};

/**
 * Extracts the infra type label stored as the first `[...]` token in description.
 * Returns null if no bracket prefix found.
 */
export function extractInfraLabel(description: string): string | null {
  if (!description) return null;
  const match = description.match(/^\[([^\]]+)\]/);
  if (match) return match[1];

  const lower = description.toLowerCase();
  if (lower.includes("lampadaire") || lower.includes("éclairage") || lower.includes("eclairage")) return "Lampadaire & Éclairage public";
  if (lower.includes("poteau") || lower.includes("pylone") || lower.includes("pylône")) return "Poteaux / Pylônes";
  if (lower.includes("branchement") || lower.includes("fil dénudé") || lower.includes("fil au sol")) return "Branchements dangereux";
  if (lower.includes("fuite")) return "Fuite d'eau";
  if (lower.includes("canalisation") || lower.includes("conduite")) return "Canalisation publique";
  if (lower.includes("nid de poule") || lower.includes("nids de poule") || lower.includes("chaussée") || lower.includes("chaussee")) return "Nid de poule";
  if (lower.includes("caniveau") || lower.includes("égout") || lower.includes("egout")) return "Caniveau bouché";
  if (lower.includes("ordure") || lower.includes("déchet") || lower.includes("dechet") || lower.includes("dépôt") || lower.includes("depot")) return "Dépôt sauvage & Ordures";

  return null;
}

/**
 * Returns a clean description for display:
 * - strips the leading `[TypeLabel]` bracket
 * - strips the `[PADA : ...]` bracket anywhere in the string (privacy protection)
 * - strips the `[Compteur : ...]` bracket anywhere in the string
 * - strips the `[X personne(s)...]` bracket anywhere in the string
 */
export function cleanDescription(description: string): string {
  if (!description) return "";
  return description
    .replace(/^\[[^\]]+\]\s*/, "") // remove [TypeLabel] prefix
    .replace(/\s*\[PADA\s*:[^\]]*\]/gi, "") // remove [PADA : ...] bracket
    .replace(/\s*\[Compteur\s*:[^\]]*\]/gi, "") // remove [Compteur : ...] bracket
    .replace(/\s*\[\d+\s*personne[^\]]*\]/gi, "") // remove [X personne(s)...] bracket
    .replace(/\s*\[\d+[^\]]*\]/g, "") // remove trailing numeric bracket metadata
    .trim();
}

/**
 * Returns the emoji for an infra type label, falling back to 🏗️.
 */
export function infraEmoji(label: string | null): string {
  if (!label) return "🏗️";
  return INFRA_LABEL_EMOJI[label] ?? "🏗️";
}

/** Infra types managed by CIE (electricity operator) */
export const INFRA_CIE = new Set([
  "Éclairage public",
  "Lampadaire & Éclairage public",
  "Lampadaire",
  "Lampadaires",
  "Lampadaire cassé",
  "Lampadaire hors service",
  "Éclairage Public Hors Service",
  "Poteaux / Pylônes",
  "Poteaux/Pilônes",
  "Poteau électrique",
  "Poteaux/Pylônes à risque",
  "Branchements dangereux",
  "Branchement dangereux",
  "Autres incidents CIE"
]);

/** Infra types managed by SODECI (water operator) */
export const INFRA_SODECI = new Set([
  "Canalisation publique",
  "Fuite d'eau",
  "Fuite d'eau à l'extérieur",
  "Autre incident SODECI",
  "Égout bouché",
  "Débordement de regards"
]);

/**
 * Returns the responsible operator for an infrastructure report.
 * - CIE  : lampadaires, éclairage public, poteaux, branchements
 * - SODECI : fuites d'eau, canalisations, égouts, regards
 * - Mairie de {commune} : caniveaux, voirie, nid de poule, ordures, autres
 */
export function infraOperator(label: string | null, commune: string): string {
  if (label && INFRA_CIE.has(label)) return "CIE";
  if (label && INFRA_SODECI.has(label)) return "SODECI";
  return `Mairie de ${commune}`;
}

/** Checks if a label belongs to infrastructure (lampadaire, fuite, canalisation, poteau, etc.) vs outage (coupure) */
export function isInfraLabel(label: string | null): boolean {
  if (!label) return false;
  const l = label.toLowerCase().trim();
  if (l.includes("coupure") || l.includes("outage") || l.includes("interruption") || l.includes("panne")) return false;
  return (
    INFRA_CIE.has(label) ||
    INFRA_SODECI.has(label) ||
    [
      "éclairage", "lampadaire", "poteau", "pylône", "branchement",
      "fuite", "canalisation", "égout", "regard", "nid de poule", "caniveau",
      "voirie", "trottoir", "ordures", "dépôt sauvage", "déchets", "infrastructure"
    ].some(k => l.includes(k))
  );
}

/**
 * Formate proprement une durée en minutes pour l'affichage (ex: "3 min", "1h 15min", "2j 4h").
 * Arrondit les fractions décimales pour éviter des valeurs comme "2.623316666666667min".
 */
export function formatDurationMinutes(mins: number | null | undefined): string {
  if (mins === null || mins === undefined || isNaN(mins) || mins <= 0) return "—";
  const roundedMins = Math.round(mins);
  if (roundedMins < 1) return "< 1 min";
  if (roundedMins < 60) return `${roundedMins} min`;
  const h = Math.floor(roundedMins / 60);
  const m = roundedMins % 60;
  if (h < 24) return `${h}h${m > 0 ? ` ${m}min` : ""}`;
  const d = Math.floor(h / 24);
  const remH = h % 24;
  return `${d}j${remH > 0 ? ` ${remH}h` : ""}`;
}

