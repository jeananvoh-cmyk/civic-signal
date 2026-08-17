/**
 * SIGNA-CI — Configuration Centralisée des Liens Réseaux Sociaux & Assistance
 *
 * ℹ️ Modifiez ce fichier lorsque vous aurez vos identifiants définitifs :
 *    Tous les boutons de l'application (Web & Mobile) s'actualiseront instantanément.
 */

export const CONTACT_CONFIG = {
  /** Numéro WhatsApp de support (Format international sans espace ni '+' pour wa.me) */
  whatsappPhone: "2250700000000",

  /** Message d'accueil pré-rempli sur WhatsApp */
  whatsappDefaultMessage: "Bonjour l'Équipe SIGNA-CI, j'ai besoin d'une assistance concernant un signalement.",

  /** Lien direct de discussion WhatsApp (Ouvre l'app mobile ou WhatsApp Web automatiquement) */
  get whatsappChatUrl() {
    return `https://wa.me/${this.whatsappPhone}?text=${encodeURIComponent(this.whatsappDefaultMessage)}`;
  },

  /** Lien de la Chaîne / Canal Officiel WhatsApp SIGNA (diffusion d'alertes) */
  whatsappChannelUrl: "https://whatsapp.com/channel/0029Vsignaci_placeholder",

  /** Page Facebook officielle */
  facebookPageUrl: "https://www.facebook.com/signa.ci",

  /** Groupe Facebook d'entraide communautaire */
  facebookGroupUrl: "https://www.facebook.com/groups/signa.ci",

  /** Email support officiel */
  emailSupport: "contact@signa.ci",
};

/** Alias pour rétrocompatibilité */
export const SOCIAL_LINKS = {
  whatsapp: CONTACT_CONFIG.whatsappChatUrl,
  whatsappChannel: CONTACT_CONFIG.whatsappChannelUrl,
  facebook: CONTACT_CONFIG.facebookPageUrl,
  facebookGroup: CONTACT_CONFIG.facebookGroupUrl,
  email: CONTACT_CONFIG.emailSupport,
} as const;
