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
 * Map commune name → official logo import.
 * All 14 communes of Grand Abidjan have their official municipal logo or official District emblem.
 */
export const COMMUNE_LOGOS: Record<string, string> = {
  "Abobo": aboboLogo,
  "Adjamé": adjameLogo,
  "Anyama": abidjanDistrictLogo,
  "Attécoubé": attecoubeLogo,
  "Bingerville": bingervilleLogo,
  "Cocody": cocodyLogo,
  "Grand-Bassam": grandBassamLogo,
  "Koumassi": koumassiLogo,
  "Marcory": marcoryLogo,
  "Plateau": plateauLogo,
  "Port-Bouët": portBouetLogo,
  "Songon": abidjanDistrictLogo,
  "Treichville": abidjanDistrictLogo,
  "Yopougon": yopougonLogo,
};
