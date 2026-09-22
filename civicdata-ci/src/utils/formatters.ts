// Formatting utilities for Ivorian Civic Tech platform
import { Institution } from '../types';

/**
 * Format an amount in FCFA with proper spacing (e.g., 40 000 000 FCFA)
 */
export function formatFCFA(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0 FCFA';
  }
  const formatted = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted.replace(/\u202F/g, ' ')} FCFA`;
}

/**
 * Format a large amount in Millions or Billions FCFA for badges and statistics
 */
export function formatCompactFCFA(amount: number): string {
  if (amount >= 1_000_000_000) {
    const milliards = (amount / 1_000_000_000).toFixed(1).replace('.', ',');
    return `${milliards} Milliards FCFA`;
  }
  if (amount >= 1_000_000) {
    const millions = (amount / 1_000_000).toFixed(0);
    return `${millions} Millions FCFA`;
  }
  return formatFCFA(amount);
}

/**
 * Format an amount in human words in French (e.g. "98 Milliards", "4,9 Milliards", "700 Millions", "542,56 Millions")
 */
export function formatAmountInWords(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined || amount === 0) {
    return '0 FCFA';
  }
  if (amount >= 1_000_000_000) {
    const val = (amount / 1_000_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
    return `${val}\u00A0Milliard${amount >= 2_000_000_000 ? 's' : ''}`;
  }
  if (amount >= 1_000_000) {
    const val = (amount / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
    return `${val}\u00A0Million${amount >= 2_000_000 ? 's' : ''}`;
  }
  if (amount >= 1_000) {
    const val = (amount / 1_000).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
    return `${val}\u00A0Mille`;
  }
  return `${amount}`;
}

/**
 * Format full FCFA with human words in parentheses (e.g., "98 000 000 000 FCFA (98 Milliards)")
 */
export function formatFCFAWithWords(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined || amount === 0) {
    return '0 FCFA';
  }
  const formattedNumber = formatFCFA(amount);
  const words = formatAmountInWords(amount);
  return `${formattedNumber} (${words})`;
}

/**
 * Format a date into clean French format (e.g., 14 février 2026)
 */
export function formatDateFR(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Get visual badge colors and labels for project status
 */
export function getStatusConfig(status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED') {
  switch (status) {
    case 'NOT_STARTED':
      return {
        label: 'Voté au Budget',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 font-bold',
        dotClass: 'bg-slate-400',
        icon: '',
        progressColor: 'bg-slate-400',
      };
    case 'IN_PROGRESS':
      return {
        label: 'En cours',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 font-bold',
        dotClass: 'bg-amber-500',
        icon: '',
        progressColor: 'bg-amber-500',
      };
    case 'COMPLETED':
      return {
        label: 'Terminé / Livré',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold',
        dotClass: 'bg-emerald-500',
        icon: '',
        progressColor: 'bg-emerald-500',
      };
    default:
      return {
        label: 'Voté au Budget',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 font-bold',
        dotClass: 'bg-slate-400',
        icon: '',
        progressColor: 'bg-slate-400',
      };
  }
}

/**
 * Identify the entity in charge (Mairie, Conseil Régional, Ministère, District) and clean location
 */
export function getProjectEntityInfo(commune_name?: string, region_name?: string, ministry_name?: string): {
  entityType: 'MAIRIE' | 'REGION' | 'MINISTERE' | 'DISTRICT';
  entityName: string;
  entityBadgeClass: string;
  locationLabel: string;
} {
  if (ministry_name) {
    const cleanMin = ministry_name.replace(/^(Ministère d'Etat, |Ministère Délégué auprès du Premier Ministre, )?/i, '').trim();
    return {
      entityType: 'MINISTERE',
      entityName: cleanMin,
      entityBadgeClass: 'bg-slate-100 text-slate-800 border-slate-200/90 font-bold',
      locationLabel: 'Envergure Nationale',
    };
  }

  const com = commune_name?.trim() || '';
  const reg = region_name?.trim() || '';
  const comLower = com.toLowerCase();
  const regLower = reg.toLowerCase();

  // 1. Regional Council
  if (comLower.startsWith('conseil r') || comLower.startsWith('region') || comLower.startsWith('région')) {
    const cleanReg = reg || com.replace(/^(conseil r[ée]gional (du |de la |des |de |d')?|r[ée]gion (du |de la |des |de |d')?)/i, '').trim();
    return {
      entityType: 'REGION',
      entityName: `Conseil Régional ${cleanReg}`,
      entityBadgeClass: 'bg-slate-100 text-slate-800 border-slate-200/90 font-bold',
      locationLabel: `Région ${cleanReg}`,
    };
  }

  // 2. Autonomous District
  if (comLower.startsWith('district') || regLower.startsWith('district')) {
    const cleanDist = com.replace(/^district autonome (du |de la |des |de |d')?/i, '').trim() || reg;
    return {
      entityType: 'DISTRICT',
      entityName: `District Autonome ${cleanDist}`,
      entityBadgeClass: 'bg-slate-100 text-slate-800 border-slate-200/90 font-bold',
      locationLabel: cleanDist,
    };
  }

  // 3. Ministry
  if (comLower.startsWith('minist')) {
    return {
      entityType: 'MINISTERE',
      entityName: com,
      entityBadgeClass: 'bg-slate-100 text-slate-800 border-slate-200/90 font-bold',
      locationLabel: reg ? `Région ${reg}` : 'National',
    };
  }

  // 4. Mairie / Commune
  const cleanCom = com.replace(/^mairie (du |de la |des |de |d')?/i, '').trim();
  return {
    entityType: 'MAIRIE',
    entityName: `Mairie de ${cleanCom}`,
    entityBadgeClass: 'bg-slate-100 text-slate-800 border-slate-200/90 font-bold',
    locationLabel: reg ? `${cleanCom} (${reg})` : cleanCom,
  };
}

export type ProjectTier = 'MUNICIPAL' | 'REGIONAL' | 'STATE';

export function getProjectTier(project: {
  id?: string;
  project_tier?: 'MUNICIPAL' | 'REGIONAL' | 'STATE';
  institution_name?: string;
  commune_name?: string;
  region_name?: string;
  scope_level?: string;
  ministry_name?: string;
  master_builder?: string;
}): ProjectTier {
  if (project.project_tier) return project.project_tier;
  
  const master = (project.master_builder || '').toLowerCase();
  if (master.includes('mairie')) return 'MUNICIPAL';
  if (master.includes('conseil r')) return 'REGIONAL';

  const id = project.id || '';
  if (id.startsWith('proj-com-') || id.startsWith('proj-bouake-')) return 'MUNICIPAL';
  if (id.startsWith('proj-reg-')) return 'REGIONAL';

  const inst = (project.institution_name || '').toLowerCase();
  const com = (project.commune_name || '').toLowerCase();
  
  if (inst.startsWith('mairie') || com.startsWith('mairie')) return 'MUNICIPAL';
  if (inst.includes('conseil r') || com.startsWith('conseil r')) return 'REGIONAL';

  if (project.scope_level === 'LOCAL') {
    return 'MUNICIPAL';
  }

  return 'STATE';
}

export function getProjectTierBadge(tier: ProjectTier): {
  label: string;
  shortLabel: string;
  icon: string;
  badgeClass: string;
  fullLabel: string;
  borderClass: string;
  accentColor: string;
} {
  switch (tier) {
    case 'MUNICIPAL':
      return {
        label: 'Projet Municipal',
        shortLabel: 'Municipal',
        icon: '',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-black',
        fullLabel: 'Grand Projet Municipal',
        borderClass: 'border-emerald-200',
        accentColor: 'text-emerald-700',
      };
    case 'REGIONAL':
      return {
        label: 'Conseil Régional',
        shortLabel: 'Régional',
        icon: '',
        badgeClass: 'bg-purple-50 text-purple-800 border-purple-300 font-black',
        fullLabel: 'Conseil Régional',
        borderClass: 'border-purple-200',
        accentColor: 'text-purple-700',
      };
    case 'STATE':
    default:
      return {
        label: "Investissement de l'État",
        shortLabel: 'État Central',
        icon: '',
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-300 font-black',
        fullLabel: "Investissement de l'État Central",
        borderClass: 'border-sky-200',
        accentColor: 'text-sky-700',
      };
  }
}


export interface ProjectTypeActionInfo {
  badge: string;
  heading: string;
  description: string;
  photoBtnText: string;
  shareCategoryLabel: string;
}

/**
 * Determine dynamic citizen action text adapting to project nature and scope level (Grands Chantiers d'État vs Projets Locaux)
 */
export function getProjectTypeActionInfo(title: string, category?: string, scopeLevel?: string): ProjectTypeActionInfo {
  const t = (title || '').toLowerCase();
  const isNational = scopeLevel === 'NATIONAL';
  
  // 1. Acquisition / Achat / Fourniture / Équipements / Véhicules
  if (
    t.includes('acquisition') || 
    t.includes('achat') || 
    t.includes('fourniture') || 
    t.includes('dotation en matériel') || 
    t.includes('équipement') || 
    t.includes('equipement') || 
    t.includes('matériel') || 
    t.includes('materiel') || 
    t.includes('véhicule') || 
    t.includes('vehicule') ||
    t.includes('buldozer') ||
    t.includes('chargeuse') ||
    t.includes('compacteur') ||
    t.includes('niveleuse') ||
    t.includes('porte-char') ||
    t.includes('camion') ||
    t.includes('ambulance') ||
    t.includes('table-banc') ||
    t.includes('tables-bancs') ||
    t.includes('motocyclette') ||
    t.includes('ordinateur') ||
    t.includes('scanner')
  ) {
    return {
      badge: isNational ? "Suivi des Équipements de l'État" : "Suivi des Équipements & Acquisitions",
      heading: isNational 
        ? "Participez au Suivi de cette Acquisition Nationale" 
        : "Participez au Suivi de cette Acquisition Publique",
      description: isNational
        ? "Contribuez à la transparence de l'État : vérifiez la livraison et la mise en service effective des équipements, demandez les pièces justificatives (CAIDP) ou informez les citoyens."
        : "Contribuez à la transparence : vérifiez la livraison et l'état effectif des équipements, demandez les pièces contractuelles en vertu de la Loi n°2013-867 (CAIDP) ou informez les citoyens.",
      photoBtnText: "Photo du matériel reçu",
      shareCategoryLabel: isNational ? "ACQUISITION NATIONALE" : "ACQUISITION PUBLIQUE"
    };
  }

  // 2. Programme / Projet d'appui / Étude / Formation / Sensibilisation / Plan
  if (
    t.includes('programme') || 
    t.includes('étude') || 
    t.includes('etude') || 
    t.includes('formation') || 
    t.includes('appui') || 
    t.includes('sensibilisation') || 
    t.includes('renforcement') || 
    t.includes('campagne') || 
    t.includes('plan de') ||
    t.includes('stratégie') ||
    t.includes('assistance')
  ) {
    return {
      badge: isNational ? "Suivi des Programmes Nationaux" : "Suivi des Programmes & Activités",
      heading: isNational 
        ? "Participez au Suivi de ce Programme National" 
        : "Participez au Suivi de ce Programme Public",
      description: isNational
        ? "Contribuez à la transparence publique : suivez le déploiement effectif des activités du programme national, demandez les rapports publics en vertu de la Loi n°2013-867 (CAIDP) ou mobilisez les bénéficiaires."
        : "Contribuez à la transparence : suivez le déploiement effectif des activités, demandez les rapports publics en vertu de la Loi n°2013-867 (CAIDP) ou mobilisez les bénéficiaires.",
      photoBtnText: "Photo / Preuve d'activité",
      shareCategoryLabel: isNational ? "PROGRAMME NATIONAL" : "PROGRAMME PUBLIC"
    };
  }

  // 3. Subvention / Dotation / Fonds / Transfert
  if (
    t.includes('subvention') || 
    t.includes('dotation') || 
    t.includes('fonds') || 
    t.includes('transfert') || 
    t.includes('indemnité') || 
    t.includes('indemnite') ||
    t.includes('aide aux') ||
    t.includes('prise en charge')
  ) {
    return {
      badge: isNational ? "Suivi des Dotations de l'État" : "Suivi des Dotations & Aides Publiques",
      heading: isNational 
        ? "Participez au Suivi de cette Dotation d'État" 
        : "Participez au Suivi de cette Dotation Publique",
      description: "Contribuez à la transparence : vérifiez la bonne affectation des fonds alloués, demandez les états financiers en vertu de la Loi n°2013-867 (CAIDP) ou mobilisez les usagers.",
      photoBtnText: "Preuve de versement / reçu",
      shareCategoryLabel: isNational ? "DOTATION D'ÉTAT" : "DOTATION PUBLIQUE"
    };
  }

  // 4. Entretien / Maintenance / Curage / Reprofilage
  if (
    t.includes('entretien') || 
    t.includes('maintenance') || 
    t.includes('curage') || 
    t.includes('reprofilage') || 
    t.includes('nettoyage') || 
    t.includes('désensablement') ||
    t.includes('vidange')
  ) {
    return {
      badge: isNational ? "Entretien des Infrastructures Nationales" : "Suivi des Travaux d'Entretien",
      heading: isNational 
        ? "Participez au Suivi de cet Entretien National" 
        : "Participez au Suivi de ces Travaux d'Entretien",
      description: "Contribuez à la transparence : envoyez un constat de l'état des voies ou réseaux entretenus, demandez le cahier des charges en vertu de la Loi n°2013-867 (CAIDP) ou mobilisez les riverains.",
      photoBtnText: "Photo des travaux d'entretien",
      shareCategoryLabel: isNational ? "ENTRETIEN NATIONAL" : "TRAVAUX D'ENTRETIEN"
    };
  }

  // 5. Default : Chantier / Construction / Réhabilitation / Travaux d'infrastructure
  return {
    badge: isNational ? "Grand Chantier de l'État (BTP & Infrastructures)" : "Actions Citoyennes & Droits d'Accès Public",
    heading: isNational 
      ? "Participez au Suivi de ce Grand Chantier de l'État" 
      : "Participez au Suivi de ce Chantier Public",
    description: isNational
      ? "Contribuez au contrôle citoyen : envoyez vos photos d'avancement du chantier, demandez les pièces du marché public en vertu de la Loi n°2013-867 (CAIDP) ou informez les usagers."
      : "Contribuez à la transparence : envoyez un constat de terrain, demandez les pièces contractuelles en vertu de la Loi n°2013-867 (CAIDP) ou mobilisez les riverains.",
    photoBtnText: isNational ? "Photo d'avancement du chantier" : "Envoyer photo terrain",
    shareCategoryLabel: isNational ? "GRAND CHANTIER DE L'ÉTAT" : "CHANTIER PUBLIC"
  };
}

/**
 * Calculate the percentage of contractual time elapsed based on start date and duration in months.
 * Compares with today's date dynamically.
 * Returns an object with percentage, overdue flag, days elapsed, and estimated delivery date.
 */
export function calculateContractualElapsedPercentage(startDateStr?: string, durationMonths?: number): {
  percent: number;
  rawPercent: number;
  isOverdue: boolean;
  daysRemaining: number;
  daysElapsed: number;
  totalDays: number;
  formattedTargetDate: string;
} {
  if (!startDateStr || !durationMonths || durationMonths <= 0) {
    return {
      percent: 0,
      rawPercent: 0,
      isOverdue: false,
      daysRemaining: 0,
      daysElapsed: 0,
      totalDays: 0,
      formattedTargetDate: ''
    };
  }

  let startTimestamp = Date.parse(startDateStr);
  if (isNaN(startTimestamp)) {
    // Try French month parsing (e.g. "Août 2021", "Mars 2024")
    const frMonths: Record<string, number> = {
      janvier: 0, fevrier: 1, 'février': 1, mars: 2, avril: 3, mai: 4, juin: 5,
      juillet: 6, aout: 7, 'août': 7, septembre: 8, octobre: 9, novembre: 10, decembre: 11, 'décembre': 11
    };
    const parts = startDateStr.toLowerCase().split(/[\s-]+/);
    if (parts.length >= 2) {
      const m = frMonths[parts[0]];
      const y = parseInt(parts[1], 10);
      if (m !== undefined && !isNaN(y)) {
        startTimestamp = new Date(y, m, 1).getTime();
      }
    }
  }

  if (isNaN(startTimestamp)) {
    return {
      percent: 0,
      rawPercent: 0,
      isOverdue: false,
      daysRemaining: 0,
      daysElapsed: 0,
      totalDays: 0,
      formattedTargetDate: ''
    };
  }

  const startDate = new Date(startTimestamp);
  const now = new Date();
  
  const totalDays = Math.max(1, Math.round(durationMonths * 30.4375));
  const targetDate = new Date(startDate.getTime() + totalDays * 24 * 60 * 60 * 1000);
  
  const elapsedMillis = now.getTime() - startDate.getTime();
  const daysElapsed = Math.max(0, Math.round(elapsedMillis / (24 * 60 * 60 * 1000)));
  const daysRemaining = Math.max(0, Math.round((targetDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
  
  const rawPercent = Math.round((daysElapsed / totalDays) * 100);
  const percent = Math.min(100, Math.max(0, rawPercent));
  const isOverdue = now.getTime() > targetDate.getTime();
  
  const formattedTargetDate = targetDate.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric'
  });

  return {
    percent,
    rawPercent,
    isOverdue,
    daysRemaining,
    daysElapsed,
    totalDays,
    formattedTargetDate
  };
}

/**
 * Normalized gender lookup for institutional leaders (Presidents of Regional Councils, Mayors, Ministers)
 * Grounded in Loi n°2019-870 and official CEI election results.
 */
const FEMALE_REGION_LEADER_KEYWORDS = [
  'OULOTO', // Anne Désirée Ouloto (Cavally)
  'AKA AMANAN', // Véronique Aka (Moronou)
];

const FEMALE_COMMUNE_IDS = new Set([
  'inst-com-abobo', // KAMISSOKO KANDIA
  'inst-com-adzope', 'inst-com-adzoppe', // ATSE BAH FLORENCE SOSTERNE EPSE ACHI
  'inst-com-anoumaba', // ASSOUMOU YAH BEATRICE
  'inst-com-anyama', // BAMBA FATIMA
  'inst-com-arrah', // KOUAME BADOU HARLETTE
  'inst-com-bako', // KONE MABANA DITE JOSEPHINE EPSE FANY
  'inst-com-bodokro', // ATSE AKISSI ALICE
  'inst-com-boundiali', // KONE MARIATOU
  'inst-com-djibrosso', // DIOMANDE SALIMATA
  'inst-com-duekoue', // FLANIZARA TOURE
  'inst-com-gbeleban', // OUATTARA AISSIATA
  'inst-com-gohitafla', // ZAMBLE NAYA NAOMI JARVIS
  'inst-com-grand-zattry', // SERI HORTENSE EMMA
  'inst-com-gueyo', // BONI TANO N'GUESSAN NOELLE MARIE
  'inst-com-guiberoua', // ZEZE SOUASSOU NICOLE PRINCESSE GOHOUROU
  'inst-com-guitry', // KOKO PATRICIA SYLVIE EPSE YAO
  'inst-com-logouale', // OUEHI FEH BIAYO GISELE EPSE KOFFI
  'inst-com-mayo', // BAFLAN LAURE EPSE DONWAHI
  'inst-com-odienne', // TOURE NASSENEBA
  'inst-com-rubino', // KOUASSI MARIE VIRGINIE
  'inst-com-san-pedro', // KEITA EPSE CISSE NAKARIDJA
  'inst-com-satama-sokoro', // FOFANA ALIMATA EPSE COULIBALY
  'inst-com-seguela', // BAMBA MAFERIMA FOUETE EPSE M'BAHIA
  'inst-com-seguelon', // KONE MATOGOMA
  'inst-com-tiemelekro' // KOUADIO KENDRICHE TANIA SAMIRA EMMANUELLA
]);

const FEMALE_MAYOR_NAME_KEYWORDS = [
  'KAMISSOKO KANDIA', 'FLORENCE SOSTERNE', 'YAH BEATRICE', 'BAMBA FATIMA',
  'BADOU HARLETTE', 'JOSEPHINE EPSE FANY', 'AKISSI ALICE', 'KONE MARIATOU',
  'DIOMANDE SALIMATA', 'FLANIZARA TOURE', 'OUATTARA AISSIATA', 'NAYA NAOMI',
  'HORTENSE EMMA', 'NOELLE MARIE', 'PRINCESSE GOHOUROU', 'PATRICIA SYLVIE',
  'FEH BIAYO GISELE', 'LAURE EPSE DONWAHI', 'TOURE NASSENEBA', 'MARIE VIRGINIE',
  'NAKARIDJA', 'ALIMATA EPSE COULIBALY', 'MAFERIMA FOUETE', 'KONE MATOGOMA',
  'SAMIRA EMMANUELLA'
];

export function getInstitutionLeaderGender(inst: Institution): 'M' | 'F' {
  if (inst.leader_gender) {
    return inst.leader_gender;
  }

  const leaderUpper = (inst.leader_name || '').toUpperCase();

  if (inst.type === 'REGION' || inst.type === 'DISTRICT') {
    if (FEMALE_REGION_LEADER_KEYWORDS.some(kw => leaderUpper.includes(kw))) {
      return 'F';
    }
    return 'M';
  }

  if (inst.type === 'MAIRIE') {
    if (FEMALE_COMMUNE_IDS.has(inst.id)) {
      return 'F';
    }
    if (FEMALE_MAYOR_NAME_KEYWORDS.some(kw => leaderUpper.includes(kw))) {
      return 'F';
    }
    return 'M';
  }

  return 'M';
}
