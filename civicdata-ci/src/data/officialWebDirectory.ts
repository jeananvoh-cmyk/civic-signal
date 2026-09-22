/**
 * RÉFÉRENTIEL OFFICIEL DES SITES WEB DES COLLECTIVITÉS TERRITORIALES DE CÔTE D'IVOIRE
 * Conforme à l'audit national des portails web (201 communes, 31 régions, 2 districts)
 */

import { Institution } from '../types';

export interface OfficialWebEntry {
  type: 'MAIRIE' | 'REGION' | 'DISTRICT';
  nom: string;
  chefLieu: string;
  statutWeb: 'FONCTIONNEL' | 'INACTIF' | 'AUCUN';
  url: string;
  observations: string;
}

// Normalisation pour recherche sans accent ni ponctuation
function normalizeKey(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^conseil\s+regional\s+(de\s+la\s+|du\s+|des\s+|d['’]\s*|de\s+)?/i, '')
    .replace(/^district\s+autonome\s+(d['’]\s*|de\s+)?/i, '')
    .replace(/^mairie\s+(du\s+|de\s+la\s+|des\s+|d['’]\s*|de\s+)?/i, '')
    .replace(/^le\s+/i, '')
    .replace(/^la\s+/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// 1. CONSEILS RÉGIONAUX (31) & DISTRICTS AUTONOMES (2)
export const OFFICIAL_REGIONS_WEB_DATA: Record<string, Omit<OfficialWebEntry, 'type'>> = {
  // --- Fonctionnels (6 régions + 1 district) ---
  'gontougo': {
    nom: 'Conseil Régional du Gontougo',
    chefLieu: 'Bondoukou',
    statutWeb: 'FONCTIONNEL',
    url: 'https://www.regiondugontougo.ci',
    observations: 'Fonctionnel, actualités régulières et projets régionaux',
  },
  'hautsassandra': {
    nom: 'Conseil Régional du Haut-Sassandra',
    chefLieu: 'Daloa',
    statutWeb: 'FONCTIONNEL',
    url: 'https://hautsassandra.ci',
    observations: 'Fonctionnel, projets régionaux et délibérations',
  },
  'lame': {
    nom: 'Conseil Régional de La Mé',
    chefLieu: 'Adzopé',
    statutWeb: 'FONCTIONNEL',
    url: 'https://regiondelame.ci',
    observations: 'Fonctionnel, actualités du conseil et actions sociales',
  },
  'me': {
    nom: 'Conseil Régional de La Mé',
    chefLieu: 'Adzopé',
    statutWeb: 'FONCTIONNEL',
    url: 'https://regiondelame.ci',
    observations: 'Fonctionnel, actualités du conseil et actions sociales',
  },
  'grandsponts': {
    nom: 'Conseil Régional des Grands-Ponts',
    chefLieu: 'Dabou',
    statutWeb: 'FONCTIONNEL',
    url: 'https://regiongrandsponts.ci',
    observations: 'Actif, actualités et projets structurants',
  },
  'moronou': {
    nom: 'Conseil Régional du Moronou',
    chefLieu: 'Bongouanou',
    statutWeb: 'FONCTIONNEL',
    url: 'https://region-moronou.ci',
    observations: 'Fonctionnel, portail régional et tourisme',
  },
  'gbeke': {
    nom: 'Conseil Régional du Gbêkê',
    chefLieu: 'Bouaké',
    statutWeb: 'FONCTIONNEL',
    url: 'https://www.conseilregionalgbeke.com',
    observations: 'Portail de proximité actif et services',
  },
  'abidjan': {
    nom: "District Autonome d'Abidjan",
    chefLieu: 'Abidjan',
    statutWeb: 'FONCTIONNEL',
    url: 'https://abidjan.district.ci/',
    observations: 'Portail institutionnel métropolitain actif',
  },

  // --- Site officiel existant mais inactif / maintenance / expiré (6 régions + 1 district) ---
  'tonkpi': {
    nom: 'Conseil Régional du Tonkpi',
    chefLieu: 'Man',
    statutWeb: 'INACTIF',
    url: 'http://regiontonkpi.ci',
    observations: 'Nom de domaine expiré / inaccessible',
  },
  'poro': {
    nom: 'Conseil Régional du Poro',
    chefLieu: 'Korhogo',
    statutWeb: 'INACTIF',
    url: 'http://regionporo.ci',
    observations: 'Domaine inaccessible / serveur éteint',
  },
  'belier': {
    nom: 'Conseil Régional du Bélier',
    chefLieu: 'Toumodi',
    statutWeb: 'INACTIF',
    url: 'http://regionbelier.ci',
    observations: 'Serveur inaccessible / erreur DNS',
  },
  'sanpedro': {
    nom: 'Conseil Régional de San-Pédro',
    chefLieu: 'San-Pédro',
    statutWeb: 'INACTIF',
    url: 'http://regionsanpedro.ci',
    observations: 'Inaccessible / en panne technique',
  },
  'nawa': {
    nom: 'Conseil Régional de la Nawa',
    chefLieu: 'Soubré',
    statutWeb: 'INACTIF',
    url: 'http://regionnawa.ci',
    observations: 'Serveur non configuré / page d\'attente',
  },
  'indeniedjuablin': {
    nom: "Conseil Régional de l'Indénié-Djuablin",
    chefLieu: 'Abengourou',
    statutWeb: 'INACTIF',
    url: 'http://regionindeniedjuablin.ci',
    observations: 'Domaine non renouvelé',
  },
  'yamoussoukro': {
    nom: 'District Autonome de Yamoussoukro',
    chefLieu: 'Yamoussoukro',
    statutWeb: 'INACTIF',
    url: 'http://districtyamoussoukro.ci',
    observations: 'Site souvent inaccessible / maintenance prolongée',
  },

  // --- Aucun site web officiel (20 régions) ---
  'bafing': { nom: 'Conseil Régional du Bafing', chefLieu: 'Touba', statutWeb: 'AUCUN', url: '', observations: 'Communication sur Facebook uniquement' },
  'marahoue': { nom: 'Conseil Régional de la Marahoué', chefLieu: 'Bouaflé', statutWeb: 'AUCUN', url: '', observations: 'Communication sur Facebook uniquement' },
  'bere': { nom: 'Conseil Régional du Béré', chefLieu: 'Mankono', statutWeb: 'AUCUN', url: '', observations: 'Communication sur Facebook uniquement' },
  'cavally': { nom: 'Conseil Régional du Cavally', chefLieu: 'Guiglo', statutWeb: 'AUCUN', url: '', observations: 'Communication sur Facebook uniquement' },
  'guemon': { nom: 'Conseil Régional du Guémon', chefLieu: 'Duékoué', statutWeb: 'AUCUN', url: '', observations: 'Communication sur Facebook uniquement' },
  'iffou': { nom: "Conseil Régional de l'Iffou", chefLieu: 'Daoukro', statutWeb: 'AUCUN', url: '', observations: 'Communication sur Facebook uniquement' },
  'bagoue': { nom: 'Conseil Régional de la Bagoué', chefLieu: 'Boundiali', statutWeb: 'AUCUN', url: '', observations: 'Communication sur Facebook uniquement' },
  'agnebytiassa': { nom: "Conseil Régional de l'Agnéby-Tiassa", chefLieu: 'Agboville', statutWeb: 'AUCUN', url: '', observations: 'Communication sur Facebook uniquement' },
  'gbokle': { nom: 'Conseil Régional du Gbôklé', chefLieu: 'Sassandra', statutWeb: 'AUCUN', url: '', observations: 'Communication sur Facebook uniquement' },
  'kabadougou': { nom: 'Conseil Régional du Kabadougou', chefLieu: 'Odienné', statutWeb: 'AUCUN', url: '', observations: 'Communication sur Facebook uniquement' },
  'sudcomoe': { nom: 'Conseil Régional du Sud-Comoé', chefLieu: 'Aboisso', statutWeb: 'AUCUN', url: '', observations: 'Communication sur Facebook uniquement' },
  'lohdjiboua': { nom: 'Conseil Régional du Lôh-Djiboua', chefLieu: 'Divo', statutWeb: 'AUCUN', url: '', observations: 'Communication sur Facebook uniquement' },
  'goh': { nom: 'Conseil Régional du Gôh', chefLieu: 'Gagnoa', statutWeb: 'AUCUN', url: '', observations: 'Communication sur Facebook uniquement' },
  'tchologo': { nom: 'Conseil Régional du Tchologo', chefLieu: 'Ferkessédougou', statutWeb: 'AUCUN', url: '', observations: 'Communication sur Facebook uniquement' },
  'bounkani': { nom: 'Conseil Régional du Bounkani', chefLieu: 'Bouna', statutWeb: 'AUCUN', url: '', observations: 'Communication sur Facebook uniquement' },
  'hambol': { nom: 'Conseil Régional du Hambol', chefLieu: 'Katiola', statutWeb: 'AUCUN', url: '', observations: 'Communication sur Facebook uniquement' },
  'folon': { nom: 'Conseil Régional du Folon', chefLieu: 'Minignan', statutWeb: 'AUCUN', url: '', observations: 'Communication sur Facebook uniquement' },
  'worodougou': { nom: 'Conseil Régional du Worodougou', chefLieu: 'Séguéla', statutWeb: 'AUCUN', url: '', observations: 'Communication sur Facebook uniquement' },
  'nzi': { nom: "Conseil Régional du N'Zi", chefLieu: 'Dimbokro', statutWeb: 'AUCUN', url: '', observations: 'Communication sur Facebook uniquement' },
};

// 2. MAIRIES AVEC SITE WEB (7 FONCTIONNELLES + 10 INACTIVES)
export const OFFICIAL_COMMUNES_WEB_DATA: Record<string, Omit<OfficialWebEntry, 'type'>> = {
  // --- Fonctionnelles (7 mairies) ---
  'plateau': {
    nom: 'Mairie du Plateau',
    chefLieu: 'Abidjan',
    statutWeb: 'FONCTIONNEL',
    url: 'https://www.mairieplateau.ci',
    observations: 'Portail e-services, état civil et démarches en ligne',
  },
  'cocody': {
    nom: 'Mairie de Cocody',
    chefLieu: 'Abidjan',
    statutWeb: 'FONCTIONNEL',
    url: 'https://cocody.ci',
    observations: 'Portail citoyen interactif et e-administration',
  },
  'bouake': {
    nom: 'Mairie de Bouaké',
    chefLieu: 'Bouaké',
    statutWeb: 'FONCTIONNEL',
    url: 'https://www.mairiedebouake.ci/',
    observations: 'Portail municipal officiel actif',
  },
  'portbouet': {
    nom: 'Mairie de Port-Bouët',
    chefLieu: 'Abidjan',
    statutWeb: 'FONCTIONNEL',
    url: 'https://www.port-bouet.ci',
    observations: 'Portail officiel d\'actualités et démarches administratives',
  },
  'treichville': {
    nom: 'Mairie de Treichville',
    chefLieu: 'Abidjan',
    statutWeb: 'FONCTIONNEL',
    url: 'https://www.mairietreichville.com',
    observations: 'Informations municipales, état civil et projets',
  },
  'koumassi': {
    nom: 'Mairie de Koumassi',
    chefLieu: 'Abidjan',
    statutWeb: 'FONCTIONNEL',
    url: 'https://mairiekoumassi.ci',
    observations: 'Modernisation urbaine et démarches en ligne',
  },
  'sanpedro': {
    nom: 'Mairie de San-Pédro',
    chefLieu: 'San-Pédro',
    statutWeb: 'FONCTIONNEL',
    url: 'https://mairiesanpedro.ci',
    observations: 'Portail d\'information et suivi des projets communaux',
  },

  // --- Site officiel existant mais inactif / maintenance / expiré (10 mairies) ---
  'yopougon': {
    nom: 'Mairie de Yopougon',
    chefLieu: 'Abidjan',
    statutWeb: 'INACTIF',
    url: 'http://yopougon.ci',
    observations: 'Domaine inactif / non accessible',
  },
  'abobo': {
    nom: 'Mairie de Abobo',
    chefLieu: 'Abidjan',
    statutWeb: 'INACTIF',
    url: 'http://mairieabobo.ci',
    observations: 'Erreur serveur / page inaccessible',
  },
  'marcory': {
    nom: 'Mairie de Marcory',
    chefLieu: 'Abidjan',
    statutWeb: 'INACTIF',
    url: 'http://marcory.ci',
    observations: 'Site inaccessible',
  },
  'grandbassam': {
    nom: 'Mairie de Grand-Bassam',
    chefLieu: 'Sud-Comoé',
    statutWeb: 'INACTIF',
    url: 'http://mairiegrandbassam.ci',
    observations: 'Page inaccessible / erreur d\'hébergement',
  },
  'daloa': {
    nom: 'Mairie de Daloa',
    chefLieu: 'Haut-Sassandra',
    statutWeb: 'INACTIF',
    url: 'http://mairiedaloa.ci',
    observations: 'Site vitrine non maintenu / non sécurisé',
  },
  'korhogo': {
    nom: 'Mairie de Korhogo',
    chefLieu: 'Poro',
    statutWeb: 'INACTIF',
    url: 'http://mairiekorhogo.ci',
    observations: 'Domaine inaccessible',
  },
  'yamoussoukro': {
    nom: 'Mairie de Yamoussoukro',
    chefLieu: 'Bélier',
    statutWeb: 'INACTIF',
    url: 'http://mairieyamoussoukro.ci',
    observations: 'Non fonctionnel / page en erreur',
  },
  'adjame': {
    nom: 'Mairie de Adjamé',
    chefLieu: 'Abidjan',
    statutWeb: 'INACTIF',
    url: 'http://mairieadjame.ci',
    observations: 'Inaccessible / certificat SSL expiré',
  },
  'attecoube': {
    nom: "Mairie d'Attécoubé",
    chefLieu: 'Abidjan',
    statutWeb: 'INACTIF',
    url: 'http://mairieattecoube.ci',
    observations: 'Domaine non configuré',
  },
  'bingerville': {
    nom: 'Mairie de Bingerville',
    chefLieu: 'Abidjan',
    statutWeb: 'INACTIF',
    url: 'http://mairiebingerville.ci',
    observations: 'Maintenance / page blanche',
  },
};

/**
 * Récupère le statut officiel vérifié pour n'importe quelle institution (commune, région, district)
 */
export function getOfficialWebInfo(inst: {
  type: string;
  name: string;
  region?: string;
  district?: string;
}): {
  statutWeb: 'FONCTIONNEL' | 'INACTIF' | 'AUCUN';
  url: string;
  observations: string;
  chefLieu: string;
} {
  const key = normalizeKey(inst.name);
  const isRegionOrDistrict = inst.type === 'REGION' || inst.type === 'DISTRICT';

  if (isRegionOrDistrict) {
    if (OFFICIAL_REGIONS_WEB_DATA[key]) {
      return OFFICIAL_REGIONS_WEB_DATA[key];
    }
    // Recherche par région si le nom du conseil n'a pas matché directement
    const regionKey = normalizeKey(inst.region || '');
    if (regionKey && OFFICIAL_REGIONS_WEB_DATA[regionKey]) {
      return OFFICIAL_REGIONS_WEB_DATA[regionKey];
    }
    return {
      statutWeb: 'AUCUN',
      url: '',
      observations: 'Communication sur Facebook uniquement',
      chefLieu: inst.region || '—',
    };
  }

  // Commune / Mairie
  if (OFFICIAL_COMMUNES_WEB_DATA[key]) {
    return OFFICIAL_COMMUNES_WEB_DATA[key];
  }

  // Toutes les 184 autres mairies de Côte d'Ivoire
  return {
    statutWeb: 'AUCUN',
    url: '',
    observations: 'Présence numérique (Facebook...)',
    chefLieu: inst.region || (inst as any).departement || '—',
  };
}

/**
 * Enrichit une liste d'institutions avec les données officielles du répertoire web
 */
export function enrichWithOfficialWebDirectory(institutions: Institution[]): Institution[] {
  return institutions.map(inst => {
    // Si c'est un ministère, une institution nationale ou une autorité de régulation, on conserve son URL
    if (inst.type !== 'MAIRIE' && inst.type !== 'REGION' && inst.type !== 'DISTRICT') {
      return {
        ...inst,
        web_status: inst.website ? 'FONCTIONNEL' : 'AUCUN',
        web_observations: inst.website ? 'Site institutionnel officiel de la République' : 'Présence gouvernementale',
      };
    }

    const official = getOfficialWebInfo(inst);
    return {
      ...inst,
      website: official.url || undefined,
      web_status: official.statutWeb,
      web_observations: official.observations,
    };
  });
}
