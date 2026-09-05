import { 
  BudgetProject, 
  CitizenProof, 
  Institution, 
  ImpactStats, 
  ProjectStatus, 
  UserRole,
  NewsArticle,
  SiteSettings,
  PublicDocument
} from '../types';
import { RAW_BUDGET_PROJECTS } from '../data/budgetData';
import { INSTITUTIONS_DATA } from '../data/institutionsData';
import { INITIAL_CITIZEN_PROOFS } from '../data/initialProofs';
import { INITIAL_ARTICLES } from '../data/initialArticles';
import { detectCategoryFromExpense } from '../data/categories';
import { CAIDP_MASTER_DIRECTORY, CaidpEntity } from '../data/caidpRiData';
import { AuthSecurityService } from './authSecurity';
import { sanitizeCsvCell } from '../utils/security';
import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEYS = {
  PROJECTS: 'civicdata_projects_v2026_clean_v3',
  INSTITUTIONS: 'civicdata_institutions_v10',
  PROOFS: 'civicdata_proofs_v12',
  ARTICLES: 'civicdata_articles_v10',
  SETTINGS: 'civicdata_settings_v7',
  AUTH: 'civicdata_auth_v7',
  CAIDP_RI: 'civicdata_caidp_ri_v2',
  SUBSCRIBERS: 'suivibudget_subscribers_v1',
  DOCUMENTS: 'suivibudget_public_documents_v1',
  CAIDP_LOGS: 'suivibudget_caidp_requests_log_v1',
};

export interface CaidpRequestEvent {
  id: string;
  created_at: string;
  action_type: 'EMAIL_SENT' | 'PRINT_PDF' | 'COPIED';
  entity_type: 'MAIRIE' | 'REGION' | 'MINISTERE' | 'INSTITUTION' | 'AUTORITE_REGULATION' | 'PROJECT';
  entity_name: string;
  has_ri: boolean;
  document_titles: string[];
  document_categories: string[];
  user_status?: string;
  commune?: string;
}

export interface CaidpRequestStats {
  totalRequests: number;
  emailSentCount: number;
  printPdfCount: number;
  copiedCount: number;
  withRiCount: number;
  withoutRiCount: number;
  byEntityType: Record<string, number>;
  topDocuments: { title: string; count: number }[];
  recentEvents: CaidpRequestEvent[];
}

async function safeSupabaseExec(promiseLike: any, contextMsg: string): Promise<void> {
  try {
    const res = await promiseLike;
    if (res && res.error) {
      console.warn(`[Supabase Sync Warning] ${contextMsg}:`, res.error);
    }
  } catch (err) {
    console.warn(`[Supabase Network Warning] ${contextMsg}:`, err);
  }
}

export interface NewsletterSubscriber {
  id: string;
  first_name: string;
  email: string;
  commune: string;
  created_at: string;
}

export function isTangiblePhysicalProject(p: BudgetProject): boolean {
  if (!p) return false;
  const text = `${p.title || ''} ${p.details || ''} ${p.sub_nature_expense || ''} ${p.category || ''}`.toLowerCase();

  // 1. Exclude ALL Salaries, Bonuses, Missions, Travel, Administration, IT master plans & Operating overhead
  const excludedKeywords = [
    'salaire',
    'salarial',
    'traitement salarial',
    'indemnité',
    'indemnites',
    'prime',
    'émolument',
    'emolument',
    'gratification',
    'vacation',
    'rémunération',
    'remuneration',
    'personnel du conseil',
    'personnel de la mairie',
    'frais de personnel',
    'charges de personnel',
    'charges sociales',
    'frais de mission',
    'mission à l',
    'missions à l',
    'voyage',
    'billet d\'avion',
    'billets d\'avion',
    'frais de séjour',
    'hébergement',
    'carburant et lubrifiant',
    'frais de carburant',
    'consommable',
    'fourniture de bureau',
    'fournitures de bureau',
    'schéma directeur',
    'schema directeur',
    'système d\'information',
    'systeme d\'information',
    'audit organisationnel',
    'étude institutionnelle',
    'frais financiers',
    'remboursement de dette',
    'intérêts de la dette',
    'contentieux judiciaire',
    'assurance du personnel',
    'cotisation sociale',
    'dotation globale de fonctionnement',
    'fonctionnement des services',
    'charges administratives',
    'assurer le fonctionnement',
    'assurer la gestion',
  ];

  for (const kw of excludedKeywords) {
    if (text.includes(kw)) {
      return false;
    }
  }

  // 2. Must be a tangible investment / equipment / construction / rehabilitation / community facility
  const tangibleKeywords = [
    'construction',
    'réhabilitation',
    'rehabilitation',
    'reprofilage',
    'bitumage',
    'voirie',
    'route',
    'piste',
    'pont',
    'caniveau',
    'assainissement',
    'forage',
    'château d\'eau',
    'chateau d\'eau',
    'hydraulique',
    'adduction',
    'eau potable',
    'électrification',
    'electrification',
    'éclairage public',
    'eclairage public',
    'panneau solaire',
    'panneaux solaires',
    'école',
    'ecole',
    'collège',
    'college',
    'lycée',
    'lycee',
    'classe',
    'bâtiment scolaire',
    'batiment scolaire',
    'cantine',
    'table-banc',
    'tables-bancs',
    'maternité',
    'maternite',
    'dispensaire',
    'centre de santé',
    'centre de sante',
    'hôpital',
    'hopital',
    'chr',
    'chu',
    'ambulance',
    'médical',
    'medical',
    'médicament',
    'chambre froide',
    'marché',
    'marche',
    'hangar',
    'abattoir',
    'logement',
    'foyer',
    'stade',
    'terrain de sport',
    'complexe sportif',
    'retenue d\'eau',
    'agricole',
    'irrigation',
    'magasin de stockage',
    'bâtiment',
    'batiment',
    'travaux',
    'aménagement',
    'amenagement',
    'équipement',
    'equipement',
    'acquisition de matériel',
    'acquisition de materiel',
    'acquisition d\'équipements',
  ];

  return tangibleKeywords.some(kw => text.includes(kw));
}

export interface AuthState {
  isAuthenticated: boolean;
  email: string;
  fullName: string;
  role: UserRole;
  expiresAt?: number;
}

export const INITIAL_PUBLIC_DOCUMENTS: PublicDocument[] = [
  {
    id: 'doc-caidp-loi-2013-867',
    title: "Loi n° 2013-867 du 23 décembre 2013 relative à l'accès à l'information d'intérêt public",
    category: 'LOI_CAIDP',
    institution_name: "Assemblée Nationale & CAIDP",
    year: 2013,
    description: "Texte de loi fondamental garantissant le droit de tout citoyen d'accéder aux informations et documents administratifs détenus par les organismes publics en Côte d'Ivoire.",
    file_url: "https://caidp.ci/documents/Loi_2013_867_CAIDP.pdf",
    file_name: "Loi_2013_867_CAIDP_Cote_d_Ivoire.pdf",
    file_size: "1.2 Mo",
    file_format: "PDF",
    published_at: "2013-12-23",
    downloads_count: 142,
    is_official: true,
    tags: ["Loi", "CAIDP", "Droit Citoyen", "Transparence", "Information Publique"]
  },
  {
    id: 'doc-caidp-decret-application',
    title: "Décret n° 2014-462 portant attributions, organisation et fonctionnement de la CAIDP",
    category: 'LOI_CAIDP',
    institution_name: "Présidence de la République & CAIDP",
    year: 2014,
    description: "Décret d'application fixant les modalités pratiques de désignation des Responsables de l'Information (RI) et le délai légal de communication obligatoire (30 jours).",
    file_url: "https://caidp.ci/documents/Decret_2014_462_CAIDP.pdf",
    file_name: "Decret_2014_462_Fonctionnement_CAIDP.pdf",
    file_size: "850 Ko",
    file_format: "PDF",
    published_at: "2014-08-06",
    downloads_count: 98,
    is_official: true,
    tags: ["Décret", "RI", "Procédure", "CAIDP"]
  },
  {
    id: 'doc-budget-synthese-2026',
    title: "Synthèse Citoyenne & Chiffres Clés du Budget de l'État 2026",
    category: 'BUDGET_OFFICIEL',
    institution_name: "Ministère des Finances et du Budget",
    year: 2026,
    description: "Document officiel de vulgarisation budgétaire présentant les 15 339,2 milliards FCFA de dépenses et investissements publics (LFI 2026), ventilés par grandes priorités (Éducation, Santé, Routes, Sécurité).",
    file_url: "https://budget.gouv.ci/documents/Synthese_Budget_Citoyen_2026.pdf",
    file_name: "Synthese_Budget_Citoyen_2026_CI.pdf",
    file_size: "4.5 Mo",
    file_format: "PDF",
    published_at: "2026-01-05",
    downloads_count: 315,
    is_official: true,
    tags: ["Loi de Finances 2026", "Budget Citoyen", "Finances Publiques"]
  },
  {
    id: 'doc-collectivites-loi-2012-1128',
    title: "Loi n° 2012-1128 portant organisation des collectivités territoriales en Côte d'Ivoire",
    category: 'LOI_CAIDP',
    institution_name: "Ministère de l'Intérieur et de la Sécurité & DGDD",
    year: 2012,
    description: "Cadre légal régissant le fonctionnement, les compétences, l'autonomie financière et la gestion budgétaire des 201 communes et 31 régions.",
    file_url: "https://dgdd.interieur.gouv.ci/documents/Loi_2012_1128_Collectivites_Territoriales.pdf",
    file_name: "Loi_2012_1128_Organisation_Collectivites_CI.pdf",
    file_size: "1.8 Mo",
    file_format: "PDF",
    published_at: "2012-12-13",
    downloads_count: 185,
    is_official: true,
    tags: ["Collectivités", "Décentralisation", "Mairies", "Régions", "Loi"]
  },
  {
    id: 'doc-livre-blanc-collectivites',
    title: "Livre Blanc : Portails Web et Transparence des Collectivités Locales de Côte d'Ivoire",
    category: 'ETUDE_TECHNIQUE',
    institution_name: "Observatoire SuiviBudget & Collectivités",
    year: 2026,
    description: "Audit d'impact et guide méthodologique sur la présence numérique des 201 mairies et 31 régions, l'affichage public des budgets locaux et l'application du droit à l'information.",
    file_url: "/documents/LIVRE_BLANC_PORTAILS_WEB_COLLECTIVITES_CI.md",
    file_name: "LIVRE_BLANC_PORTAILS_WEB_COLLECTIVITES_CI.pdf",
    file_size: "2.1 Mo",
    file_format: "PDF",
    published_at: "2026-02-15",
    downloads_count: 230,
    is_official: true,
    tags: ["Livre Blanc", "Mairies", "Régions", "Audit", "Décentralisation"]
  },
  {
    id: 'doc-cour-des-comptes-guide',
    title: "Rapport Public Annuel sur l'Exécution du Budget et la Gestion des Deniers Publics",
    category: 'RAPPORT_AUDIT',
    institution_name: "Cour des Comptes de Côte d'Ivoire",
    year: 2025,
    description: "Observations, constatations d'irrégularités et recommandations de la Cour des Comptes sur la gestion financière et l'efficacité des dépenses des ministères et sociétés publiques.",
    file_url: "https://courdescomptes.ci/rapports/Rapport_Public_Annuel_Cour_Des_Comptes.pdf",
    file_name: "Rapport_Public_Annuel_Cour_Des_Comptes.pdf",
    file_size: "6.8 Mo",
    file_format: "PDF",
    published_at: "2025-11-20",
    downloads_count: 489,
    is_official: true,
    tags: ["Cour des Comptes", "Audit", "Contrôle", "Gouvernance"]
  },
  {
    id: 'doc-dgmp-marches-publics',
    title: "Rapport d'Analyse et de Surveillance des Marchés Publics en Côte d'Ivoire",
    category: 'MARCHE_PUBLIC',
    institution_name: "Direction Générale des Marchés Publics (DGMP)",
    year: 2025,
    description: "Bilan statistique officiel sur la passation des marchés publics : proportion des appels d'offres ouverts vs gré à gré, délais de traitement et conformité réglementaire.",
    file_url: "https://marchespublics.ci/documents/Rapport_Annuel_DGMP.pdf",
    file_name: "Rapport_Annuel_DGMP_Marches_Publics.pdf",
    file_size: "3.7 Mo",
    file_format: "PDF",
    published_at: "2025-10-12",
    downloads_count: 278,
    is_official: true,
    tags: ["Marchés Publics", "DGMP", "Appels d'offres", "Contrats"]
  }
];

const DEFAULT_SETTINGS: SiteSettings = {
  fiscal_year: 2026,
  contact_email: 'contact.suivi@gmail.com',
  contact_phone: '+225 07 00 00 00 00',
  facebook_url: 'https://www.facebook.com/profile.php?id=61593791261798',
  platform_title: 'SuiviBudget Côte d\'Ivoire - Observatoire Citoyen des Budgets Publics & Chantiers',
  announcement_banner_enabled: false,
  announcement_banner_text: "",
  announcement_banner_link: "",
  announcement_banner_type: "info",
};

class DataStore {
  private projects: BudgetProject[] = [];
  private institutions: Institution[] = [];
  private proofs: CitizenProof[] = [];
  private articles: NewsArticle[] = [];
  private documents: PublicDocument[] = [];
  private caidpDirectory: CaidpEntity[] = [];
  private caidpLogs: CaidpRequestEvent[] = [];
  private subscribers: NewsletterSubscriber[] = [];
  private settings: SiteSettings = { ...DEFAULT_SETTINGS };
  private authState: AuthState = {
    isAuthenticated: false,
    email: '',
    fullName: '',
    role: 'CITIZEN',
  };
  private listeners: (() => void)[] = [];

  constructor() {
    this.init();
  }

  private init() {
    // 1. Projects - Retain only tangible, physically verifiable investments
    this.projects = [...RAW_BUDGET_PROJECTS].filter(isTangiblePhysicalProject);
    try {
      const storedProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      if (storedProjects) {
        const parsed = JSON.parse(storedProjects);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.projects = parsed.filter(isTangiblePhysicalProject);
        }
      }
    } catch (e) {
      console.warn("Could not read projects from localStorage", e);
    }

    // 2. Institutions
    this.institutions = [...INSTITUTIONS_DATA];
    try {
      const storedInstitutions = localStorage.getItem(STORAGE_KEYS.INSTITUTIONS);
      if (storedInstitutions) {
        const parsed = JSON.parse(storedInstitutions);
        if (Array.isArray(parsed) && parsed.length >= 100) {
          this.institutions = parsed;
        }
      }
    } catch (e) {
      console.warn("Could not read institutions from localStorage", e);
    }

    // 3. Proofs
    this.proofs = [...INITIAL_CITIZEN_PROOFS];
    try {
      const storedProofs = localStorage.getItem(STORAGE_KEYS.PROOFS);
      if (storedProofs) {
        const parsed = JSON.parse(storedProofs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.proofs = parsed;
        }
      }
    } catch (e) {
      console.warn("Could not read proofs from localStorage", e);
    }
    if (this.proofs.length === 0 && INITIAL_CITIZEN_PROOFS.length > 0) {
      this.proofs = [...INITIAL_CITIZEN_PROOFS];
    }

    // 4. Articles
    this.articles = [...INITIAL_ARTICLES];
    try {
      const storedArticles = localStorage.getItem(STORAGE_KEYS.ARTICLES);
      if (storedArticles) {
        const parsed = JSON.parse(storedArticles);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.articles = parsed;
        }
      }
    } catch (e) {
      console.warn("Could not read articles from localStorage", e);
    }

    // 5. CAIDP RI Directory
    this.caidpDirectory = [...CAIDP_MASTER_DIRECTORY];
    try {
      const storedCaidp = localStorage.getItem(STORAGE_KEYS.CAIDP_RI);
      if (storedCaidp) {
        const parsed = JSON.parse(storedCaidp);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.caidpDirectory = parsed;
        }
      }
    } catch (e) {
      console.warn("Could not read caidp directory from localStorage", e);
    }

    // 6. Settings
    try {
      const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (storedSettings) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) };
      }
    } catch (e) {
      console.warn("Could not read settings from localStorage", e);
    }

    // 7. Auth (Cryptographically validated session)
    const session = AuthSecurityService.validateCurrentSession();
    if (session.isAuthenticated && session.user) {
      this.authState = {
        isAuthenticated: true,
        email: session.user.email,
        fullName: session.user.fullName,
        role: session.user.role as UserRole,
        expiresAt: session.user.expiresAt,
      };
    } else {
      this.authState = { isAuthenticated: false, email: '', fullName: '', role: 'CITIZEN' };
    }

    // 8. Public Documents
    this.documents = [...INITIAL_PUBLIC_DOCUMENTS];
    try {
      const storedDocs = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      if (storedDocs) {
        const parsed = JSON.parse(storedDocs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.documents = parsed;
        }
      }
    } catch (e) {
      console.warn("Could not read documents from localStorage", e);
    }

    // 9. CAIDP Requests Log (Telemetry)
    this.caidpLogs = [];
    try {
      const storedLogs = localStorage.getItem(STORAGE_KEYS.CAIDP_LOGS);
      if (storedLogs) {
        const parsed = JSON.parse(storedLogs);
        if (Array.isArray(parsed)) {
          this.caidpLogs = parsed;
        }
      }
    } catch (e) {
      console.warn("Could not read caidp logs from localStorage", e);
    }

    // 10. Live Supabase Cloud Sync (if configured)
    this.initSupabaseSync();
  }

  private async initSupabaseSync() {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase
        .from('citizen_proofs')
        .select('*')
        .order('created_at', { ascending: false });

      // Sync public documents from Supabase if table exists
      try {
        const { data: remoteDocs, error: docsError } = await supabase
          .from('public_documents')
          .select('*')
          .order('published_at', { ascending: false });
        if (!docsError && Array.isArray(remoteDocs) && remoteDocs.length > 0) {
          this.documents = remoteDocs;
          this.saveDocuments();
          this.notify();
        }
      } catch (err) {
        // Table not present yet, silent fallback
      }

      if (!error && Array.isArray(data) && data.length > 0) {
        const remoteProofs: CitizenProof[] = data.map(d => ({
          id: d.id,
          project_id: d.project_id,
          project_title: d.project_title,
          commune_name: d.commune_name,
          region_name: d.region_name || '',
          citizen_name: d.citizen_name || 'Sentinelle Citoyenne',
          user_name: d.citizen_name || 'Sentinelle Citoyenne',
          image_url: d.image_url,
          photo_url: d.image_url,
          video_url: d.video_url,
          media_type: d.media_type || (d.video_url ? 'VIDEO' : 'IMAGE'),
          citizen_status_claim: d.citizen_status_claim,
          comment: d.comment,
          locality_details: d.locality_details,
          verification_status: d.verification_status,
          moderator_notes: d.moderator_notes,
          confirmations_count: d.confirmations_count || 1,
          created_at: d.created_at,
        }));

        const existingMap = new Map(this.proofs.map(p => [p.id, p]));
        remoteProofs.forEach(rp => existingMap.set(rp.id, rp));
        this.proofs = Array.from(existingMap.values());
        this.saveProofs();
        this.notify();
      }
    } catch (e) {
      console.warn("Supabase background sync silent catch:", e);
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  // --- GETTERS ---
  public getProjects(): BudgetProject[] {
    return this.projects;
  }

  public getInstitutions(): Institution[] {
    return this.institutions;
  }

  public getApprovedProofs(): CitizenProof[] {
    const realApproved = this.proofs.filter(p => p.verification_status === 'APPROVED' && !p.is_demo);
    if (realApproved.length > 0) {
      return realApproved;
    }
    return this.proofs.filter(p => p.verification_status === 'APPROVED');
  }

  public hasRealProofs(): boolean {
    return this.proofs.some(p => p.verification_status === 'APPROVED' && !p.is_demo);
  }

  public getAllProofs(): CitizenProof[] {
    return this.proofs;
  }

  public getPendingProofs(): CitizenProof[] {
    return this.proofs.filter(p => p.verification_status === 'PENDING');
  }

  public getArticles(): NewsArticle[] {
    return this.articles;
  }

  public getSettings(): SiteSettings {
    return this.settings;
  }

  public getActiveFiscalYear(): number {
    return this.settings.fiscal_year || 2026;
  }

  public getAvailableFiscalYears(): number[] {
    const years = Array.from(new Set(this.projects.map(p => p.fiscal_year || 2026)));
    if (!years.includes(2026)) years.push(2026);
    return years.sort((a, b) => b - a);
  }

  public getProjectById(id: string): BudgetProject | undefined {
    return this.projects.find(p => p.id === id);
  }

  public getProofsForProject(projectId: string): CitizenProof[] {
    return this.proofs.filter(p => p.project_id === projectId && p.verification_status === 'APPROVED');
  }

  public getAuth(): AuthState {
    const session = AuthSecurityService.validateCurrentSession();
    if (session.isAuthenticated && session.user) {
      this.authState = {
        isAuthenticated: true,
        email: session.user.email,
        fullName: session.user.fullName,
        role: session.user.role as UserRole,
        expiresAt: session.user.expiresAt,
      };
      return { ...this.authState };
    }
    this.authState = { isAuthenticated: false, email: '', fullName: '', role: 'CITIZEN', expiresAt: 0 };
    return { ...this.authState };
  }

  // --- STATS CALCULATION ---
  public getImpactStats(): ImpactStats {
    const totalCommunes = 201;
    const totalRegions = 33;
    const totalCollectivites = 234;
    const totalBudgetLines = this.projects.length > 0 ? this.projects.length : 4354;
    const totalInvestmentsFcfa = this.projects.reduce((sum, p) => sum + p.budget_amount_fcfa, 0);
    const verifiedProofs = this.proofs.filter(p => p.verification_status === 'APPROVED').length;
    const totalProofs = this.proofs.length;
    const proofsVerificationRate = totalProofs > 0 ? Math.round((verifiedProofs / totalProofs) * 100) : 100;

    return {
      totalCommunes,
      totalRegions,
      totalCollectivites,
      totalBudgetLines,
      totalInvestmentsFcfa,
      verifiedProofsCount: verifiedProofs,
      proofsVerificationRate,
    };
  }

  // --- AUTH MANAGEMENT ---
  public login(email: string, fullName: string, role: UserRole) {
    const assignedRole = (role === 'ADMIN' || role === 'MODERATOR' || role === 'DATA_MANAGER') ? role : 'MODERATOR';
    const assignedName = fullName || (assignedRole === 'ADMIN' ? 'Administrateur National' : 'Modérateur Terrain');
    const token = AuthSecurityService.createSignedSession({
      email,
      fullName: assignedName,
      role: assignedRole,
    });
    this.authState = {
      isAuthenticated: true,
      email: token.payload.email,
      fullName: token.payload.fullName,
      role: token.payload.role as UserRole,
      expiresAt: token.payload.expiresAt,
    };
    this.notify();
  }

  public logout() {
    AuthSecurityService.clearSession();
    if (isSupabaseConfigured()) {
      supabase.auth.signOut().catch(() => {});
    }
    this.authState = {
      isAuthenticated: false,
      email: '',
      fullName: '',
      role: 'CITIZEN',
      expiresAt: 0,
    };
    this.notify();
  }

  // --- CITIZEN PROOF SUBMISSION & MODERATION ---
  public submitProof(proofData: {
    project_id: string;
    image_url: string;
    video_url?: string;
    media_type?: 'IMAGE' | 'VIDEO';
    citizen_status_claim: ProjectStatus;
    comment: string;
    locality_details?: string;
    citizen_name?: string;
  }): CitizenProof {
    const project = this.getProjectById(proofData.project_id);
    const newProof: CitizenProof = {
      id: `proof-${Date.now()}`,
      project_id: proofData.project_id,
      project_title: project ? project.title : 'Projet d\'infrastructure locale',
      commune_name: project ? project.commune_name : 'Côte d\'Ivoire',
      region_name: project ? project.region_name : '',
      citizen_name: proofData.citizen_name || 'Citoyen Observateur',
      user_name: proofData.citizen_name || 'Citoyen Observateur',
      image_url: proofData.image_url,
      photo_url: proofData.image_url,
      video_url: proofData.video_url,
      media_type: proofData.media_type || (proofData.video_url ? 'VIDEO' : 'IMAGE'),
      citizen_status_claim: proofData.citizen_status_claim,
      comment: proofData.comment,
      locality_details: proofData.locality_details || (project ? project.locality_village_neighborhood : ''),
      verification_status: 'PENDING',
      confirmations_count: 1,
      created_at: new Date().toISOString(),
    };

    this.proofs.unshift(newProof);
    this.saveProofs();
    this.notify();

    // Live Supabase Insert (if configured)
    if (isSupabaseConfigured()) {
      safeSupabaseExec(
        supabase.from('citizen_proofs').insert([{
          id: newProof.id,
          project_id: newProof.project_id,
          project_title: newProof.project_title,
          commune_name: newProof.commune_name,
          region_name: newProof.region_name,
          citizen_name: newProof.citizen_name,
          image_url: newProof.image_url,
          video_url: newProof.video_url,
          media_type: newProof.media_type,
          citizen_status_claim: newProof.citizen_status_claim,
          comment: newProof.comment,
          locality_details: newProof.locality_details,
          verification_status: 'PENDING',
        }]),
        'Upload Preuve Citoyenne'
      );
    }

    return newProof;
  }

  public confirmProof(proofId: string) {
    const idx = this.proofs.findIndex(p => p.id === proofId);
    if (idx !== -1) {
      this.proofs[idx].confirmations_count = (this.proofs[idx].confirmations_count || 1) + 1;
      this.saveProofs();
      this.notify();
    }
  }

  public moderateProof(proofId: string, status: 'APPROVED' | 'REJECTED', moderatorNotes?: string) {
    const idx = this.proofs.findIndex(p => p.id === proofId);
    if (idx !== -1) {
      this.proofs[idx].verification_status = status;
      if (moderatorNotes) {
        this.proofs[idx].moderator_notes = moderatorNotes;
      }
      this.saveProofs();
      this.notify();

      // Live Supabase Update (if configured)
      if (isSupabaseConfigured()) {
        safeSupabaseExec(
          supabase.from('citizen_proofs').update({
            verification_status: status,
            moderator_notes: moderatorNotes || null,
            verified_at: new Date().toISOString(),
            verified_by: this.authState.fullName || 'Modérateur',
          }).eq('id', proofId),
          'Modération Preuve Citoyenne'
        );
      }
    }
  }

  public deleteProof(proofId: string) {
    this.proofs = this.proofs.filter(p => p.id !== proofId);
    this.saveProofs();
    this.notify();

    // Live Supabase Delete (if configured)
    if (isSupabaseConfigured()) {
      safeSupabaseExec(
        supabase.from('citizen_proofs').delete().eq('id', proofId),
        'Suppression Preuve Citoyenne'
      );
    }
  }

  // --- PROJECT CRUD ---
  public addProject(project: Omit<BudgetProject, 'id' | 'created_at'>): BudgetProject {
    const newProject: BudgetProject = {
      ...project,
      id: `custom-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.projects.unshift(newProject);
    this.saveProjects();
    this.notify();
    return newProject;
  }

  public updateProject(id: string, updates: Partial<BudgetProject>) {
    this.projects = this.projects.map(p => {
      if (p.id === id) {
        return { ...p, ...updates };
      }
      return p;
    });
    this.saveProjects();
    this.notify();
  }

  public deleteProject(id: string) {
    this.projects = this.projects.filter(p => p.id !== id);
    this.saveProjects();
    this.notify();
  }

  // --- INSTITUTION CRUD ---
  public addInstitution(instData: Omit<Institution, 'id'>): Institution {
    const newInst: Institution = {
      ...instData,
      id: `inst-custom-${Date.now()}`,
    };
    this.institutions.unshift(newInst);
    this.saveInstitutions();
    this.notify();
    return newInst;
  }

  public updateInstitution(updatedInst: Institution) {
    const idx = this.institutions.findIndex(inst => inst.id === updatedInst.id);
    if (idx !== -1) {
      this.institutions[idx] = { ...this.institutions[idx], ...updatedInst };
    } else {
      this.institutions.unshift(updatedInst);
    }
    this.saveInstitutions();
    this.notify();
  }

  public deleteInstitution(id: string) {
    this.institutions = this.institutions.filter(inst => inst.id !== id);
    this.saveInstitutions();
    this.notify();
  }

  // --- ARTICLES / PUBLICATIONS CRUD ---
  public addArticle(articleData: Omit<NewsArticle, 'id' | 'published_at'>): NewsArticle {
    const newArticle: NewsArticle = {
      ...articleData,
      id: `art-${Date.now()}`,
      published_at: new Date().toISOString().split('T')[0],
    };
    this.articles.unshift(newArticle);
    this.saveArticles();
    this.notify();
    return newArticle;
  }

  public updateArticle(id: string, updates: Partial<NewsArticle>) {
    this.articles = this.articles.map(a => {
      if (a.id === id) {
        return { ...a, ...updates };
      }
      return a;
    });
    this.saveArticles();
    this.notify();
  }

  public deleteArticle(id: string) {
    this.articles = this.articles.filter(a => a.id !== id);
    this.saveArticles();
    this.notify();
  }

  // --- PUBLIC DOCUMENTS MANAGEMENT ---
  public getDocuments(): PublicDocument[] {
    return [...this.documents];
  }

  public getDocumentById(id: string): PublicDocument | undefined {
    return this.documents.find(d => d.id === id);
  }

  public addDocument(docData: Omit<PublicDocument, 'id' | 'downloads_count' | 'published_at'> & { published_at?: string }): PublicDocument {
    const newDoc: PublicDocument = {
      ...docData,
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      downloads_count: 0,
      published_at: docData.published_at || new Date().toISOString().split('T')[0],
      is_official: docData.is_official ?? true,
    };
    this.documents.unshift(newDoc);
    this.saveDocuments();
    this.notify();

    if (isSupabaseConfigured()) {
      safeSupabaseExec(
        supabase.from('public_documents').insert([{
          id: newDoc.id,
          title: newDoc.title,
          category: newDoc.category,
          institution_name: newDoc.institution_name,
          year: newDoc.year,
          description: newDoc.description,
          file_url: newDoc.file_url,
          file_name: newDoc.file_name,
          file_size: newDoc.file_size || '1.0 Mo',
          file_format: newDoc.file_format,
          published_at: newDoc.published_at,
          downloads_count: newDoc.downloads_count,
          is_official: newDoc.is_official,
          tags: newDoc.tags || []
        }]),
        'Adding public document'
      );
    }

    return newDoc;
  }

  public updateDocument(id: string, updates: Partial<PublicDocument>): boolean {
    const idx = this.documents.findIndex(d => d.id === id);
    if (idx === -1) return false;
    this.documents[idx] = { ...this.documents[idx], ...updates };
    this.saveDocuments();
    this.notify();

    if (isSupabaseConfigured()) {
      safeSupabaseExec(
        supabase.from('public_documents').update(updates).eq('id', id),
        'Updating public document'
      );
    }
    return true;
  }

  public deleteDocument(id: string): boolean {
    const idx = this.documents.findIndex(d => d.id === id);
    if (idx === -1) return false;
    this.documents = this.documents.filter(d => d.id !== id);
    this.saveDocuments();
    this.notify();

    if (isSupabaseConfigured()) {
      safeSupabaseExec(
        supabase.from('public_documents').delete().eq('id', id),
        'Deleting public document'
      );
    }
    return true;
  }

  public incrementDocumentDownloads(id: string): void {
    const doc = this.documents.find(d => d.id === id);
    if (doc) {
      doc.downloads_count = (doc.downloads_count || 0) + 1;
      this.saveDocuments();
      this.notify();

      if (isSupabaseConfigured()) {
        safeSupabaseExec(
          supabase.from('public_documents').update({ downloads_count: doc.downloads_count }).eq('id', id),
          'Incrementing document downloads'
        );
      }
    }
  }

  // --- SITE SETTINGS ---
  public updateSettings(newSettings: Partial<SiteSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    this.notify();
  }

  // --- SMART MULTI-YEAR CSV IMPORT ---
  public importFromCSV(csvText: string, options?: { mode?: 'APPEND' | 'REPLACE_YEAR', targetYear?: number }): { 
    successCount: number; 
    errorCount: number;
    detectedYear: number;
    totalAmountFcfa: number;
  } {
    let successCount = 0;
    let errorCount = 0;
    let totalAmountFcfa = 0;
    const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    if (lines.length <= 1) return { successCount: 0, errorCount: 0, detectedYear: 2026, totalAmountFcfa: 0 };

    const delimiter = lines[0].includes(';') ? ';' : ',';
    const sampleCols = lines[1].split(delimiter).map(c => c.trim().replace(/^"/, '').replace(/"$/, ''));
    
    let detectedYear = options?.targetYear || this.settings.fiscal_year || 2026;
    if (!options?.targetYear && sampleCols[0] && /^\d{4}$/.test(sampleCols[0])) {
      detectedYear = parseInt(sampleCols[0], 10);
    }

    const newProjects: BudgetProject[] = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const parts = lines[i].split(delimiter).map(p => p.trim().replace(/^"/, '').replace(/"$/, ''));
        if (parts.length < 4) continue;

        // DGBF 9-column format
        if (parts.length >= 9 && (parts[1] === 'EMPLOIS' || parts[1] === 'RESSOURCES' || parts[2] === 'MINISTERES' || parts[2] === 'INSTITUTIONS')) {
          const cat1 = parts[1];
          const entity = parts[3];
          const service = parts[4];
          const prog = parts[5];
          const nature = parts[6];
          const libelle = parts[7];
          const val = parseFloat(parts[8].replace(/\s/g, '').replace(/,/g, '.')) || 0;

          if (cat1 !== 'EMPLOIS') continue;

          const natLower = nature.toLowerCase();
          const isInvest = natLower.includes('investiss') || natLower.includes('capital') || natLower.includes('equipement');

          if (isInvest && val >= 10000000 && libelle && !libelle.toLowerCase().startsWith('provision') && !libelle.toLowerCase().startsWith('prendre en charge la tva')) {
            const category = detectCategoryFromExpense(nature, `${libelle} ${prog} ${entity}`);
            
            newProjects.push({
              id: `nat-proj-${detectedYear}-${Date.now()}-${i}`,
              title: libelle,
              details: `${prog} • Piloté par : ${entity} (${service})`,
              budget_amount_fcfa: val,
              fiscal_year: detectedYear,
              current_status: 'NOT_STARTED',
              progress_percentage: 0,
              contractor_name: "Attribution par appel d'offres / Marché public",
              category,
              region_name: 'National / Multi-Régions',
              commune_name: entity,
              institution_name: entity,
              ministry_name: entity,
              program_name: prog,
              service_name: service,
              nature_expense: 'Investissements',
              scope_level: 'NATIONAL',
              created_at: new Date().toISOString(),
              source: `Loi de Finances ${detectedYear} (DGBF)`,
            });
            totalAmountFcfa += val;
            successCount++;
          }
        } else {
          // Collectivités format
          let commune = parts[0] || 'Collectivité Locale';
          let region = parts[1] || 'Région';
          let details = parts[2] || 'Investissement public';
          let valStr = parts[3] || '0';

          if (parts.length >= 8) {
            region = parts[3] || 'Région';
            commune = parts[4] || 'Conseil Régional';
            details = parts[7] || 'Investissement régional';
            valStr = parts[8] || parts[7] || '0';
          }

          const val = parseFloat(valStr.replace(/\s/g, '').replace(/,/g, '.')) || 0;
          if (val >= 1000000) {
            const category = detectCategoryFromExpense(details, commune);
            newProjects.push({
              id: `loc-proj-${detectedYear}-${Date.now()}-${i}`,
              commune_name: commune,
              region_name: region,
              category,
              nature_expense: 'Investissements',
              title: details.length > 120 ? `${details.substring(0, 117)}...` : details,
              details,
              budget_amount_fcfa: val,
              fiscal_year: detectedYear,
              current_status: 'NOT_STARTED',
              progress_percentage: 0,
              contractor_name: "Marché public / Appel d'offres",
              scope_level: 'LOCAL',
              created_at: new Date().toISOString(),
              source: `Budget Primitif ${detectedYear}`,
            });
            totalAmountFcfa += val;
            successCount++;
          }
        }
      } catch {
        errorCount++;
      }
    }

    if (newProjects.length > 0) {
      if (options?.mode === 'REPLACE_YEAR') {
        this.projects = [...newProjects, ...this.projects.filter(p => p.fiscal_year !== detectedYear)];
      } else {
        this.projects = [...newProjects, ...this.projects];
      }
      this.updateSettings({ fiscal_year: detectedYear });
      this.saveProjects();
      this.notify();
    }

    return { successCount, errorCount, detectedYear, totalAmountFcfa };
  }

  // --- FULL BACKUP & RESTORE (JSON) ---
  public exportFullBackup(): string {
    const backupData = {
      version: '6.0',
      exported_at: new Date().toISOString(),
      projects: this.projects,
      institutions: this.institutions,
      articles: this.articles,
      proofs: this.proofs,
      settings: this.settings,
    };
    return JSON.stringify(backupData, null, 2);
  }

  public importFullBackup(jsonString: string): { success: boolean; message: string } {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') {
        return { success: false, message: 'Format de fichier JSON invalide.' };
      }

      if (Array.isArray(data.projects)) this.projects = data.projects;
      if (Array.isArray(data.institutions)) this.institutions = data.institutions;
      if (Array.isArray(data.articles)) this.articles = data.articles;
      if (Array.isArray(data.proofs)) this.proofs = data.proofs;
      if (data.settings && typeof data.settings === 'object') this.settings = { ...DEFAULT_SETTINGS, ...data.settings };

      this.saveProjects();
      this.saveInstitutions();
      this.saveArticles();
      this.saveProofs();
      this.saveSettings();
      this.notify();

      return { 
        success: true, 
        message: `Restauration réussie ! (${this.projects.length} projets, ${this.institutions.length} entités, ${this.articles.length} publications)` 
      };
    } catch (e: any) {
      return { success: false, message: `Erreur lors de la lecture du fichier : ${e.message}` };
    }
  }

  public resetToFactoryDefaults() {
    this.projects = [...RAW_BUDGET_PROJECTS];
    this.institutions = [...INSTITUTIONS_DATA];
    this.proofs = [...INITIAL_CITIZEN_PROOFS];
    this.articles = [...INITIAL_ARTICLES];
    this.caidpDirectory = [...CAIDP_MASTER_DIRECTORY];
    this.settings = { ...DEFAULT_SETTINGS };

    this.saveProjects();
    this.saveInstitutions();
    this.saveProofs();
    this.saveArticles();
    this.saveCaidpDirectory();
    this.saveSettings();
    this.notify();
  }

  // --- CAIDP RI DIRECTORY CRUD ---
  public getCaidpDirectory(): CaidpEntity[] {
    return [...this.caidpDirectory];
  }

  public findCaidpEntity(entityName: string): CaidpEntity | undefined {
    if (!entityName) return undefined;
    const clean = entityName.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .trim();

    return this.caidpDirectory.find(ri => {
      const comp = ri.company_name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, ' ')
        .trim();
      return comp.includes(clean) || clean.includes(comp);
    });
  }

  public updateCaidpEntity(id: string, updates: Partial<CaidpEntity>) {
    this.caidpDirectory = this.caidpDirectory.map(item => {
      if (item.id === id) {
        return { ...item, ...updates };
      }
      return item;
    });
    this.saveCaidpDirectory();
    this.notify();
  }

  public addCaidpEntity(entityData: Omit<CaidpEntity, 'id'>): CaidpEntity {
    const newEntity: CaidpEntity = {
      ...entityData,
      id: `caidp-custom-${Date.now()}`,
    };
    this.caidpDirectory.unshift(newEntity);
    this.saveCaidpDirectory();
    this.notify();
    return newEntity;
  }

  public deleteCaidpEntity(id: string) {
    this.caidpDirectory = this.caidpDirectory.filter(item => item.id !== id);
    this.saveCaidpDirectory();
    this.notify();
  }

  public resetCaidpDirectory() {
    this.caidpDirectory = [...CAIDP_MASTER_DIRECTORY];
    this.saveCaidpDirectory();
    this.notify();
  }

  public exportCaidpDirectoryToCSV(): string {
    const headers = ['ID', 'Organisme', 'Categorie', 'Region', 'Commune', 'Nom_RI', 'Fonction_RI', 'Email_RI', 'Telephone_RI', 'Source'];
    const rows = this.caidpDirectory.map(e => [
      sanitizeCsvCell(e.id),
      sanitizeCsvCell(e.company_name),
      sanitizeCsvCell(e.category),
      sanitizeCsvCell(e.region),
      sanitizeCsvCell(e.commune),
      sanitizeCsvCell(e.ri_name),
      sanitizeCsvCell(e.ri_function),
      sanitizeCsvCell(e.email),
      sanitizeCsvCell(e.phone),
      sanitizeCsvCell(e.source),
    ]);
    return [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  }

  public importCaidpDirectoryFromCSV(csvText: string): { successCount: number; errorCount: number } {
    let successCount = 0;
    let errorCount = 0;
    const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length <= 1) return { successCount: 0, errorCount: 0 };

    const delimiter = lines[0].includes(';') ? ';' : ',';

    for (let i = 1; i < lines.length; i++) {
      try {
        const parts = lines[i].split(delimiter).map(p => p.trim().replace(/^"/, '').replace(/"$/, ''));
        if (parts.length < 3) continue;

        const orgName = parts[1] || parts[0];
        const category = (parts[2] as any) || 'SOCIETE_ETAT';
        const riName = parts[5] || parts[2] || '';
        const riFunc = parts[6] || parts[3] || '';
        const email = parts[7] || parts[4] || "Pas d'email";
        const phone = parts[8] || parts[5] || "Pas de numéro";

        const existingIdx = this.caidpDirectory.findIndex(e => 
          e.company_name.toLowerCase().trim() === orgName.toLowerCase().trim()
        );

        if (existingIdx !== -1) {
          this.caidpDirectory[existingIdx] = {
            ...this.caidpDirectory[existingIdx],
            ri_name: riName || this.caidpDirectory[existingIdx].ri_name,
            ri_function: riFunc || this.caidpDirectory[existingIdx].ri_function,
            email: email || this.caidpDirectory[existingIdx].email,
            phone: phone || this.caidpDirectory[existingIdx].phone,
            source: "Importé par l'Admin"
          };
        } else {
          this.caidpDirectory.push({
            id: `caidp-import-${Date.now()}-${i}`,
            company_name: orgName,
            category: category,
            region: parts[3] || 'Côte d\'Ivoire',
            commune: parts[4] || '',
            ri_name: riName || 'Non désigné',
            ri_function: riFunc || "Service d'Accès aux Documents Publics",
            email: email || "Pas d'email",
            phone: phone || "Pas de numéro",
            source: "Importé par l'Admin"
          });
        }
        successCount++;
      } catch (err) {
        errorCount++;
      }
    }

    this.saveCaidpDirectory();
    this.notify();
    return { successCount, errorCount };
  }

  // --- PERSISTENCE HELPERS ---
  private saveProjects() {
    try {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(this.projects));
    } catch (e) {
      console.warn("Storage quota exceeded for projects", e);
    }
  }

  private saveInstitutions() {
    try {
      localStorage.setItem(STORAGE_KEYS.INSTITUTIONS, JSON.stringify(this.institutions));
    } catch (e) {
      console.warn("Storage quota exceeded for institutions", e);
    }
  }

  private saveProofs() {
    try {
      localStorage.setItem(STORAGE_KEYS.PROOFS, JSON.stringify(this.proofs));
    } catch (e) {
      console.warn("Storage quota exceeded for proofs", e);
    }
  }

  private saveArticles() {
    try {
      localStorage.setItem(STORAGE_KEYS.ARTICLES, JSON.stringify(this.articles));
    } catch (e) {
      console.warn("Storage quota exceeded for articles", e);
    }
  }

  private saveCaidpDirectory() {
    try {
      localStorage.setItem(STORAGE_KEYS.CAIDP_RI, JSON.stringify(this.caidpDirectory));
    } catch (e) {
      console.warn("Storage quota exceeded for caidp directory", e);
    }
  }

  private saveDocuments() {
    try {
      localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(this.documents));
    } catch (e) {
      console.warn("Storage quota exceeded for public documents", e);
    }
  }

  // ==========================================
  // NEWSLETTER & CITIZEN ALERTS SUBSCRIBERS
  // ==========================================
  public subscribeNewsletter(firstName: string, email: string, commune: string): { success: boolean; message: string } {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: "Veuillez fournir une adresse email valide." };
    }

    const exists = this.subscribers.find(s => s.email.toLowerCase() === cleanEmail);
    if (exists) {
      return { success: true, message: "Vous êtes déjà inscrit aux alertes citoyennes !" };
    }

    const newSub: NewsletterSubscriber = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      first_name: firstName.trim() || 'Citoyen',
      email: cleanEmail,
      commune: commune.trim() || 'Côte d\'Ivoire',
      created_at: new Date().toISOString(),
    };

    this.subscribers.push(newSub);
    this.saveSubscribers();
    this.notify();

    // Live Supabase Insert (if configured)
    if (isSupabaseConfigured()) {
      safeSupabaseExec(
        supabase.from('newsletter_subscribers').insert([{
          id: newSub.id,
          first_name: newSub.first_name,
          email: newSub.email,
          commune: newSub.commune,
        }]),
        'Inscription Newsletter'
      );
    }

    return { success: true, message: "Inscription réussie ! Vous recevrez nos prochaines alertes citoyennes." };
  }

  public getSubscribers(): NewsletterSubscriber[] {
    return [...this.subscribers];
  }

  private saveSubscribers() {
    try {
      localStorage.setItem(STORAGE_KEYS.SUBSCRIBERS, JSON.stringify(this.subscribers));
    } catch (e) {
      console.warn("Storage quota exceeded for subscribers", e);
    }
  }

  // ==========================================
  // CAIDP REQUESTS & ANALYTICS TRACKING
  // ==========================================
  public logCaidpRequest(event: Omit<CaidpRequestEvent, 'id' | 'created_at'>): CaidpRequestEvent {
    const newLog: CaidpRequestEvent = {
      ...event,
      id: `caidp-req-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      created_at: new Date().toISOString(),
    };

    this.caidpLogs.unshift(newLog); // latest first
    this.saveCaidpLogs();
    this.notify();

    if (isSupabaseConfigured()) {
      safeSupabaseExec(
        supabase.from('caidp_document_requests_log').insert([newLog]),
        'Enregistrement statistique requête CAIDP'
      );
    }

    return newLog;
  }

  public getCaidpRequests(): CaidpRequestEvent[] {
    return [...this.caidpLogs];
  }

  public getCaidpRequestStats(): CaidpRequestStats {
    const totalRequests = this.caidpLogs.length;
    let emailSentCount = 0;
    let printPdfCount = 0;
    let copiedCount = 0;
    let withRiCount = 0;
    let withoutRiCount = 0;
    const byEntityType: Record<string, number> = {
      MAIRIE: 0,
      REGION: 0,
      MINISTERE: 0,
      INSTITUTION: 0,
      AUTORITE_REGULATION: 0,
      PROJECT: 0,
    };
    const docCountMap: Record<string, number> = {};

    for (const log of this.caidpLogs) {
      if (log.action_type === 'EMAIL_SENT') emailSentCount++;
      else if (log.action_type === 'PRINT_PDF') printPdfCount++;
      else if (log.action_type === 'COPIED') copiedCount++;

      if (log.has_ri) withRiCount++;
      else withoutRiCount++;

      if (log.entity_type) {
        byEntityType[log.entity_type] = (byEntityType[log.entity_type] || 0) + 1;
      }

      if (Array.isArray(log.document_titles)) {
        for (const title of log.document_titles) {
          docCountMap[title] = (docCountMap[title] || 0) + 1;
        }
      }
    }

    const topDocuments = Object.entries(docCountMap)
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalRequests,
      emailSentCount,
      printPdfCount,
      copiedCount,
      withRiCount,
      withoutRiCount,
      byEntityType,
      topDocuments,
      recentEvents: this.caidpLogs.slice(0, 50),
    };
  }

  public clearCaidpRequests(): void {
    this.caidpLogs = [];
    this.saveCaidpLogs();
    this.notify();
  }

  private saveCaidpLogs() {
    try {
      localStorage.setItem(STORAGE_KEYS.CAIDP_LOGS, JSON.stringify(this.caidpLogs.slice(0, 500)));
    } catch (e) {
      console.warn("Storage quota exceeded for caidp logs", e);
    }
  }

  private saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    } catch (e) {
      console.warn("Storage quota exceeded for settings", e);
    }
  }
}

export const dataStore = new DataStore();
