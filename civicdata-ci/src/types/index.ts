// Types for Suivi Budget CI Platform

export type ProjectStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type UserRole = 'ADMIN' | 'MODERATOR' | 'DATA_MANAGER' | 'CITIZEN';

export type InstitutionType = 'MAIRIE' | 'REGION' | 'DISTRICT' | 'MINISTERE' | 'INSTITUTION' | 'AUTORITE_REGULATION';

export interface Institution {
  id: string;
  name: string;
  type: InstitutionType;
  region: string;
  district: string;
  departement?: string;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  address?: string;
  // Responsable de l'Information (RI) - Loi d'accès à l'information publique
  info_officer_name?: string;
  info_officer_email?: string;
  info_officer_phone?: string;
  info_officer_title?: string;
  green_line_number?: string;
  // Budget annuel
  budget_functioning_fcfa: number;
  budget_investment_fcfa: number;
  total_budget_fcfa: number;
  budget_not_published?: boolean;
  is_tax_quota_commune?: boolean;
  tax_quota_note?: string;
  // Premier Responsable & Présence Numérique
  leader_name?: string;
  leader_gender?: 'M' | 'F';
  leader_title?: string;
  leader_photo_url?: string;
  leader_bio?: string;
  political_party?: string;
  mandature?: string;
  facebook_url?: string;
  mission_summary?: string;
  organigramme_summary?: string[];
  organigramme_details?: { title: string; items: string[] }[];
  leader_experience?: string[];
  leader_education?: string[];
  official_programs?: string[];
  budget_lines?: BudgetLineItem[];
}

export interface BudgetLineItem {
  id?: string;
  libelle: string;
  montant_fcfa: number;
  evolution_pct?: number;
  categorie?: string;
  sous_categorie_1?: string;
  sous_categorie_2?: string;
  sous_categorie_3?: string;
  nature?: 'Biens et services' | 'Investissements' | 'Transferts' | 'Personnel' | string;
  year?: number;
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
  fiscal_year: number; // 2026
  fiscal_year_label?: string; // ex: "Marché Pluriannuel (Engagé en 2021)"
  current_status: ProjectStatus;
  progress_percentage: number;
  contractor_name?: string;
  target_delivery_date?: string;
  start_date?: string;
  contractual_duration_months?: number;
  execution_deadline?: string;
  locality_village_neighborhood?: string;
  created_at: string;
  source?: string;
  scope_level?: 'LOCAL' | 'NATIONAL';
  ministry_name?: string;
  program_name?: string;
  service_name?: string;
  image_url?: string;
  partner_or_donor?: string;
  master_builder?: string;
  project_tier?: 'MUNICIPAL' | 'REGIONAL' | 'STATE';
  official_progress_source?: string;
}

export interface CitizenProof {
  id: string;
  project_id: string;
  project_title?: string;
  commune_name?: string;
  region_name?: string;
  citizen_name?: string;
  user_name?: string;
  image_url: string;
  photo_url?: string;
  video_url?: string;
  media_type?: 'IMAGE' | 'VIDEO';
  citizen_status_claim: ProjectStatus;
  comment: string;
  locality_details?: string;
  geo_latitude?: number;
  geo_longitude?: number;
  verification_status: VerificationStatus;
  moderator_notes?: string;
  confirmations_count: number;
  is_demo?: boolean;
  created_at: string;
  source_url?: string;
  source_credit?: string;
  additional_photos?: string[];
  contractual_duration?: string;
  start_date?: string;
  target_delivery_date?: string;
  contractor_name?: string;
  financial_source?: string;
  tracking_code?: string;
  citizen_whatsapp?: string;
  signboard_status?: 'PRESENT' | 'ABSENT' | 'UNSPECIFIED';
  secondary_image_url?: string;
}

export interface ImpactStats {
  totalCommunes: number;
  totalCollectivites?: number;
  totalRegions: number;
  totalBudgetLines: number;
  totalInvestmentsFcfa: number;
  verifiedProofsCount: number;
  proofsVerificationRate: number;
}

export interface NewsArticle {
  id: string;
  title: string;
  category: 'ACTUALITE' | 'RAPPORT' | 'COMMUNIQUE' | 'GUIDE';
  summary: string;
  content: string;
  cover_image_url?: string;
  document_url?: string;
  document_name?: string;
  published_at: string;
  author_name?: string;
  is_featured?: boolean;
}

export interface SiteSettings {
  fiscal_year: number;
  contact_email: string;
  contact_phone: string;
  facebook_url?: string;
  platform_title: string;
  announcement_banner_enabled: boolean;
  announcement_banner_text: string;
  announcement_banner_link?: string;
  announcement_banner_type?: 'info' | 'success' | 'warning';
}

export type DocumentCategory = 
  | 'RAPPORT_AUDIT' 
  | 'MARCHE_PUBLIC' 
  | 'BUDGET_OFFICIEL' 
  | 'LOI_CAIDP' 
  | 'ETUDE_TECHNIQUE' 
  | 'GUIDE_CITOYEN';

export type DocumentFormat = 'PDF' | 'EXCEL' | 'WORD' | 'CSV';

export interface PublicDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  institution_name: string;
  year: number;
  description: string;
  file_url: string;
  file_name: string;
  file_size?: string;
  file_format: DocumentFormat;
  published_at: string;
  downloads_count: number;
  is_official: boolean;
  tags?: string[];
}

export type ActiveTab = 'home' | 'institutions' | 'projects' | 'observatory' | 'documents' | 'admin';
