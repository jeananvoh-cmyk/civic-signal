import { BudgetProject } from '../types';
import officialNationalProjects2026 from './officialNationalProjects2026.json';
import { OFFICIAL_CSV_PROJECTS } from './officialProjectsFromCsv';

export const STRATEGIC_INFRASTRUCTURE_PROJECTS: BudgetProject[] = [
  {
    id: 'proj-infra-seguela-touba-104mrd',
    title: 'Aménagement et bitumage de l\'axe Séguéla-Sifié-Touba (126 km) & construction du pont sur le fleuve Sassandra',
    commune_name: 'Séguéla / Touba',
    region_name: 'Worodougou & Bafing',
    district_name: 'Woroba',
    departement_name: 'Séguéla - Touba',
    category: 'Voirie & Infrastructures',
    nature_expense: 'Investissements',
    sub_nature_expense: 'Infrastructures routières et ouvrages d\'art',
    details: 'Désenclavement interrégional stratégique reliant Séguéla et Touba en 2x1 voie sur 126 km avec construction d\'un nouveau pont sur le fleuve Sassandra. Réduit la distance de 431 km (détour par Daloa, Duékoué et Man) à 126 km directs. Financement 100% sur fonds propres du Trésor Public (104,7 Milliards FCFA). Maîtrise d\'ouvrage déléguée : AGEROUTE. Taux d\'avancement physique supérieur à 80%.',
    budget_amount_fcfa: 104700000000,
    fiscal_year: 2021,
    fiscal_year_label: 'Marché Pluriannuel (Engagé en 2021)',
    current_status: 'IN_PROGRESS',
    progress_percentage: 80,
    contractor_name: 'PORTEO BTP (Maîtrise d\'ouvrage déléguée : AGEROUTE • Contrôle : Cabinet 2HCI)',
    target_delivery_date: '2025-2026',
    locality_village_neighborhood: 'Axe Séguéla - Sifié - Pont sur le Sassandra - Touba (126 km)',
    created_at: '2021-08-01',
    source: 'Marché de l\'État engagé en 2021 (MEER / AGEROUTE / Trésor Public)',
    scope_level: 'NATIONAL',
    ministry_name: 'Ministère de l\'Equipement et de l\'Entretien Routier',
    program_name: 'Infrastructures routières et ouvrages d\'art',
    service_name: 'Direction Générale des Infrastructures Routières (DGIR)',
  },
];

export const NATIONAL_BUDGET_PROJECTS: BudgetProject[] = (officialNationalProjects2026 as unknown as BudgetProject[]).map(p => ({
  ...p,
  scope_level: 'NATIONAL' as const,
}));

export const LOCAL_BUDGET_PROJECTS: BudgetProject[] = OFFICIAL_CSV_PROJECTS.map(p => ({
  ...p,
  scope_level: 'LOCAL' as const,
}));

export const RAW_BUDGET_PROJECTS: BudgetProject[] = [
  ...STRATEGIC_INFRASTRUCTURE_PROJECTS,
  ...LOCAL_BUDGET_PROJECTS,
  ...NATIONAL_BUDGET_PROJECTS,
];
