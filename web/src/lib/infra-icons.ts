// Infrastructure category icons — realistic illustrations
import electriciteIcon from "@/assets/electricity-icon.png";
import eauIcon from "@/assets/water-icon.png";
import lampadaireIcon from "@/assets/infra/lampadaire.jpg";
import poteauElectriqueIcon from "@/assets/infra/poteau-electrique.png";
import cieHazardIcon from "@/assets/infra/cie-danger.jpg";
import cieAutreIcon from "@/assets/infra/cie-autre.jpg";
import canalisationIcon from "@/assets/infra/canalisation-publique.jpg";
import fuiteEauIcon from "@/assets/infra/fuite-eau.png";
import sodeciAutreIcon from "@/assets/infra/eau-autre.jpg";
import voirieIcon from "@/assets/infra/voirie.png";
import caniveauIcon from "@/assets/infra/caniveau.png";
import trottoirIcon from "@/assets/infra/trottoir-endommage.jpg";
import depotOrduresIcon from "@/assets/infra/depot-ordures.jpg";
import mairieAutreIcon from "@/assets/infra/mairie-autre.jpg";

/** CIE infrastructure (lampadaires, poteaux, danger, transformateurs) */
export const INFRA_CIE_ICONS = {
  lampadaire: lampadaireIcon,
  poteau: poteauElectriqueIcon,
  danger: cieHazardIcon,
  autre: cieAutreIcon,
};

/** SODECI infrastructure (fuites, canalisations, compteurs) */
export const INFRA_SODECI_ICONS = {
  canalisation: canalisationIcon,
  fuite: fuiteEauIcon,
  autre: sodeciAutreIcon,
};

/** Mairie infrastructure (voirie, caniveaux, trottoirs, dépôts sauvages, travaux) */
export const INFRA_MAIRIE_ICONS = {
  voirie: voirieIcon,
  caniveau: caniveauIcon,
  trottoir: trottoirIcon,
  ordures: depotOrduresIcon,
  autre: mairieAutreIcon,
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
  electriciteIcon,
  eauIcon,
  lampadaireIcon,
  poteauElectriqueIcon,
  cieHazardIcon,
  cieAutreIcon,
  canalisationIcon,
  fuiteEauIcon,
  sodeciAutreIcon,
  voirieIcon,
  caniveauIcon,
  trottoirIcon,
  depotOrduresIcon,
  mairieAutreIcon,
};
