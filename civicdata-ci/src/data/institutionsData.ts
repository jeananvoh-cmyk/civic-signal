import { Institution } from '../types';
import { NATIONAL_INSTITUTIONS_DATA } from './nationalBudgetData';
import { ALL_COMMUNES_DATA as RAW_COMMUNES_DATA, ALL_REGIONS_DATA as RAW_REGIONS_DATA } from './officialDataFromCsv';
import { GOVERNMENT_OFFICIALS } from './governmentData';
import { REGULATORY_AUTHORITIES_DATA } from './regulatoryAuthoritiesData';
import { enrichWithOfficialWebDirectory } from './officialWebDirectory';

export const ALL_COMMUNES_DATA: Institution[] = enrichWithOfficialWebDirectory(RAW_COMMUNES_DATA);
export const ALL_REGIONS_DATA: Institution[] = enrichWithOfficialWebDirectory(RAW_REGIONS_DATA);

export const ALL_MINISTRIES_DATA: Institution[] = GOVERNMENT_OFFICIALS.map(official => ({
  id: official.id,
  name: official.department_ministry,
  type: 'MINISTERE' as const,
  region: 'Abidjan',
  district: "Autonome d'Abidjan",
  departement: 'Plateau',
  address: official.address || 'Cité Administrative, Plateau, Abidjan',
  website: official.website_url,
  facebook_url: official.facebook_url,
  leader_name: official.name,
  leader_title: official.role_title,
  leader_photo_url: official.photo_url,
  leader_bio: official.leader_bio,
  leader_education: official.leader_education,
  leader_experience: official.leader_experience,
  mission_summary: official.mission_summary || `Missions gouvernementales et pilotage des politiques publiques du ${official.department_ministry}.`,
  organigramme_summary: official.organigramme_summary,
  organigramme_details: official.organigramme_details,
  info_officer_name: official.info_officer_name,
  info_officer_title: official.info_officer_title || "Service d'Accès aux Documents Publics (Loi n°2013-867)",
  info_officer_email: official.info_officer_email,
  info_officer_phone: official.info_officer_phone,
  budget_functioning_fcfa: Math.round((official.budget_fcfa || 32500000000) * 0.7),
  budget_investment_fcfa: Math.round((official.budget_fcfa || 32500000000) * 0.3),
  total_budget_fcfa: official.budget_fcfa || 32500000000,
}));

export { NATIONAL_INSTITUTIONS_DATA, REGULATORY_AUTHORITIES_DATA };

export const INSTITUTIONS_DATA: Institution[] = [
  ...ALL_MINISTRIES_DATA,
  ...NATIONAL_INSTITUTIONS_DATA,
  ...REGULATORY_AUTHORITIES_DATA,
  ...ALL_COMMUNES_DATA,
  ...ALL_REGIONS_DATA,
];
