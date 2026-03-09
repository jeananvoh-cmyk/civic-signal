// Infrastructure category icons — realistic illustrations
import lampadaireIcon from "@/assets/infra/lampadaire.png";
import fuiteEauIcon from "@/assets/infra/fuite-eau.png";
import voirieIcon from "@/assets/infra/voirie.png";
import caniveauIcon from "@/assets/infra/caniveau.png";
import poteauElectriqueIcon from "@/assets/infra/poteau-electrique.png";

/** CIE infrastructure (lampadaires, poteaux) */
export const INFRA_CIE_ICONS = {
  lampadaire: lampadaireIcon,
  poteau: poteauElectriqueIcon,
};

/** SODECI infrastructure (fuites, canalisations) */
export const INFRA_SODECI_ICONS = {
  fuite: fuiteEauIcon,
};

/** Mairie infrastructure (voirie, caniveaux) */
export const INFRA_MAIRIE_ICONS = {
  voirie: voirieIcon,
  caniveau: caniveauIcon,
};

/**
 * Main icons per infrastructure filter category.
 * Use these as representative images in filters, markers, dashboards.
 */
export const INFRA_CATEGORY_ICONS = {
  cie: lampadaireIcon,
  sodeci: fuiteEauIcon,
  mairie: voirieIcon,
} as const;

export {
  lampadaireIcon,
  fuiteEauIcon,
  voirieIcon,
  caniveauIcon,
  poteauElectriqueIcon,
};
