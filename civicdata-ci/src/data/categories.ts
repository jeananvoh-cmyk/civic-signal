export interface CategoryOption {
  id: string;
  name: string;
  badgeClass: string;
  iconName: string;
  description: string;
}

export const CATEGORIES: CategoryOption[] = [
  {
    id: 'ALL',
    name: 'Toutes les catégories',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    iconName: 'LayoutGrid',
    description: 'Ensemble des 4 354 projets et dotations d\'investissements',
  },
  {
    id: 'Éducation',
    name: 'Éducation',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    iconName: 'GraduationCap',
    description: 'Écoles primaires, collèges de proximité, lycées, cantines, tables-bancs',
  },
  {
    id: 'Eau potable',
    name: 'Eau potable',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    iconName: 'Droplets',
    description: 'Forages solaires, hydraulique villageoise (HVA), châteaux d\'eau, adduction',
  },
  {
    id: 'Santé',
    name: 'Santé',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    iconName: 'HeartPulse',
    description: 'Dispensaires, maternités, centres de santé urbains et ruraux, ambulances',
  },
  {
    id: 'Jeunesse & Culture',
    name: 'Jeunesse & Culture',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    iconName: 'Trophy',
    description: 'Foyers polyvalents des jeunes, complexes sportifs, aires de jeux, bibliothèques',
  },
  {
    id: 'Administration & Services',
    name: 'Administration & Services',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    iconName: 'Building2',
    description: 'Hôtels de ville, sièges de conseils régionaux, matériel roulant (bulldozers, camions), informatique',
  },
  {
    id: 'Commerce & Économie',
    name: 'Commerce & Économie',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    iconName: 'Store',
    description: 'Marchés modernes, magasins de stockage, hangars, abattoirs municipaux, gares routières',
  },
  {
    id: 'Logement & Urbanisme',
    name: 'Logement & Urbanisme',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    iconName: 'Home',
    description: 'Logements sociaux, logements de maîtres/infirmiers, réhabilitations de bâtiments',
  },
  {
    id: 'Développement Local',
    name: 'Développement Local',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    iconName: 'TrendingUp',
    description: 'Provisions pour investissements communaux et régionaux, appui au développement',
  },
  {
    id: 'Infrastructures & Voirie',
    name: 'Infrastructures & Voirie',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    iconName: 'Car',
    description: 'Reprofilage lourd, bitumage, dalots, ponts, caniveaux de drainage',
  },
  {
    id: 'Énergie & Éclairage',
    name: 'Énergie & Éclairage',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    iconName: 'Zap',
    description: 'Extension réseau électrique, lampadaires solaires, transformateurs',
  },
  {
    id: 'Salubrité & Environnement',
    name: 'Salubrité & Environnement',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    iconName: 'Trash2',
    description: 'Gestion des déchets, reboisement, protection environnementale, curage',
  },
];

export function getCategoryBadgeClass(categoryName: string): string {
  return 'bg-slate-100 text-slate-800 border-slate-200 font-bold';
}

export function detectCategoryFromExpense(subNature: string, details: string): string {
  const text = `${subNature} ${details}`.toLowerCase();
  
  if (text.includes('santé') || text.includes('dispensaire') || text.includes('maternité') || text.includes('médical') || text.includes('hôpital') || text.includes('ambulance') || text.includes('pmi') || text.includes('therapeutique') || text.includes('biomédic')) {
    return 'Santé';
  }
  if (text.includes('école') || text.includes('classe') || text.includes('collège') || text.includes('lycée') || text.includes('enseignement') || text.includes('cantine') || text.includes('table-banc') || text.includes('maternelle') || text.includes('ifef') || text.includes('scolaire')) {
    return 'Éducation';
  }
  if (text.includes('eau') || text.includes('forage') || text.includes('hva') || text.includes('hydraulique') || text.includes('pompe') || text.includes('château d\'eau') || text.includes('adduction')) {
    return 'Eau potable';
  }
  if (text.includes('route') || text.includes('voie') || text.includes('reprofilage') || text.includes('dalot') || text.includes('bitum') || text.includes('transport') || text.includes('piste') || text.includes('gare') || text.includes('feu tricolore') || text.includes('caniveaux') || text.includes('drainage') || text.includes('buse')) {
    return 'Infrastructures & Voirie';
  }
  if (text.includes('éclairage') || text.includes('électrique') || text.includes('electrification') || text.includes('transformateur') || text.includes('poteau') || text.includes('solaire') || text.includes('énergie')) {
    return 'Énergie & Éclairage';
  }
  if (text.includes('marché') || text.includes('magasin') || text.includes('hangar') || text.includes('abattoir') || text.includes('commerce') || text.includes('entrepôt') || text.includes('distribution')) {
    return 'Commerce & Économie';
  }
  if (text.includes('logement') || text.includes('villa') || text.includes('maison') || text.includes('habitat') || text.includes('social') || text.includes('dortoir') || text.includes('orphelinat')) {
    return 'Logement & Urbanisme';
  }
  if (text.includes('culture') || text.includes('foyer') || text.includes('sport') || text.includes('stade') || text.includes('piscine') || text.includes('jeune') || text.includes('bibliothèque') || text.includes('clac') || text.includes('multimédia') || text.includes('loisir') || text.includes('jardin') || text.includes('radio')) {
    return 'Jeunesse & Culture';
  }
  if (text.includes('ordure') || text.includes('déchet') || text.includes('salubrité') || text.includes('environnement') || text.includes('reboisement') || text.includes('curage')) {
    return 'Salubrité & Environnement';
  }
  if (text.includes('provision') || text.includes('développement local') || text.includes('investissement')) {
    return 'Développement Local';
  }
  return 'Administration & Services';
}

