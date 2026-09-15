// =========================================================================
// SUIVI BUDGET CI - MOTEUR DE RECHERCHE ET FILTRAGE INTELLIGENT (SMART SEARCH)
// Évite les faux positifs (ex: "Agou" qui matchait "Bagoué"),
// gère les accents, les tirets, les apostrophes et le multi-mots.
// =========================================================================

/**
 * Normalise un texte : minuscules, suppression des accents (diacritiques),
 * remplacement des séparateurs (tirets, apostrophes, ponctuation) par des espaces.
 */
export function normalizeSearchText(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents (é -> e, è -> e, etc.)
    .replace(/['’\-–—/\\.,;:!?()[\]{}"_#+]/g, ' ') // Remplace les tirets et apostrophes par des espaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Découpe un texte en liste de mots distincts normalisés
 */
export function extractWords(str: string | undefined | null): string[] {
  const norm = normalizeSearchText(str);
  if (!norm) return [];
  return norm.split(' ').filter(w => w.length > 0);
}

/**
 * Vérifie si un ensemble de champs cibles correspond à la requête de recherche.
 * 
 * RÈGLE D'OR :
 * Chaque mot-clé de la requête (ex: "agou") doit correspondre au DÉBUT d'un mot réel
 * dans l'un des champs cibles.
 * 
 * Exemple :
 * - "agou" correspond à "Agou", "Mairie d'Agou", "Centre d'Agou"
 * - "agou" NE CORRESPOND PAS à "Bagoué" (car "bagoue" ne commence pas par "agou")
 */
export function matchesSmartSearch(
  targetFields: (string | number | undefined | null)[],
  query: string
): boolean {
  const cleanQuery = normalizeSearchText(query);
  if (!cleanQuery) return true;

  const queryTokens = cleanQuery.split(' ').filter(Boolean);
  if (queryTokens.length === 0) return true;

  // Extraire tous les mots des champs cibles
  const targetWords: string[] = [];
  for (const field of targetFields) {
    if (field !== undefined && field !== null) {
      const words = extractWords(String(field));
      targetWords.push(...words);
    }
  }

  if (targetWords.length === 0) return false;

  // Chaque token de recherche doit être le préfixe d'au moins un mot cible
  return queryTokens.every(qToken => {
    return targetWords.some(tWord => tWord.startsWith(qToken));
  });
}
