// Import commune logos from official municipal portals and public institutions
import aboboLogo from "@/assets/logos/abobo.png";
import adjameLogo from "@/assets/logos/adjame.png";
import attecoubeLogo from "@/assets/logos/attecoube.png";
import bingervilleLogo from "@/assets/logos/bingerville.png";
import cocodyLogo from "@/assets/logos/cocody.png";
import grandBassamLogo from "@/assets/logos/grand-bassam.png";
import koumassiLogo from "@/assets/logos/koumassi.png";
import marcoryLogo from "@/assets/logos/marcory.png";
import plateauLogo from "@/assets/logos/plateau.png";
import portBouetLogo from "@/assets/logos/port-bouet.png";
import yopougonLogo from "@/assets/logos/yopougon.png";
import abidjanDistrictLogo from "@/assets/logos/abidjan_district.png";

/**
 * Map commune name → official municipal logo import.
 * Only verified official municipal logos are mapped here.
 * Communes without an official logo file fall back to their official municipal color badge.
 */
export const COMMUNE_LOGOS: Record<string, string> = {
  "Abobo": aboboLogo,
  "Adjamé": adjameLogo,
  "Attécoubé": attecoubeLogo,
  "Bingerville": bingervilleLogo,
  "Cocody": cocodyLogo,
  "Grand-Bassam": grandBassamLogo,
  "Koumassi": koumassiLogo,
  "Marcory": marcoryLogo,
  "Plateau": plateauLogo,
  "Port-Bouët": portBouetLogo,
  "Yopougon": yopougonLogo,
};
