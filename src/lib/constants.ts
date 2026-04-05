// ── Signalement ───────────────────────────────────────────────────────────────

/** Nombre maximum de signalements par utilisateur par jour */
export const DAILY_REPORT_LIMIT = 5;

/** Nombre maximum de photos par signalement */
export const MAX_PHOTOS = 3;

/** Nombre de confirmations voisins pour déclencher une alerte commune */
export const CORROBORATION_COMMUNE_THRESHOLD = 3;

/** Nombre de confirmations pour considérer un signalement "vérifié" dans les stats */
export const CORROBORATION_VERIFIED_THRESHOLD = 5;

// ── Score de priorité ─────────────────────────────────────────────────────────

/** Nombre minimum de signalements dans un quartier pour activer le score de priorité */
export const ZONE_ACTIVATION_THRESHOLD = 50;

// ── Compteurs / Profil ────────────────────────────────────────────────────────

/** Poids des champs identité dans le score de conformité (5 champs × 19% = 95%) */
export const CONFORMITY_IDENTITY_WEIGHT = 19;

/** Poids total des champs compteur dans le score de conformité */
export const CONFORMITY_METER_TOTAL_WEIGHT = 5;

/** Nombre de champs compteur (3 CIE + 3 SODECI) */
export const CONFORMITY_METER_COUNT = 6;

// ── Push notifications ────────────────────────────────────────────────────────

/** Intervalle minimum entre 2 push pour le même quartier/service (en ms) */
export const PUSH_THROTTLE_MS = 60 * 60 * 1000; // 1 heure
