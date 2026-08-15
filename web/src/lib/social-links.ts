/**
 * SIGNA-CI — Liens réseaux sociaux
 *
 * ⚠️  Mettez à jour ces URLs dès que les pages sont créées.
 *     Un seul fichier à modifier — tous les composants s'actualisent automatiquement.
 */

export const SOCIAL_LINKS = {
  /** Page Facebook officielle SIGNA-CI (à créer) */
  facebook: {
    url: "https://www.facebook.com/signaci.ci",   // ← remplacer par l'URL réelle
    label: "Page Facebook SIGNA-CI",
    ready: false,   // passer à true quand la page est créée
  },

  /** Groupe Facebook communautaire (à créer) */
  facebookGroup: {
    url: "https://www.facebook.com/groups/signaci",   // ← remplacer
    label: "Groupe Facebook Communauté",
    ready: false,
  },

  /** Canal WhatsApp officiel SIGNA-CI (à créer) */
  whatsapp: {
    url: "https://whatsapp.com/channel/0000000000000000000000",   // ← remplacer par le lien du canal
    label: "Canal WhatsApp SIGNA-CI",
    ready: false,
  },
} as const;

export type SocialKey = keyof typeof SOCIAL_LINKS;
