/**
 * Helpers for displaying report cards across the app.
 * Centralizes parsing of the description format:
 *   "[TypeLabel] User text. [X personne(s) dont ...]"
 */

/** Map of infra type label → display emoji */
export const INFRA_LABEL_EMOJI: Record<string, string> = {
  "Lampadaire cassé": "💡",
  "Éclairage Public Hors Service": "💡",
  "Poteau électrique": "🔌",
  "Poteaux/Pylônes à risque": "🔌",
  "Branchement dangereux": "⚠️",
  "Fuite d'eau": "🚿",
  "Fuite d'eau à l'extérieur": "🚿",
  "Canalisation publique": "🚰",
  "Égout bouché": "🕳️",
  "Débordement de regards": "🕳️",
  "Caniveau bouché": "🚧",
  "Nid de poule": "🛣️",
  "Voirie dégradée": "🛤️",
  "Égout à ciel ouvert": "🕳️",
  "Déchets de marché": "🏪",
  "Dépôt sauvage": "🗑️",
  "Autre": "🏗️",
};

/**
 * Extracts the infra type label stored as the first `[...]` token in description.
 * Returns null if no bracket prefix found.
 */
export function extractInfraLabel(description: string): string | null {
  const match = description.match(/^\[([^\]]+)\]/);
  return match ? match[1] : null;
}

/**
 * Returns a clean description for display:
 * - strips the leading `[TypeLabel]` bracket
 * - strips the trailing `[X personne(s) dont ...]` bracket (impacted people metadata)
 */
export function cleanDescription(description: string): string {
  return description
    .replace(/^\[[^\]]+\]\s*/, "")        // remove [TypeLabel] prefix
    .replace(/\s*\[\d+[^\]]*\]\s*$/, "")  // remove [X personne(s)...] suffix
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
const INFRA_CIE = new Set(["Lampadaire cassé", "Poteau électrique"]);

/** Infra types managed by SODECI (water operator) */
const INFRA_SODECI = new Set(["Fuite d'eau"]);

/**
 * Returns the responsible operator for an infrastructure report.
 * - CIE  : lampadaires, poteaux électriques
 * - SODECI : fuites d'eau
 * - Mairie de {commune} : caniveaux, égouts, voirie, ordures, autres
 */
export function infraOperator(label: string | null, commune: string): string {
  if (label && INFRA_CIE.has(label)) return "CIE";
  if (label && INFRA_SODECI.has(label)) return "SODECI";
  return `Mairie de ${commune}`;
}
