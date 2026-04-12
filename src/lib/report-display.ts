/**
 * Helpers for displaying report cards across the app.
 * Centralizes parsing of the description format:
 *   "[TypeLabel] User text. [X personne(s) dont ...]"
 */

/** Map of infra type label → display emoji */
export const INFRA_LABEL_EMOJI: Record<string, string> = {
  "Lampadaire cassé": "💡",
  "Fuite d'eau": "🚿",
  "Caniveau bouché": "🚧",
  "Nid de poule": "🛣️",
  "Voirie dégradée": "🛤️",
  "Égout à ciel ouvert": "🕳️",
  "Déchets de marché": "🏪",
  "Dépôt sauvage": "🗑️",
  "Poteau électrique": "🔌",
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
