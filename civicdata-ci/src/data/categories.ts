export interface CategoryOption {
  id: string;
  name: string;
  iconName: string;
  description: string;
}

export const CATEGORIES: CategoryOption[] = [
  {
    id: 'ALL',
    name: 'Toutes les catégories',
    iconName: 'LayoutGrid',
    description: 'Ensemble des projets et dotations d\'infrastructures',
  },
  {
    id: 'Sante',
    name: 'Santé & Maternités',
    iconName: 'HeartPulse',
    description: 'Dispensaires, maternités, centres de santé urbains et ruraux, biomédical',
  },
  {
    id: 'Education',
    name: 'Éducation & Écoles',
    iconName: 'GraduationCap',
    description: 'Écoles primaires, collèges de proximité, maternelles, cantines, tables-bancs',
  },
  {
    id: 'Eau',
    name: 'Eau & Hydraulique (HVA)',
    iconName: 'Droplets',
    description: 'Forages solaires, adduction d\'eau potable, châteaux d\'eau, pompes villageoises',
  },
  {
    id: 'Voirie',
    name: 'Voirie & Routes',
    iconName: 'Car',
    description: 'Reprofilage lourd, bitumage, dalots, ponts, caniveaux et feux tricolores',
  },
  {
    id: 'Energie',
    name: 'Électrification & Éclairage',
    iconName: 'Zap',
    description: 'Extension réseau électrique, lampadaires solaires, transformateurs',
  },
  {
    id: 'Marches',
    name: 'Marchés & Économie',
    iconName: 'Store',
    description: 'Marchés modernes, magasins, hangars, abattoirs municipaux, gares routières',
  },
  {
    id: 'Logement',
    name: 'Logement & Social',
    iconName: 'Home',
    description: 'Logements sociaux, logements de fonction (maîtres, infirmiers), centres sociaux',
  },
  {
    id: 'Culture',
    name: 'Culture & Sport',
    iconName: 'Trophy',
    description: 'Foyers polyvalents, complexes sportifs, piscines municipales, bibliothèques',
  },
  {
    id: 'Services',
    name: 'Services Municipaux & Sécurité',
    iconName: 'Building2',
    description: 'Hôtels de ville, commissariats, gendarmerie, engins techniques, salubrité',
  },
];

export function detectCategoryFromExpense(subNature: string, details: string): string {
  const text = `${subNature} ${details}`.toLowerCase();
  
  if (text.includes('santé') || text.includes('dispensaire') || text.includes('maternité') || text.includes('médical') || text.includes('hôpital') || text.includes('ambulance') || text.includes('pmi') || text.includes('therapeutique') || text.includes('biomédic')) {
    return 'Santé';
  }
  if (text.includes('école') || text.includes('classe') || text.includes('collège') || text.includes('lycée') || text.includes('enseignement') || text.includes('cantine') || text.includes('table-banc') || text.includes('maternelle') || text.includes('ifef') || text.includes('scolaire')) {
    return 'Éducation';
  }
  if (text.includes('eau') || text.includes('forage') || text.includes('hva') || text.includes('hydraulique') || text.includes('pompe') || text.includes('château d\'eau') || text.includes('adduction') || text.includes('caniveaux') || text.includes('eaux usées') || text.includes('drainage') || text.includes('buse')) {
    return 'Eau';
  }
  if (text.includes('route') || text.includes('voie') || text.includes('reprofilage') || text.includes('dalot') || text.includes('bitum') || text.includes('transport') || text.includes('piste') || text.includes('gare') || text.includes('feu tricolore') || text.includes('pavé')) {
    return 'Voirie';
  }
  if (text.includes('éclairage') || text.includes('électrique') || text.includes('electrification') || text.includes('transformateur') || text.includes('poteau') || text.includes('solaire') || text.includes('énergie')) {
    return 'Energie';
  }
  if (text.includes('marché') || text.includes('magasin') || text.includes('hangar') || text.includes('abattoir') || text.includes('commerce') || text.includes('entrepôt') || text.includes('distribution')) {
    return 'Marches';
  }
  if (text.includes('logement') || text.includes('villa') || text.includes('maison') || text.includes('habitat') || text.includes('social') || text.includes('dortoir') || text.includes('orphelinat')) {
    return 'Logement';
  }
  if (text.includes('culture') || text.includes('foyer') || text.includes('sport') || text.includes('stade') || text.includes('piscine') || text.includes('jeune') || text.includes('bibliothèque') || text.includes('clac') || text.includes('multimédia') || text.includes('loisir') || text.includes('jardin') || text.includes('radio')) {
    return 'Culture';
  }
  return 'Services';
}
