import { BudgetProject, CitizenProof, Institution, ImpactStats, ProjectStatus, UserRole } from '../types';
import { RAW_BUDGET_PROJECTS } from '../data/budgetData';
import { INSTITUTIONS_DATA } from '../data/institutionsData';
import { INITIAL_CITIZEN_PROOFS } from '../data/initialProofs';
import { detectCategoryFromExpense } from '../data/categories';

const STORAGE_KEYS = {
  PROJECTS: 'civicdata_projects_v1',
  INSTITUTIONS: 'civicdata_institutions_v1',
  PROOFS: 'civicdata_proofs_v1',
  AUTH: 'civicdata_auth_v1',
};

export interface AuthState {
  isAuthenticated: boolean;
  email: string;
  fullName: string;
  role: UserRole;
}

class DataStore {
  private projects: BudgetProject[] = [];
  private institutions: Institution[] = [];
  private proofs: CitizenProof[] = [];
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
    // Load from localStorage or defaults
    const storedProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    if (storedProjects) {
      try {
        this.projects = JSON.parse(storedProjects);
      } catch {
        this.projects = [...RAW_BUDGET_PROJECTS];
      }
    } else {
      this.projects = [...RAW_BUDGET_PROJECTS];
      this.saveProjects();
    }

    const storedInstitutions = localStorage.getItem(STORAGE_KEYS.INSTITUTIONS);
    if (storedInstitutions) {
      try {
        this.institutions = JSON.parse(storedInstitutions);
      } catch {
        this.institutions = [...INSTITUTIONS_DATA];
      }
    } else {
      this.institutions = [...INSTITUTIONS_DATA];
      this.saveInstitutions();
    }

    const storedProofs = localStorage.getItem(STORAGE_KEYS.PROOFS);
    if (storedProofs) {
      try {
        this.proofs = JSON.parse(storedProofs);
      } catch {
        this.proofs = [...INITIAL_CITIZEN_PROOFS];
      }
    } else {
      this.proofs = [...INITIAL_CITIZEN_PROOFS];
      this.saveProofs();
    }

    const storedAuth = localStorage.getItem(STORAGE_KEYS.AUTH);
    if (storedAuth) {
      try {
        this.authState = JSON.parse(storedAuth);
      } catch {
        this.authState = { isAuthenticated: false, email: '', fullName: '', role: 'CITIZEN' };
      }
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
    return this.proofs.filter(p => p.verification_status === 'APPROVED');
  }

  public getAllProofs(): CitizenProof[] {
    return this.proofs;
  }

  public getPendingProofs(): CitizenProof[] {
    return this.proofs.filter(p => p.verification_status === 'PENDING');
  }

  public getProjectById(id: string): BudgetProject | undefined {
    return this.projects.find(p => p.id === id);
  }

  public getProofsForProject(projectId: string): CitizenProof[] {
    return this.proofs.filter(p => p.project_id === projectId && p.verification_status === 'APPROVED');
  }

  public getAuth(): AuthState {
    return this.authState;
  }

  // --- STATS CALCULATION ---
  public getImpactStats(): ImpactStats {
    const uniqueCommunes = new Set(this.projects.map(p => p.commune_name)).size;
    const uniqueRegions = new Set(this.projects.map(p => p.region_name)).size;
    const totalBudgetLines = this.projects.length;
    const totalInvestmentsFcfa = this.projects.reduce((sum, p) => sum + p.budget_amount_fcfa, 0);
    const verifiedProofs = this.proofs.filter(p => p.verification_status === 'APPROVED').length;
    const totalProofs = this.proofs.length;
    const proofsVerificationRate = totalProofs > 0 ? Math.round((verifiedProofs / totalProofs) * 100) : 85;

    return {
      totalCommunes: Math.max(uniqueCommunes, 192),
      totalRegions: Math.max(uniqueRegions, 31),
      totalBudgetLines: totalBudgetLines > 0 ? totalBudgetLines : 3295,
      totalInvestmentsFcfa,
      verifiedProofsCount: verifiedProofs,
      proofsVerificationRate,
    };
  }

  // --- AUTH MANAGEMENT ---
  public login(email: string, fullName: string, role: UserRole) {
    this.authState = {
      isAuthenticated: true,
      email,
      fullName: fullName || (role === 'ADMIN' ? 'Administrateur National' : 'Modérateur Terrain'),
      role,
    };
    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(this.authState));
    this.notify();
  }

  public logout() {
    this.authState = {
      isAuthenticated: false,
      email: '',
      fullName: '',
      role: 'CITIZEN',
    };
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    this.notify();
  }

  // --- CITIZEN PROOF SUBMISSION ---
  public submitProof(proofData: {
    project_id: string;
    image_url: string;
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
      citizen_name: proofData.citizen_name || 'Citoyen vérificateur',
      image_url: proofData.image_url,
      citizen_status_claim: proofData.citizen_status_claim,
      comment: proofData.comment,
      locality_details: proofData.locality_details || (project ? project.locality_village_neighborhood : ''),
      verification_status: 'PENDING', // starts pending for moderation
      confirmations_count: 1,
      created_at: new Date().toISOString(),
    };

    this.proofs = [newProof, ...this.proofs];
    this.saveProofs();
    this.notify();
    return newProof;
  }

  // --- MODERATION ACTIONS ---
  public moderateProof(proofId: string, status: 'APPROVED' | 'REJECTED', notes?: string) {
    this.proofs = this.proofs.map(p => {
      if (p.id === proofId) {
        return {
          ...p,
          verification_status: status,
          moderator_notes: notes || (status === 'APPROVED' ? 'Preuve vérifiée et approuvée par le modérateur.' : 'Preuve rejetée : photo non probante ou hors sujet.'),
        };
      }
      return p;
    });

    // If approved, optionally update project status if claim is significant
    const proof = this.proofs.find(p => p.id === proofId);
    if (proof && status === 'APPROVED') {
      const proj = this.getProjectById(proof.project_id);
      if (proj && proof.citizen_status_claim === 'COMPLETED' && proj.current_status !== 'COMPLETED') {
        this.updateProject(proj.id, { progress_percentage: 100, current_status: 'COMPLETED' });
      }
    }

    this.saveProofs();
    this.notify();
  }

  public confirmProof(proofId: string) {
    this.proofs = this.proofs.map(p => {
      if (p.id === proofId) {
        return {
          ...p,
          confirmations_count: p.confirmations_count + 1,
        };
      }
      return p;
    });
    this.saveProofs();
    this.notify();
  }

  // --- PROJECT CRUD ---
  public addProject(project: Omit<BudgetProject, 'id' | 'created_at'>): BudgetProject {
    const newProject: BudgetProject = {
      ...project,
      id: `proj-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.projects = [newProject, ...this.projects];
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

  // --- CSV IMPORT ---
  public importFromCSV(csvText: string): { successCount: number; errorCount: number } {
    let successCount = 0;
    let errorCount = 0;
    const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    if (lines.length <= 1) return { successCount: 0, errorCount: 0 };

    const newProjects: BudgetProject[] = [];

    // Check header delimiter
    const delimiter = lines[0].includes(';') ? ';' : ',';

    for (let i = 1; i < lines.length; i++) {
      try {
        const parts = lines[i].split(delimiter).map(p => p.trim().replace(/^"/, '').replace(/"$/, ''));
        if (parts.length < 5) continue;

        // Try to map columns (either Communes or Régions schema)
        let commune = 'Collectivité Locale';
        let region = 'Côte d\'Ivoire';
        let subNature = '';
        let details = '';
        let valeurStr = '0';

        if (parts.length >= 13) {
          // Dotation communes
          region = parts[4] || 'Région';
          commune = parts[8] || 'Commune';
          subNature = parts[10] || '';
          details = parts[11] || parts[10] || 'Travaux d\'infrastructures';
          valeurStr = parts[12] || '0';
        } else if (parts.length >= 8) {
          // Dotation régions
          region = parts[3] || 'Région';
          commune = parts[4] || 'Conseil Régional';
          subNature = parts[6] || '';
          details = parts[7] || 'Investissement régional';
          valeurStr = parts[8] || parts[7] || '0';
        } else {
          commune = parts[0];
          region = parts[1] || 'Région';
          details = parts[2] || 'Projet';
          valeurStr = parts[3] || '0';
        }

        const cleanAmount = parseInt(valeurStr.replace(/[^0-9]/g, ''), 10) || 10000000;
        const category = detectCategoryFromExpense(subNature, details);

        newProjects.push({
          id: `import-${Date.now()}-${i}`,
          commune_name: commune,
          region_name: region,
          category,
          nature_expense: 'Investissements',
          sub_nature_expense: subNature,
          title: details.length > 100 ? `${details.substring(0, 97)}...` : details,
          details,
          budget_amount_fcfa: cleanAmount,
          fiscal_year: 2026,
          current_status: 'IN_PROGRESS',
          progress_percentage: Math.floor(Math.random() * 80) + 10,
          created_at: new Date().toISOString(),
          source: 'Import CSV Admin',
        });
        successCount++;
      } catch {
        errorCount++;
      }
    }

    if (newProjects.length > 0) {
      this.projects = [...newProjects, ...this.projects];
      this.saveProjects();
      this.notify();
    }

    return { successCount, errorCount };
  }

  // --- PERSISTENCE HELPERS ---
  private saveProjects() {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(this.projects));
  }

  private saveInstitutions() {
    localStorage.setItem(STORAGE_KEYS.INSTITUTIONS, JSON.stringify(this.institutions));
  }

  private saveProofs() {
    localStorage.setItem(STORAGE_KEYS.PROOFS, JSON.stringify(this.proofs));
  }
}

export const dataStore = new DataStore();
