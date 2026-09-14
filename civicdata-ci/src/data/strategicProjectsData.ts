export interface StrategicProject {
  id: string;
  title: string;
  subtitle: string;
  sector: 'Routes & Voiries' | 'Santé' | 'Éducation' | 'Transport & Mobilité' | 'Énergie & Eau';
  region: string;
  budgetFCFA: number;
  budgetFormatted: string;
  fundingSource: string;
  contractor: string;
  contractorRole?: string;
  delegatedAuthority: string;
  supervisingEntity: string;
  auditOffice: string;
  startDate: string;
  contractualDurationMonths: number;
  estimatedCompletionDate: string;
  physicalProgressPercent: number;
  contractualElapsedPercent: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CRITICAL_DELAY' | 'STARTING';
  statusLabel: string;
  keyImpact: string;
  photos: {
    url: string;
    caption: string;
    detail: string;
  }[];
  investigativeTestimony?: {
    author: string;
    role: string;
    quote: string;
    sourceUrl?: string;
    sourceLabel?: string;
  };
  budgetProjectId?: string;
  confirmationsCount: number;
}

export const STRATEGIC_PROJECTS_LIST: StrategicProject[] = [
  {
    id: 'proj-infra-seguela-touba-104mrd',
    title: 'Axe Séguéla - Sifié - Touba (126 km) & Pont sur le fleuve Sassandra',
    subtitle: 'Désenclavement interrégional direct Worodougou - Bafing',
    sector: 'Routes & Voiries',
    region: 'Worodougou & Bafing',
    budgetFCFA: 104700000000,
    budgetFormatted: '104,7 Milliards FCFA',
    fundingSource: '100% Trésor Public (Fonds Propres)',
    contractor: 'PORTEO BTP',
    contractorRole: 'Adjudicataire principal des travaux de terrassement et bitumage',
    delegatedAuthority: 'AGEROUTE',
    supervisingEntity: 'Ministère de l\'Équipement et de l\'Entretien Routier',
    auditOffice: 'Cabinet 2HCI',
    startDate: 'Août 2021',
    contractualDurationMonths: 42,
    estimatedCompletionDate: 'Fin 2025 / Début 2026',
    physicalProgressPercent: 80.4,
    contractualElapsedPercent: 95.0,
    status: 'IN_PROGRESS',
    statusLabel: 'En cours (Phase de finition • ~80%)',
    keyImpact: '305 km évités (126 km direct vs 431 km via Daloa/Man) • Franchissement pérenne du Sassandra',
    photos: [
      {
        url: '/images/seguela_touba_route_1.png',
        caption: 'Tapis d\'enrobé bitumineux & marquage au sol',
        detail: 'Vue sur la nouvelle chaussée bitumée 2x1 voie reliant Séguéla à Sifié'
      },
      {
        url: '/images/seguela_touba_route_2.png',
        caption: 'Tracé routier & traversée interrégionale',
        detail: 'Désenclavement de l\'axe Séguéla - Sifié - Touba avec accotements stabilisés'
      }
    ],
    investigativeTestimony: {
      author: 'André Silver Konan',
      role: 'Journaliste d\'investigation',
      quote: 'Sur le terrain, le désenclavement est une réalité tangible : le bitume relie désormais Séguéla à Touba avec le nouveau pont sur le Sassandra. Les usagers évitent le détour historique de plus de 300 km.',
      sourceUrl: 'https://web.facebook.com/share/p/1BaeZcWf9r/',
      sourceLabel: 'Enquête de terrain & Source Facebook vérifiée'
    },
    budgetProjectId: 'proj-infra-seguela-touba-104mrd',
    confirmationsCount: 142
  }
];
