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

/**
 * Renvoie l'image d'illustration officielle correspondant au type de panne/infrastructure
 */
export function getInfraIllustration(serviceType?: string, description?: string): string {
  const desc = (description || "").toLowerCase();
  const sType = (serviceType || "").toLowerCase();

  // 1. Détection fine par mots-clés dans la description
  if (desc.includes("lampadaire") || desc.includes("éclairage") || desc.includes("eclairage")) {
    return lampadaireIcon;
  }
  if (desc.includes("poteau") || desc.includes("pylone") || desc.includes("pylône") || desc.includes("câble") || desc.includes("cable")) {
    return poteauElectriqueIcon;
  }
  if (desc.includes("danger") || desc.includes("étincelle") || desc.includes("court-circuit") || desc.includes("transformateur")) {
    return cieHazardIcon;
  }
  if (desc.includes("fuite") || desc.includes("tuyau") || desc.includes("geyser") || desc.includes("inondation")) {
    return fuiteEauIcon;
  }
  if (desc.includes("canalisation") || desc.includes("conduite")) {
    return canalisationIcon;
  }
  if (desc.includes("caniveau") || desc.includes("drainage") || desc.includes("bouché") || desc.includes("bouche d'égout")) {
    return caniveauIcon;
  }
  if (desc.includes("nid de poule") || desc.includes("nids-de-poule") || desc.includes("chaussée") || desc.includes("chaussee") || desc.includes("bitume") || desc.includes("route")) {
    return voirieIcon;
  }
  if (desc.includes("trottoir") || desc.includes("pavé") || desc.includes("dalle")) {
    return trottoirIcon;
  }
  if (desc.includes("ordure") || desc.includes("déchet") || desc.includes("dechet") || desc.includes("dépôt") || desc.includes("depot") || desc.includes("salubrité") || desc.includes("salubrite") || desc.includes("poubelle")) {
    return depotOrduresIcon;
  }

  // 2. Repli par type de service
  if (sType === "electricity") return lampadaireIcon;
  if (sType === "water") return fuiteEauIcon;
  if (sType === "voirie" || sType === "mairie" || sType === "infrastructure") return voirieIcon;

  return mairieAutreIcon;
}

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
