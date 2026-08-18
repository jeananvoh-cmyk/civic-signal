/**
 * Source de vérité des strings critiques de l'UI SIGNA·CI.
 * Toute modification de vocabulaire doit passer par ce fichier.
 *
 * Organisation :
 *  - RESOLUTION  : vocabulaire résolution outage vs infrastructure
 *  - EMPTY_STATES: messages d'état vide
 *  - TOASTS      : messages de confirmation/erreur
 *  - PUSH        : templates notifications push
 */

// ─── Vocabulaire de résolution ────────────────────────────────────────────────
// Règle : outage → "rétabli/coupé" · infrastructure → "réparé/persiste"

export const RESOLUTION = {
  outage: {
    resolvedCta: "C'est rétabli",
    ongoingCta: "Toujours coupé",
    dialogTitle: "Service rétabli",
    cardResolved: "Service rétabli",
    toastSuccess: (serviceType: string) =>
      serviceType === "electricity"
        ? "L'électricité est de retour."
        : "L'eau est de retour.",
  },
  infrastructure: {
    resolvedCta: "C'est réparé",
    ongoingCta: "Problème persiste",
    dialogTitle: "Problème résolu",
    cardResolved: "Problème résolu",
    toastSuccess: () => "Problème résolu. Merci pour le suivi.",
  },
} as const satisfies Record<string, {
  resolvedCta: string;
  ongoingCta: string;
  dialogTitle: string;
  cardResolved: string;
  toastSuccess: (serviceType: string) => string;
}>;

export type ReportCategory = keyof typeof RESOLUTION;

// ─── États vides ──────────────────────────────────────────────────────────────

export const EMPTY_STATES = {
  noActiveCrisis: "Tout va bien dans votre commune pour l'instant.",
  noActiveCrisisSubtitle: "Aucune coupure critique signalée.",
  noActiveReports: "Tout va bien pour l'instant",
  noActiveReportsSubtitle:
    "Aucune alerte active. Vous serez notifié dès qu'un voisin signale un problème dans votre quartier.",
  dashboardEmpty: "Aucune coupure active",
  dashboardEmptySubtitle:
    "Tout est normal pour le moment dans les 14 communes du Grand Abidjan. Les signalements apparaîtront ici en temps réel.",
} as const;

// ─── Toasts ───────────────────────────────────────────────────────────────────

export const TOASTS = {
  reportSubmitted: "Signalement envoyé",
  reportDeleted: "Signalement supprimé",
  reportRelaunched: "Signalement relancé.",
  corroborationAdded: "Corroboration ajoutée",
  networkError: "Impossible d'envoyer. Vérifiez votre connexion.",
  sessionExpired: "Votre session a expiré. Reconnectez-vous pour continuer.",
  offlineQueued: "Sauvegardé. Sera envoyé à la reconnexion.",
} as const;

// ─── Templates de notifications push ─────────────────────────────────────────
// Utilisés par la Edge Function send-push — titre + corps max 100 chars

export const PUSH = {
  newReport: {
    electricity: {
      title: "Coupure d'électricité dans votre quartier",
      body: "Vos voisins signalent une coupure CIE. Confirmez si vous êtes aussi concerné(e).",
    },
    water: {
      title: "Coupure d'eau dans votre quartier",
      body: "Vos voisins signalent une coupure SODECI. Confirmez si vous êtes aussi concerné(e).",
    },
    infrastructure: {
      title: "Problème d'infrastructure signalé",
      body: "Vos voisins signalent un problème. Soutenez leur demande de réparation.",
    },
  },
  corroborationReceived: {
    title: "Votre signalement est confirmé",
    body: (count: number) =>
      `${count} voisin${count > 1 ? "s" : ""} ${count > 1 ? "ont confirmé" : "a confirmé"} votre signalement.`,
  },
  reportResolved: {
    electricity: {
      title: "L'électricité est rétablie",
      body: "La coupure que vous avez signalée est résolue.",
    },
    water: {
      title: "L'eau est rétablie",
      body: "La coupure que vous avez signalée est résolue.",
    },
    infrastructure: {
      title: "Problème résolu",
      body: "La réparation que vous avez demandée a été effectuée.",
    },
  },
} as const;
