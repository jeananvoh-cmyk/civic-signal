// Types for CivicData CI Platform

export type ProjectStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type UserRole = 'ADMIN' | 'MODERATOR' | 'DATA_MANAGER' | 'CITIZEN';

export type InstitutionType = 'MAIRIE' | 'REGION' | 'DISTRICT' | 'MINISTERE';

export interface Institution {
  id: string;
  name: string;
  type: InstitutionType;
  region: string;
  district: string;
  departement?: string;
  contact_email: string;
  contact_phone: string;
  website?: string;
  address?: string;
  // Responsable de l'Information (RI) - Loi d'accès à l'information publique
  info_officer_name: string;
  info_officer_email: string;
  info_officer_phone: string;
  info_officer_title?: string;
  green_line_number?: string;
  // Budget annuel
  budget_functioning_fcfa: number;
  budget_investment_fcfa: number;
  total_budget_fcfa: number;
}

export interface BudgetProject {
  id: string;
  institution_id?: string;
  institution_name?: string;
  commune_name: string;
  region_name: string;
  district_name?: string;
  departement_name?: string;
  category: string; // Santé, Éducation, Eau, Voirie, Logement, Électrification, etc.
  nature_expense: 'Investissements' | 'Transferts' | 'Personnel';
  sub_nature_expense?: string;
  title: string;
  details?: string;
  budget_amount_fcfa: number;
  fiscal_year: number; // 2025 | 2026
  current_status: ProjectStatus;
  progress_percentage: number;
  contractor_name?: string;
  target_delivery_date?: string;
  locality_village_neighborhood?: string;
  created_at: string;
  source?: string;
}

export interface CitizenProof {
  id: string;
  project_id: string;
  project_title?: string;
  commune_name?: string;
  region_name?: string;
  citizen_name?: string;
  image_url: string;
  citizen_status_claim: ProjectStatus;
  comment: string;
  locality_details?: string;
  geo_latitude?: number;
  geo_longitude?: number;
  verification_status: VerificationStatus;
  moderator_notes?: string;
  confirmations_count: number;
  created_at: string;
}

export interface ImpactStats {
  totalCommunes: number;
  totalRegions: number;
  totalBudgetLines: number;
  totalInvestmentsFcfa: number;
  verifiedProofsCount: number;
  proofsVerificationRate: number;
}

export type ActiveTab = 'home' | 'institutions' | 'projects' | 'observatory' | 'admin';
