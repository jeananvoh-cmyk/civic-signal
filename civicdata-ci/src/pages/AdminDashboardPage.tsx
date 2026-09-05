import { matchesSmartSearch, normalizeSearchText } from '../utils/searchHelpers';
import { AuthSecurityService } from '../services/authSecurity';
import React, { useState, useMemo } from 'react';
import { BudgetProject, ProjectStatus, Institution, NewsArticle, SiteSettings } from '../types';
import { dataStore } from '../services/dataStore';
import { formatFCFA, formatDateFR, getStatusConfig, formatAmountInWords } from '../utils/formatters';
import { SocialPostGenerator } from '../components/SocialPostGenerator';
import { CaidpRiManager } from '../components/CaidpRiManager';
import { ModeratorManager } from '../components/ModeratorManager';
import { DocumentManager } from '../components/DocumentManager';
import { CaidpAnalyticsManager } from '../components/CaidpAnalyticsManager';
import { 
  ShieldCheck, 
  CheckCircle2, 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Sparkles, 
  Share2, 
  Clock, 
  Check, 
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Camera,
  Video,
  Landmark,
  Building2,
  Globe,
  User,
  Users,
  ExternalLink,
  Image as ImageIcon,
  Newspaper,
  Settings,
  Database,
  RefreshCw,
  AlertTriangle,
  FileText,
  Eye,
  Megaphone,
  Layers,
  LogOut,
  BarChart3
} from 'lucide-react';

interface AdminDashboardPageProps {
  onSelectProject?: (project: BudgetProject) => void;
  onOpenShare: (project: BudgetProject) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  onOpenShare,
}) => {
  const auth = dataStore.getAuth();
  const [adminTab, setAdminTab] = useState<'caidp_manager' | 'caidp_analytics' | 'documents_manager' | 'moderation' | 'budget_table' | 'institutions_manager' | 'news_manager' | 'social_generator' | 'site_settings' | 'digital_opportunities' | 'team_moderators'>(
    auth.role === 'MODERATOR' ? 'moderation' : 'caidp_manager'
  );
  
  // Data from store
  const allProjects = dataStore.getProjects();
  const pendingProofs = dataStore.getPendingProofs();
  const allInstitutions = dataStore.getInstitutions();
  const allArticles = dataStore.getArticles();
  const siteSettings = dataStore.getSettings();

  // Notification Toast State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ==========================================
  // 1. BUDGET TABLE STATE
  // ==========================================
  const [tableSearch, setTableSearch] = useState('');
  const [tableRegionFilter, setTableRegionFilter] = useState('ALL');
  const [tableCategoryFilter, setTableCategoryFilter] = useState('ALL');
  const [tableStatusFilter, setTableStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<keyof BudgetProject>('budget_amount_fcfa');
  const [sortAsc, setSortAsc] = useState(false);

  // Add / Edit Project Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<BudgetProject | null>(null);
  const [projectForm, setProjectForm] = useState({
    title: '',
    commune_name: '',
    region_name: '',
    category: 'Santé',
    budget_amount_fcfa: 25000000,
    current_status: 'IN_PROGRESS' as ProjectStatus,
    progress_percentage: 50,
    contractor_name: '',
    locality_village_neighborhood: '',
    details: '',
  });

  // CSV Import State
  // Security & Password Change State in Settings
  const [newDashboardPassword, setNewDashboardPassword] = useState('');
  const [confirmDashboardPassword, setConfirmDashboardPassword] = useState('');
  const [pwdChangeError, setPwdChangeError] = useState<string | null>(null);
  const [pwdChangeSuccess, setPwdChangeSuccess] = useState<string | null>(null);
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  const handleDashboardChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdChangeError(null);
    setPwdChangeSuccess(null);

    if (newDashboardPassword !== confirmDashboardPassword) {
      setPwdChangeError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setIsChangingPwd(true);
    try {
      const res = await AuthSecurityService.updateAdminPassword(newDashboardPassword);
      setIsChangingPwd(false);
      if (res.success) {
        setPwdChangeSuccess(' Mot de passe administrateur mis à jour et sécurisé avec succès !');
        setNewDashboardPassword('');
        setConfirmDashboardPassword('');
      } else {
        setPwdChangeError(res.error || 'Erreur lors du changement de mot de passe.');
      }
    } catch (err: any) {
      setIsChangingPwd(false);
      setPwdChangeError('Erreur : ' + err.message);
    }
  };

  const [csvUploadText, setCsvUploadText] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTargetYear, setImportTargetYear] = useState<string>('AUTO');
  const [importMode, setImportMode] = useState<'REPLACE_YEAR' | 'APPEND'>('REPLACE_YEAR');
  const [importStatus, setImportStatus] = useState<{ success?: number; error?: number; detectedYear?: number; totalAmount?: number } | null>(null);

  // Handle direct file upload via input
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCsvUploadText(content);
        showToast(`Fichier "${file.name}" chargé (${(file.size / 1024).toFixed(1)} Ko). Prêt pour l'importation.`, 'info');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Moderation action
  const handleModerate = (proofId: string, status: 'APPROVED' | 'REJECTED') => {
    dataStore.moderateProof(proofId, status);
    showToast(status === 'APPROVED' ? 'Preuve citoyenne validée et publiée !' : 'Preuve rejetée.', 'info');
  };

  // Filter and sort for budget table
  const filteredTableProjects = useMemo(() => {
    return allProjects.filter(p => {
      const matchesSearch = !tableSearch || matchesSmartSearch(
        [p.title, p.commune_name, p.region_name, p.category, p.locality_village_neighborhood, p.contractor_name],
        tableSearch
      );
      const matchesRegion = tableRegionFilter === 'ALL' || normalizeSearchText(p.region_name) === normalizeSearchText(tableRegionFilter);
      const matchesCat = tableCategoryFilter === 'ALL' || normalizeSearchText(p.category) === normalizeSearchText(tableCategoryFilter);
      const matchesStatus = tableStatusFilter === 'ALL' || p.current_status === tableStatusFilter;

      return matchesSearch && matchesRegion && matchesCat && matchesStatus;
    });
  }, [allProjects, tableSearch, tableRegionFilter, tableCategoryFilter, tableStatusFilter]);

  const sortedTableProjects = useMemo(() => {
    return [...filteredTableProjects].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal === undefined || bVal === undefined) return 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      return sortAsc 
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [filteredTableProjects, sortField, sortAsc]);

  const totalPages = Math.ceil(sortedTableProjects.length / pageSize) || 1;
  const paginatedProjects = sortedTableProjects.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (field: keyof BudgetProject) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
    }
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProject) {
      dataStore.updateProject(editingProject.id, projectForm);
      showToast('Projet mis à jour avec succès !');
    } else {
      dataStore.addProject({
        ...projectForm,
        fiscal_year: siteSettings.fiscal_year || 2026,
        nature_expense: 'Investissements',
      });
      showToast('Nouveau projet ajouté au catalogue !');
    }
    setIsAddModalOpen(false);
    setEditingProject(null);
  };

  const handleProcessImportCSV = () => {
    if (!csvUploadText.trim()) return;
    const targetYear = importTargetYear === 'AUTO' ? undefined : parseInt(importTargetYear, 10);
    const result = dataStore.importFromCSV(csvUploadText, {
      mode: importMode,
      targetYear
    });

    setImportStatus({ 
      success: result.successCount, 
      error: result.errorCount,
      detectedYear: result.detectedYear,
      totalAmount: result.totalAmountFcfa
    });

    showToast(` ${result.successCount} projets importés avec succès pour l'exercice ${result.detectedYear} !`);
    setTimeout(() => {
      setIsImportModalOpen(false);
      setCsvUploadText('');
      setImportStatus(null);
    }, 2500);
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Commune', 'Region', 'Categorie', 'Titre', 'Budget_FCFA', 'Statut', 'Avancement'];
    const rows = sortedTableProjects.map(p => [
      p.id,
      `"${p.commune_name}"`,
      `"${p.region_name}"`,
      `"${p.category}"`,
      `"${p.title.replace(/"/g, '""')}"`,
      p.budget_amount_fcfa,
      p.current_status,
      `${p.progress_percentage}%`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `civicdata_projets_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exportation CSV terminée !');
  };

  // ==========================================
  // 2. INSTITUTIONS & DIRECTORY STATE
  // ==========================================
  const [instSearch, setInstSearch] = useState('');
  const [instTypeFilter, setInstTypeFilter] = useState<'ALL' | 'MAIRIE' | 'REGION' | 'INSTITUTION' | 'MINISTERE' | 'AUTORITE_REGULATION'>('ALL');
  const [instStatusFilter, setInstStatusFilter] = useState<'ALL' | 'NO_PHOTO' | 'NO_WEBSITE' | 'NO_FACEBOOK' | 'NO_DIGITAL'>('ALL');
  const [instPage, setInstPage] = useState(1);
  const [instPageSize, setInstPageSize] = useState(12);
  const [isEditInstModalOpen, setIsEditInstModalOpen] = useState(false);
  const [isCreateInstModalOpen, setIsCreateInstModalOpen] = useState(false);
  const [editingInst, setEditingInst] = useState<Institution | null>(null);
  const [instForm, setInstForm] = useState({
    name: '',
    type: 'MAIRIE' as Institution['type'],
    region: '',
    district: '',
    departement: '',
    leader_name: '',
    leader_title: '',
    leader_photo_url: '',
    website: '',
    facebook_url: '',
    contact_email: '',
    contact_phone: '',
    info_officer_title: "Service d'Accès aux Documents Publics (Loi n°2013-867)",
    political_party: '',
    mission_summary: '',
    budget_functioning_fcfa: 0,
    budget_investment_fcfa: 0,
    total_budget_fcfa: 0,
  });

  const isSyntheticWeb = (url?: string) => !url || url.trim() === '' || url.includes('mairie-mairie') || url.includes('example');
  const isSyntheticFb = (url?: string) => !url || url.trim() === '' || url.includes('example');
  const hasPhoto = (url?: string) => Boolean(url && url.trim() !== '');

  const instStats = useMemo(() => {
    const total = allInstitutions.length;
    const withoutPhoto = allInstitutions.filter(i => !hasPhoto(i.leader_photo_url));
    const withoutWeb = allInstitutions.filter(i => isSyntheticWeb(i.website));
    const withoutFb = allInstitutions.filter(i => isSyntheticFb(i.facebook_url));
    const withoutDigital = allInstitutions.filter(i => isSyntheticWeb(i.website) && isSyntheticFb(i.facebook_url));

    return {
      total,
      withoutPhotoCount: withoutPhoto.length,
      withoutWebCount: withoutWeb.length,
      withoutFbCount: withoutFb.length,
      withoutDigitalCount: withoutDigital.length,
      withPhotoCount: total - withoutPhoto.length,
      withWebCount: total - withoutWeb.length,
      withFbCount: total - withoutFb.length,
    };
  }, [allInstitutions]);

  const filteredInstitutions = useMemo(() => {
    return allInstitutions.filter((inst) => {
      // Type Filter
      if (instTypeFilter !== 'ALL' && inst.type !== instTypeFilter) return false;

      // Status Filter
      if (instStatusFilter === 'NO_PHOTO' && hasPhoto(inst.leader_photo_url)) return false;
      if (instStatusFilter === 'NO_WEBSITE' && !isSyntheticWeb(inst.website)) return false;
      if (instStatusFilter === 'NO_FACEBOOK' && !isSyntheticFb(inst.facebook_url)) return false;
      if (instStatusFilter === 'NO_DIGITAL' && (!isSyntheticWeb(inst.website) || !isSyntheticFb(inst.facebook_url))) return false;

      // Search Query
      if (!instSearch.trim()) return true;
      const q = instSearch.toLowerCase().trim();
      return (
        inst.name.toLowerCase().includes(q) ||
        (inst.region && inst.region.toLowerCase().includes(q)) ||
        (inst.leader_name && inst.leader_name.toLowerCase().includes(q)) ||
        (inst.district && inst.district.toLowerCase().includes(q))
      );
    });
  }, [allInstitutions, instTypeFilter, instStatusFilter, instSearch]);

  const totalInstPages = Math.ceil(filteredInstitutions.length / instPageSize) || 1;
  const paginatedInstitutions = filteredInstitutions.slice(
    (instPage - 1) * instPageSize,
    instPage * instPageSize
  );

  // ==========================================
  // 3. DIGITAL PROSPECTS & WEBSITES STATE
  // ==========================================
  const [prospectSearch, setProspectSearch] = useState('');
  const [prospectTypeFilter, setProspectTypeFilter] = useState<'ALL' | 'MAIRIE' | 'REGION'>('ALL');
  const [prospectPage, setProspectPage] = useState(1);
  const prospectPageSize = 15;

  const filteredProspects = useMemo(() => {
    return allInstitutions.filter((inst) => {
      // Must not have a verified website
      const hasRealWeb = inst.website && inst.website.trim() !== '' && !inst.website.includes('mairie-mairie') && !inst.website.includes('example');
      if (hasRealWeb) return false;

      // Filter by type
      if (prospectTypeFilter === 'MAIRIE' && inst.type !== 'MAIRIE') return false;
      if (prospectTypeFilter === 'REGION' && inst.type !== 'REGION') return false;

      if (!prospectSearch.trim()) return true;
      const q = prospectSearch.toLowerCase().trim();
      return (
        inst.name.toLowerCase().includes(q) ||
        (inst.region && inst.region.toLowerCase().includes(q)) ||
        (inst.leader_name && inst.leader_name.toLowerCase().includes(q)) ||
        (inst.district && inst.district.toLowerCase().includes(q))
      );
    });
  }, [allInstitutions, prospectTypeFilter, prospectSearch]);

  const totalProspectPages = Math.ceil(filteredProspects.length / prospectPageSize) || 1;
  const paginatedProspects = filteredProspects.slice(
    (prospectPage - 1) * prospectPageSize,
    prospectPage * prospectPageSize
  );

  const handleExportProspectsCsv = () => {
    const prospects = allInstitutions.filter(i => isSyntheticWeb(i.website));
    const headers = ['Type', 'Nom de la Collectivite', 'Region', 'District', 'Maire_ou_President', 'Budget_Total_FCFA', 'Telephone', 'Email', 'Page_Facebook'];
    const rows = prospects.map(p => [
      `"${p.type}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.region || '').replace(/"/g, '""')}"`,
      `"${(p.district || '').replace(/"/g, '""')}"`,
      `"${(p.leader_name || '').replace(/"/g, '""')}"`,
      `"${p.total_budget_fcfa || 0}"`,
      `"${(p.contact_phone || p.info_officer_phone || '').replace(/"/g, '""')}"`,
      `"${(p.contact_email || p.info_officer_email || '').replace(/"/g, '""')}"`,
      `"${(p.facebook_url || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Collectivites_Cibles_Sans_Site_Web_CI_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export CSV des 216 collectivités téléchargé avec succès !');
  };

  const handleDownloadWhitepaper = () => {
    const a = document.createElement('a');
    a.href = '/documents/LIVRE_BLANC_PORTAILS_WEB_COLLECTIVITES_CI.md';
    a.download = 'LIVRE_BLANC_PORTAILS_WEB_COLLECTIVITES_CI.md';
    a.click();
    showToast('Livre Blanc & Dossier Stratégique téléchargé !');
  };

  const handleOpenEditInst = (inst: Institution) => {
    setEditingInst(inst);
    setInstForm({
      name: inst.name,
      type: inst.type,
      region: inst.region || '',
      district: inst.district || '',
      departement: inst.departement || '',
      leader_name: inst.leader_name || '',
      leader_title: inst.leader_title || (inst.type === 'REGION' ? 'Président du Conseil Régional' : inst.type === 'MAIRIE' ? 'Maire de la Commune' : 'Président'),
      leader_photo_url: inst.leader_photo_url || '',
      website: inst.website || '',
      facebook_url: inst.facebook_url || '',
      contact_email: inst.contact_email || '',
      contact_phone: inst.contact_phone || '',
      info_officer_title: inst.info_officer_title || "Service d'Accès aux Documents Publics (Loi n°2013-867)",
      political_party: inst.political_party || '',
      mission_summary: inst.mission_summary || '',
      budget_functioning_fcfa: inst.budget_functioning_fcfa || 0,
      budget_investment_fcfa: inst.budget_investment_fcfa || 0,
      total_budget_fcfa: inst.total_budget_fcfa || 0,
    });
    setIsEditInstModalOpen(true);
  };

  const handleOpenCreateInst = () => {
    setEditingInst(null);
    setInstForm({
      name: '',
      type: instTypeFilter === 'ALL' ? 'MAIRIE' : instTypeFilter,
      region: 'Abidjan',
      district: "Autonome d'Abidjan",
      departement: 'Plateau',
      leader_name: '',
      leader_title: 'Premier Responsable',
      leader_photo_url: '',
      website: '',
      facebook_url: '',
      contact_email: '',
      contact_phone: '',
      info_officer_title: "Service d'Accès aux Documents Publics (Loi n°2013-867)",
      political_party: '',
      mission_summary: '',
      budget_functioning_fcfa: 0,
      budget_investment_fcfa: 0,
      total_budget_fcfa: 0,
    });
    setIsCreateInstModalOpen(true);
  };

  const handleSaveInstitution = (e: React.FormEvent) => {
    e.preventDefault();
    const total = (instForm.budget_functioning_fcfa || 0) + (instForm.budget_investment_fcfa || 0);
    
    if (editingInst) {
      const updated: Institution = {
        ...editingInst,
        ...instForm,
        total_budget_fcfa: total > 0 ? total : (instForm.total_budget_fcfa || editingInst.total_budget_fcfa),
      };
      dataStore.updateInstitution(updated);
      showToast('Informations et photo de l\'entité mises à jour !');
      setIsEditInstModalOpen(false);
      setEditingInst(null);
    } else {
      dataStore.addInstitution({
        ...instForm,
        total_budget_fcfa: total > 0 ? total : instForm.total_budget_fcfa,
      });
      showToast('Nouvelle entité ajoutée avec succès !');
      setIsCreateInstModalOpen(false);
    }
  };

  const handleDeleteInstitution = (id: string, name: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'entité "${name}" ?`)) {
      dataStore.deleteInstitution(id);
      showToast('Entité supprimée.');
    }
  };

  // ==========================================
  // 3. NEWS & REPORTS (CMS) STATE
  // ==========================================
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  const [articleForm, setArticleForm] = useState({
    title: '',
    category: 'ACTUALITE' as NewsArticle['category'],
    summary: '',
    content: '',
    cover_image_url: '',
    document_url: '',
    document_name: '',
    author_name: 'Rédaction SuiviBudget CI',
    is_featured: false,
  });

  const handleOpenEditArticle = (art: NewsArticle) => {
    setEditingArticle(art);
    setArticleForm({
      title: art.title,
      category: art.category,
      summary: art.summary,
      content: art.content,
      cover_image_url: art.cover_image_url || '',
      document_url: art.document_url || '',
      document_name: art.document_name || '',
      author_name: art.author_name || 'Rédaction SuiviBudget CI',
      is_featured: Boolean(art.is_featured),
    });
    setIsArticleModalOpen(true);
  };

  const handleOpenCreateArticle = () => {
    setEditingArticle(null);
    setArticleForm({
      title: '',
      category: 'ACTUALITE',
      summary: '',
      content: '',
      cover_image_url: '',
      document_url: '',
      document_name: '',
      author_name: 'Rédaction SuiviBudget CI',
      is_featured: false,
    });
    setIsArticleModalOpen(true);
  };

  const handleSaveArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingArticle) {
      dataStore.updateArticle(editingArticle.id, articleForm);
      showToast('Publication mise à jour !');
    } else {
      dataStore.addArticle(articleForm);
      showToast('Nouvel article / rapport publié avec succès !');
    }
    setIsArticleModalOpen(false);
    setEditingArticle(null);
  };

  const handleDeleteArticle = (id: string, title: string) => {
    if (confirm(`Supprimer la publication "${title}" ?`)) {
      dataStore.deleteArticle(id);
      showToast('Publication supprimée.');
    }
  };

  // ==========================================
  // 4. SITE SETTINGS & BACKUP / RESTORE
  // ==========================================
  const [settingsForm, setSettingsForm] = useState<SiteSettings>({ ...siteSettings });
  const [backupJsonInput, setBackupJsonInput] = useState('');
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    dataStore.updateSettings(settingsForm);
    showToast('Paramètres généraux du site enregistrés !');
  };

  const handleDownloadBackup = () => {
    const jsonStr = dataStore.exportFullBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `civicdata_sauvegarde_complete_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Fichier de sauvegarde téléchargé ! Conservez-le précieusement.');
  };

  const handleRestoreBackup = () => {
    if (!backupJsonInput.trim()) {
      alert('Veuillez coller le contenu JSON de votre sauvegarde.');
      return;
    }
    const res = dataStore.importFullBackup(backupJsonInput);
    if (res.success) {
      showToast(res.message, 'success');
      setIsBackupModalOpen(false);
      setBackupJsonInput('');
    } else {
      alert(res.message);
    }
  };

  const handleResetFactory = () => {
    const confirmation = prompt('ATTENTION : Pour réinitialiser le site aux données officielles d\'origine, tapez "RESET" en majuscules :');
    if (confirmation === 'RESET') {
      dataStore.resetToFactoryDefaults();
      showToast('Plateforme réinitialisée avec les données d\'origine.', 'info');
    }
  };

  const uniqueRegions = Array.from(new Set(allProjects.map(p => p.region_name))).sort();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-24">
      
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className={`px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-xs sm:text-sm text-white ${
            toastMessage.type === 'success' ? 'bg-emerald-600' :
            toastMessage.type === 'error' ? 'bg-red-600' : 'bg-brand-blue'
          }`}>
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* 1. MODERN TOP HEADER WITH PROFILE & DIRECT ACTIONS */}
      <div className="bg-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Profile Info */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-brand-orange/20 border border-brand-orange/30 flex items-center justify-center text-brand-orange font-black text-lg flex-shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold text-white">
                {auth.role === 'ADMIN' ? "Espace d'Administration Générale" : "Espace de Modération Citoyenne"}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                auth.role === 'ADMIN' ? 'bg-brand-orange text-white' : 'bg-brand-blue text-white'
              }`}>
                {auth.role === 'ADMIN' ? 'Super Admin' : 'Modérateur'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Connecté : <strong>{auth.fullName}</strong> • ({auth.email})
            </p>
          </div>
        </div>

        {/* Action Shortcuts & Quick Stats */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick Counter: Signalements */}
          <button
            onClick={() => setAdminTab('moderation')}
            className="px-3.5 py-2 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition-all text-left cursor-pointer"
            title="Accéder à la modération terrain"
          >
            <span className="text-slate-400 block text-[9px] uppercase font-bold">Signalements</span>
            <span className={`text-xs font-black ${pendingProofs.length > 0 ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`}>
              {pendingProofs.length} en attente
            </span>
          </button>

          {/* Quick Counter: Projets */}
          <button
            onClick={() => setAdminTab('budget_table')}
            className="px-3.5 py-2 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition-all text-left cursor-pointer"
            title="Consulter le catalogue des investissements"
          >
            <span className="text-slate-400 block text-[9px] uppercase font-bold">Catalogue</span>
            <span className="text-xs font-black text-white">{allProjects.length} projets</span>
          </button>

          {/* Switch to Public Site */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = '/';
            }}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Voir le site public"
          >
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Site Public</span>
          </a>

          {/* Logout Button */}
          <button
            onClick={() => dataStore.logout()}
            className="px-3 py-2.5 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-rose-500/30 flex items-center gap-1.5 cursor-pointer"
            title="Se déconnecter"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </div>

      {/* 2. CATEGORIZED NAVIGATION BAR */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          
          {/* SECTION 1: DONNÉES & BUDGETS */}
          <button
            onClick={() => setAdminTab('caidp_manager')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              adminTab === 'caidp_manager'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="text-sm">️</span>
            <span>Répertoire CAIDP</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
              {dataStore.getCaidpDirectory().length}
            </span>
          </button>

          <button
            onClick={() => setAdminTab('caidp_analytics')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              adminTab === 'caidp_analytics'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <span>Impact & Demandes CAIDP</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
              {dataStore.getCaidpRequestStats().totalRequests}
            </span>
          </button>

          <button
            onClick={() => setAdminTab('documents_manager')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              adminTab === 'documents_manager'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4 text-purple-600" />
            <span>Documents Publics</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800">
              {dataStore.getDocuments().length}
            </span>
          </button>

          <button
            onClick={() => setAdminTab('institutions_manager')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              adminTab === 'institutions_manager'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Landmark className="w-4 h-4 text-brand-blue" />
            <span>Annuaire & Élus</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-brand-blue">
              {allInstitutions.length}
            </span>
          </button>

          <button
            onClick={() => setAdminTab('budget_table')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              adminTab === 'budget_table'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-brand-orange" />
            <span>Lignes Budgétaires</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-brand-orange">
              {allProjects.length}
            </span>
          </button>

          <div className="h-5 w-px bg-slate-200 mx-1 hidden md:block"></div>

          {/* SECTION 2: TERRAIN & ÉQUIPE */}
          <button
            onClick={() => setAdminTab('moderation')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              adminTab === 'moderation'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Camera className="w-4 h-4 text-emerald-600" />
            <span>Modération Terrain</span>
            {pendingProofs.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
                {pendingProofs.length}
              </span>
            )}
          </button>

          {auth.role === 'ADMIN' && (
            <button
              onClick={() => setAdminTab('team_moderators')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                adminTab === 'team_moderators'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Comptes Modérateurs</span>
            </button>
          )}

          <div className="h-5 w-px bg-slate-200 mx-1 hidden md:block"></div>

          {/* SECTION 3: COMMUNICATION & DIFFUSION */}
          <button
            onClick={() => setAdminTab('news_manager')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              adminTab === 'news_manager'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Newspaper className="w-4 h-4 text-purple-600" />
            <span>Publications</span>
          </button>

          <button
            onClick={() => setAdminTab('social_generator')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              adminTab === 'social_generator'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Studio Social Media</span>
          </button>

          <button
            onClick={() => setAdminTab('digital_opportunities')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              adminTab === 'digital_opportunities'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Globe className="w-4 h-4 text-sky-500" />
            <span>Offre Web Collectivités</span>
          </button>

          {/* SECTION 4: SYSTÈME (ADMIN SEULEMENT) */}
          {auth.role === 'ADMIN' && (
            <>
              <div className="h-5 w-px bg-slate-200 mx-1 hidden md:block"></div>
              <button
                onClick={() => setAdminTab('site_settings')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  adminTab === 'site_settings'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Settings className="w-4 h-4 text-slate-500" />
                <span>Paramètres & Sauvegardes</span>
              </button>
            </>
          )}

        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 0: CAIDP RI & PUBLIC ENTITIES DIRECTORY MANAGER */}
      {/* ========================================================================= */}
      {adminTab === 'caidp_manager' && (
        <CaidpRiManager onShowToast={showToast} />
      )}

      {/* ========================================================================= */}
      {/* TAB 0.2: CAIDP REQUESTS & CITIZEN IMPACT ANALYTICS */}
      {/* ========================================================================= */}
      {adminTab === 'caidp_analytics' && (
        <CaidpAnalyticsManager onShowToast={showToast} />
      )}

      {/* ========================================================================= */}
      {/* TAB 0.5: PUBLIC DOCUMENTS MANAGER (CAIDP LIBRARY) */}
      {/* ========================================================================= */}
      {adminTab === 'documents_manager' && (
        <DocumentManager onShowToast={showToast} />
      )}

      {/* ========================================================================= */}
      {/* TAB 1: INSTITUTIONS & DIRECTORY MANAGER */}
      {/* ========================================================================= */}
      {adminTab === 'institutions_manager' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-50 text-brand-blue font-bold">
                  <Building2 className="w-5 h-5 text-brand-blue" />
                </span>
                <h3 className="text-xl font-extrabold text-navy-900">
                  Annuaire & Responsables ({filteredInstitutions.length} affichées / {allInstitutions.length} au total)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Pilotez la complétude des données publiques : photos officielles, sites web réels, pages Facebook et responsables désignés.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleOpenCreateInst}
                className="px-4 py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-2xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Nouvelle Entité / Institution</span>
              </button>
            </div>
          </div>

          {/* ========================================== */}
          {/* KPI METRIC CARDS : AUDIT & COMPLÉTUDE DATA */}
          {/* ========================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            
            {/* Card 1: Photos à ajouter */}
            <div 
              onClick={() => { setInstStatusFilter(instStatusFilter === 'NO_PHOTO' ? 'ALL' : 'NO_PHOTO'); setInstPage(1); }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                instStatusFilter === 'NO_PHOTO' 
                  ? 'bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-300' 
                  : 'bg-amber-50/70 hover:bg-amber-100/70 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider">Photos à ajouter</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${instStatusFilter === 'NO_PHOTO' ? 'bg-white text-amber-900' : 'bg-amber-200/80 text-amber-900'}`}>
                  {Math.round((instStats.withoutPhotoCount / instStats.total) * 100)}% manquantes
                </span>
              </div>
              <div className="text-2xl font-black mt-2">
                {instStats.withoutPhotoCount} <span className="text-xs font-medium opacity-80">/ {instStats.total}</span>
              </div>
              <p className={`text-[11px] mt-1 font-medium ${instStatusFilter === 'NO_PHOTO' ? 'text-amber-100' : 'text-amber-700'}`}>
                {instStats.withPhotoCount} photos officielles en ligne
              </p>
            </div>

            {/* Card 2: Sans Site Web */}
            <div 
              onClick={() => { setInstStatusFilter(instStatusFilter === 'NO_WEBSITE' ? 'ALL' : 'NO_WEBSITE'); setInstPage(1); }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                instStatusFilter === 'NO_WEBSITE' 
                  ? 'bg-sky-600 text-white border-sky-600 shadow-md ring-2 ring-sky-300' 
                  : 'bg-sky-50/70 hover:bg-sky-100/70 border-sky-200 text-sky-900'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider">Sans Site Web</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${instStatusFilter === 'NO_WEBSITE' ? 'bg-white text-sky-900' : 'bg-sky-200/80 text-sky-900'}`}>
                  {instStats.withoutWebCount} à créer
                </span>
              </div>
              <div className="text-2xl font-black mt-2">
                {instStats.withoutWebCount} <span className="text-xs font-medium opacity-80">/ {instStats.total}</span>
              </div>
              <p className={`text-[11px] mt-1 font-medium ${instStatusFilter === 'NO_WEBSITE' ? 'text-sky-100' : 'text-sky-700'}`}>
                {instStats.withWebCount} sites officiels réels actifs
              </p>
            </div>

            {/* Card 3: Sans Page Facebook */}
            <div 
              onClick={() => { setInstStatusFilter(instStatusFilter === 'NO_FACEBOOK' ? 'ALL' : 'NO_FACEBOOK'); setInstPage(1); }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                instStatusFilter === 'NO_FACEBOOK' 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300' 
                  : 'bg-blue-50/70 hover:bg-blue-100/70 border-blue-200 text-blue-900'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider">Sans Page Facebook</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${instStatusFilter === 'NO_FACEBOOK' ? 'bg-white text-blue-900' : 'bg-blue-200/80 text-blue-900'}`}>
                  {instStats.withoutFbCount} manquantes
                </span>
              </div>
              <div className="text-2xl font-black mt-2">
                {instStats.withoutFbCount} <span className="text-xs font-medium opacity-80">/ {instStats.total}</span>
              </div>
              <p className={`text-[11px] mt-1 font-medium ${instStatusFilter === 'NO_FACEBOOK' ? 'text-blue-100' : 'text-blue-700'}`}>
                {instStats.withFbCount} pages Facebook répertoriées
              </p>
            </div>

            {/* Card 4: Sans Présence Numérique */}
            <div 
              onClick={() => { setInstStatusFilter(instStatusFilter === 'NO_DIGITAL' ? 'ALL' : 'NO_DIGITAL'); setInstPage(1); }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                instStatusFilter === 'NO_DIGITAL' 
                  ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-300' 
                  : 'bg-rose-50/70 hover:bg-rose-100/70 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider">Sans Web ni Facebook</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${instStatusFilter === 'NO_DIGITAL' ? 'bg-white text-rose-900' : 'bg-rose-200/80 text-rose-900'}`}>
                  Priorité
                </span>
              </div>
              <div className="text-2xl font-black mt-2">
                {instStats.withoutDigitalCount} <span className="text-xs font-medium opacity-80">organes</span>
              </div>
              <p className={`text-[11px] mt-1 font-medium ${instStatusFilter === 'NO_DIGITAL' ? 'text-rose-100' : 'text-rose-700'}`}>
                Aucune présence en ligne trouvée
              </p>
            </div>

          </div>

          {/* Search & Filters */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            
            {/* Search Input */}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={instSearch}
                onChange={(e) => { setInstSearch(e.target.value); setInstPage(1); }}
                placeholder="Rechercher par commune, région, ministère, institution ou nom de responsable..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue font-medium"
              />
              {instSearch && (
                <button
                  onClick={() => { setInstSearch(''); setInstPage(1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Row 1: Filter by Institutional Pole */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1">Pôle :</span>
              {[
                { id: 'ALL', label: `Tous (${allInstitutions.length})` },
                { id: 'MINISTERE', label: `Ministères (${allInstitutions.filter(i => i.type === 'MINISTERE').length})` },
                { id: 'INSTITUTION', label: `Institutions (${allInstitutions.filter(i => i.type === 'INSTITUTION').length})` },
                { id: 'AUTORITE_REGULATION', label: `Régulateurs (${allInstitutions.filter(i => i.type === 'AUTORITE_REGULATION').length})` },
                { id: 'MAIRIE', label: `Mairies (${allInstitutions.filter(i => i.type === 'MAIRIE').length})` },
                { id: 'REGION', label: `Conseils Régionaux (${allInstitutions.filter(i => i.type === 'REGION').length})` },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => { setInstTypeFilter(item.id as any); setInstPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    instTypeFilter === item.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Row 2: Filter by Digital / Photo Status */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-200/60">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1">Statut :</span>
              {[
                { id: 'ALL', label: 'Tous les statuts' },
                { id: 'NO_PHOTO', label: `Photos manquantes (${instStats.withoutPhotoCount})` },
                { id: 'NO_WEBSITE', label: `Sans site web officiel (${instStats.withoutWebCount})` },
                { id: 'NO_FACEBOOK', label: `Sans page Facebook (${instStats.withoutFbCount})` },
                { id: 'NO_DIGITAL', label: `Sans présence en ligne (${instStats.withoutDigitalCount})` },
              ].map(status => (
                <button
                  key={status.id}
                  onClick={() => { setInstStatusFilter(status.id as any); setInstPage(1); }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    instStatusFilter === status.id
                      ? 'bg-brand-blue text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>

          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedInstitutions.map((inst) => {
              const hasPhoto = Boolean(inst.leader_photo_url);
              return (
                <div 
                  key={inst.id}
                  className="bg-slate-50/70 hover:bg-white rounded-2xl border border-slate-200/80 p-4 transition-all duration-200 hover:shadow-md hover:border-brand-blue/40 flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      {/* Photo / Avatar with Zoom */}
                      {hasPhoto ? (
                        <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shadow-xs flex-shrink-0 cursor-zoom-in group/photo relative bg-white">
                          <img 
                            src={inst.leader_photo_url} 
                            alt={inst.leader_name || inst.name}
                            className="w-full h-full object-cover object-top transition-transform duration-300 group-hover/photo:scale-125"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-slate-200/80 border border-slate-300/70 text-slate-600 flex flex-col items-center justify-center font-bold text-xs flex-shrink-0">
                          <span className="text-xl"></span>
                          <span className="text-[8px] uppercase tracking-wider text-slate-400 font-extrabold">À ajouter</span>
                        </div>
                      )}

                      {/* Header info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            inst.type === 'REGION' ? 'bg-indigo-100 text-indigo-800' :
                            inst.type === 'INSTITUTION' ? 'bg-amber-100 text-amber-800' :
                            inst.type === 'MINISTERE' ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {inst.type === 'REGION' ? 'Région' : inst.type === 'INSTITUTION' ? 'Grande Institution' : inst.type === 'MINISTERE' ? 'Ministère' : 'Mairie'}
                          </span>
                          {inst.political_party && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-brand-blue/10 text-brand-blue">
                              {inst.political_party}
                            </span>
                          )}
                          {hasPhoto ? (
                            <span className="text-[10px] text-emerald-600 font-bold ml-auto flex items-center gap-0.5">
                               Photo
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-600 font-bold ml-auto">
                              Sans photo
                            </span>
                          )}
                        </div>

                        <h4 className="font-extrabold text-slate-900 text-sm leading-tight truncate" title={inst.name}>
                          {inst.name}
                        </h4>

                        <div className="mt-1">
                          <p className="text-xs font-bold text-brand-blue truncate">
                            {inst.leader_name || 'Responsable non renseigné'}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {inst.leader_title || (inst.type === 'REGION' ? 'Président du CR' : inst.type === 'MAIRIE' ? 'Maire' : 'Président')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Metadata & Links */}
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Dotation Votée</span>
                        <span className="font-black text-slate-900 text-xs">
                          {inst.total_budget_fcfa > 0 ? `${formatFCFA(inst.total_budget_fcfa)} (${formatAmountInWords(inst.total_budget_fcfa)})` : 'Non publié'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {inst.website && (
                          <a 
                            href={inst.website} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-brand-blue hover:text-white text-slate-600 transition-colors"
                            title="Visiter le site web officiel"
                          >
                            <Globe className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {inst.facebook_url && (
                          <a 
                            href={inst.facebook_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 transition-colors font-bold text-xs"
                            title="Page Facebook officielle"
                          >
                            f
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditInst(inst)}
                      className="flex-1 py-2 px-3 bg-white hover:bg-brand-blue hover:text-white border border-slate-200 hover:border-brand-blue rounded-xl text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>{hasPhoto ? 'Modifier Responsable / Photo' : '+ Ajouter la Photo & Infos'}</span>
                    </button>
                    <button
                      onClick={() => handleDeleteInstitution(inst.id, inst.name)}
                      className="p-2 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-xl transition-colors"
                      title="Supprimer cette entité"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalInstPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs text-slate-600">
              <div>
                Affichage de <strong>{(instPage - 1) * instPageSize + 1}</strong> à <strong>{Math.min(instPage * instPageSize, filteredInstitutions.length)}</strong> sur <strong>{filteredInstitutions.length}</strong> entités
              </div>

              <div className="flex items-center gap-1">
                <button
                  disabled={instPage === 1}
                  onClick={() => setInstPage(1)}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={instPage === 1}
                  onClick={() => setInstPage(instPage - 1)}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-3 font-bold text-slate-900">
                  Page {instPage} / {totalInstPages}
                </span>

                <button
                  disabled={instPage === totalInstPages}
                  onClick={() => setInstPage(instPage + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  disabled={instPage === totalInstPages}
                  onClick={() => setInstPage(totalInstPages)}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BUDGET & PROJECTS TABLE (FULL CMS) */}
      {/* ========================================================================= */}
      {adminTab === 'budget_table' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-orange-50 text-terracotta-500 font-bold text-lg"></span>
                <h3 className="text-xl font-extrabold text-navy-900">
                  Gestion des Lignes Budgétaires ({filteredTableProjects.length} projets filtrés)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Visualisez, modifiez ou ajoutez de nouvelles lignes de projets d'investissements pour toutes les localités.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setEditingProject(null);
                  setProjectForm({
                    title: '',
                    commune_name: '',
                    region_name: '',
                    category: 'Santé',
                    budget_amount_fcfa: 25000000,
                    current_status: 'IN_PROGRESS',
                    progress_percentage: 50,
                    contractor_name: '',
                    locality_village_neighborhood: '',
                    details: '',
                  });
                  setIsAddModalOpen(true);
                }}
                className="px-4 py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-2xl text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ Nouveau Projet</span>
              </button>

              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold flex items-center gap-1.5"
                title="Importer un fichier CSV"
              >
                <Upload className="w-4 h-4" />
                <span>Import CSV</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold flex items-center gap-1.5"
                title="Exporter les projets filtrés en CSV"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => { setTableSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Recherche projet, commune..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <select
              value={tableRegionFilter}
              onChange={(e) => { setTableRegionFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            >
              <option value="ALL">Toutes les Régions</option>
              {uniqueRegions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <select
              value={tableCategoryFilter}
              onChange={(e) => { setTableCategoryFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            >
              <option value="ALL">Toutes les Catégories</option>
              <option value="Santé">Santé</option>
              <option value="Éducation">Éducation</option>
              <option value="Eau">Eau & Hydraulique</option>
              <option value="Voirie">Voirie & Routes</option>
              <option value="Energie">Énergie</option>
              <option value="Marchés">Marchés</option>
              <option value="Logement">Logement</option>
              <option value="Culture">Culture</option>
            </select>

            <select
              value={tableStatusFilter}
              onChange={(e) => { setTableStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            >
              <option value="ALL">Tous les Statuts</option>
              <option value="NOT_STARTED"> Non commencé</option>
              <option value="IN_PROGRESS"> En cours</option>
              <option value="COMPLETED"> Livré / Terminé</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-extrabold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3 cursor-pointer hover:bg-slate-100" onClick={() => toggleSort('title')}>
                    <div className="flex items-center gap-1">
                      <span>Projet / Intitulé</span>
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    </div>
                  </th>
                  <th className="p-3 cursor-pointer hover:bg-slate-100" onClick={() => toggleSort('commune_name')}>
                    <div className="flex items-center gap-1">
                      <span>Commune & Région</span>
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    </div>
                  </th>
                  <th className="p-3">Catégorie</th>
                  <th className="p-3 text-right cursor-pointer hover:bg-slate-100" onClick={() => toggleSort('budget_amount_fcfa')}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Budget (FCFA)</span>
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    </div>
                  </th>
                  <th className="p-3 text-center">Avancement</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedProjects.map((p) => {
                  const status = getStatusConfig(p.current_status);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-900 max-w-xs">
                        <div className="truncate" title={p.title}>{p.title}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{p.fiscal_year || 2026}</div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <strong>{p.commune_name}</strong>
                        <div className="text-[10px] text-slate-500">{p.region_name}</div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {p.category}
                        </span>
                      </td>
                      <td className="p-3 text-right font-extrabold text-navy-900 font-sans whitespace-nowrap">
                        <div>{formatFCFA(p.budget_amount_fcfa)}</div>
                        <div className="text-[10px] text-brand-blue font-bold">({formatAmountInWords(p.budget_amount_fcfa)})</div>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold border ${status.badgeClass}`}>
                          <span>{status.icon}</span>
                          <span>{p.progress_percentage}%</span>
                        </span>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingProject(p);
                              setProjectForm({
                                title: p.title,
                                commune_name: p.commune_name,
                                region_name: p.region_name,
                                category: p.category,
                                budget_amount_fcfa: p.budget_amount_fcfa,
                                current_status: p.current_status,
                                progress_percentage: p.progress_percentage,
                                contractor_name: p.contractor_name || '',
                                locality_village_neighborhood: p.locality_village_neighborhood || '',
                                details: p.details || '',
                              });
                              setIsAddModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-navy-900 hover:bg-slate-100 rounded-lg"
                            title="Modifier ce projet"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onOpenShare(p)}
                            className="p-1.5 text-slate-500 hover:text-terracotta-600 hover:bg-terracotta-50 rounded-lg"
                            title="Générer Post Social"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Supprimer définitivement le projet "${p.title}" ?`)) {
                                dataStore.deleteProject(p.id);
                                showToast('Projet supprimé.');
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-600">
            <div>
              Affichage de <strong>{(currentPage - 1) * pageSize + 1}</strong> à <strong>{Math.min(currentPage * pageSize, sortedTableProjects.length)}</strong> sur <strong>{sortedTableProjects.length}</strong> lignes
            </div>

            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              >
                <option value={10}>10 lignes</option>
                <option value={25}>25 lignes</option>
                <option value={50}>50 lignes</option>
              </select>

              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-2 font-bold text-slate-900">
                  Page {currentPage} / {totalPages}
                </span>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PUBLICATIONS, ARTICLES & RAPPORTS CMS */}
      {/* ========================================================================= */}
      {adminTab === 'news_manager' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-purple-50 text-purple-600 font-bold text-lg"></span>
                <h3 className="text-xl font-extrabold text-navy-900">
                  Publications, Rapports & Guides Citoyens ({allArticles.length})
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Rédigez et publiez des analyses budgétaires, communiqués officiels et guides téléchargeables sans toucher au code.
              </p>
            </div>

            <button
              onClick={handleOpenCreateArticle}
              className="px-4 py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-2xl text-xs font-bold shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nouvelle Publication / Rapport</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {allArticles.map((art) => (
              <div 
                key={art.id}
                className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex flex-col justify-between hover:shadow-md transition-all group"
              >
                <div>
                  {art.cover_image_url ? (
                    <div className="h-40 w-full overflow-hidden relative">
                      <img 
                        src={art.cover_image_url} 
                        alt={art.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-navy-900/90 text-white">
                        {art.category}
                      </span>
                    </div>
                  ) : (
                    <div className="h-28 bg-gradient-to-br from-slate-200 to-slate-300 p-4 flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white text-slate-800">
                        {art.category}
                      </span>
                      <Newspaper className="w-8 h-8 text-slate-400" />
                    </div>
                  )}

                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{art.published_at}</span>
                      <span>{art.author_name || 'SuiviBudget CI'}</span>
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-2">
                      {art.title}
                    </h4>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {art.summary}
                    </p>
                    {art.document_name && (
                      <div className="p-2 bg-white rounded-xl border border-slate-200 flex items-center gap-2 text-[11px] text-slate-700 font-bold">
                        <FileText className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                        <span className="truncate">{art.document_name}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-0 flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditArticle(art)}
                    className="flex-1 py-2 bg-white hover:bg-navy-900 hover:text-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-1"
                  >
                    <Edit className="w-3 h-3" />
                    <span>Modifier</span>
                  </button>
                  <button
                    onClick={() => handleDeleteArticle(art.id, art.title)}
                    className="p-2 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CITIZEN PROOF MODERATION QUEUE */}
      {/* ========================================================================= */}
      {adminTab === 'moderation' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <h3 className="text-xl font-extrabold text-navy-900">
                  File de Modération des Preuves Citoyennes ({pendingProofs.length} en attente)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vérifiez les photos terrain et confirmez l'avancement physique des chantiers avant publication sur l'Observatoire
                </p>
              </div>
            </div>

            {pendingProofs.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-80" />
                <h4 className="text-base font-bold text-slate-800">Aucun signalement en attente</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Toutes les photos citoyennes ont été vérifiées et publiées.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {pendingProofs.map((proof) => (
                  <div key={proof.id} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="h-48 w-full bg-slate-900 relative overflow-hidden flex items-center justify-center">
                        {proof.media_type === 'VIDEO' && proof.video_url ? (
                          <video
                            src={proof.video_url}
                            controls
                            className="w-full h-full object-cover bg-black"
                          />
                        ) : (
                          <img 
                            src={proof.image_url || (proof as any).photo_url} 
                            alt="Preuve terrain"
                            className="w-full h-full object-cover" 
                          />
                        )}
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-navy-900 text-white pointer-events-none">
                          Signalé : {proof.citizen_status_claim}
                        </span>
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/60 text-white flex items-center gap-1 pointer-events-none">
                          {proof.media_type === 'VIDEO' ? <Video className="w-3 h-3 text-sky-400" /> : <Camera className="w-3 h-3 text-orange-400" />}
                          <span>{proof.media_type === 'VIDEO' ? 'Vidéo' : 'Photo'}</span>
                        </span>
                      </div>

                      <div className="p-4 space-y-2">
                        <div className="text-[11px] text-slate-400 font-medium">
                          {proof.created_at ? formatDateFR(proof.created_at) : 'Récemment'} par {proof.citizen_name || 'Citoyen vérificateur'}
                        </div>
                        <h4 className="font-black text-slate-900 text-sm leading-snug">
                          {proof.project_title || 'Projet d\'infrastructure'}
                        </h4>
                        <div className="text-xs font-bold text-brand-blue">
                           {proof.commune_name} ({proof.region_name})
                        </div>
                        <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed italic">
                          "{proof.comment}"
                        </p>
                      </div>
                    </div>

                    <div className="p-4 pt-0 flex items-center gap-2">
                      <button
                        onClick={() => handleModerate(proof.id, 'APPROVED')}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        <span>Valider & Publier</span>
                      </button>
                      <button
                        onClick={() => handleModerate(proof.id, 'REJECTED')}
                        className="py-2.5 px-3 bg-white hover:bg-red-50 text-red-600 border border-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <X className="w-4 h-4" />
                        <span>Rejeter</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SOCIAL MEDIA POST GENERATOR */}
      {/* ========================================================================= */}
      {adminTab === 'social_generator' && (
        <SocialPostGenerator />
      )}

      {/* ========================================================================= */}
      {/* TAB 6: SITE SETTINGS & TOTAL BACKUP / RESTORE */}
      {/* ========================================================================= */}
      {adminTab === 'site_settings' && (
        <div className="space-y-6">
          
          {/* General Site Configuration */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-slate-100 text-slate-800 font-bold text-lg">️</span>
                <h3 className="text-xl font-extrabold text-navy-900">
                  Configuration Générale & Bandeau d'Annonce Flash
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Personnalisez le message flash affiché au sommet du site, l'année d'exercice et les coordonnées publiques.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-5 text-xs">
              
              {/* Flash Announcement Banner */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-brand-orange" />
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">Bandeau d'Annonce Citoyenne en Tête de Page</h4>
                      <p className="text-[11px] text-slate-500">Affiche un message urgent ou informatif visible par tous les visiteurs.</p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsForm.announcement_banner_enabled}
                      onChange={(e) => setSettingsForm({ ...settingsForm, announcement_banner_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-blue"></div>
                  </label>
                </div>

                {settingsForm.announcement_banner_enabled && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Texte du Message d'Alerte / Annonce</label>
                      <input
                        type="text"
                        value={settingsForm.announcement_banner_text}
                        onChange={(e) => setSettingsForm({ ...settingsForm, announcement_banner_text: e.target.value })}
                        placeholder="Ex:  Budget National 2026 : Consultez les dotations..."
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Lien de redirection (Optionnel)</label>
                        <input
                          type="url"
                          value={settingsForm.announcement_banner_link || ''}
                          onChange={(e) => setSettingsForm({ ...settingsForm, announcement_banner_link: e.target.value })}
                          placeholder="https://... ou #actualites"
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Style de Bandeau</label>
                        <select
                          value={settingsForm.announcement_banner_type || 'info'}
                          onChange={(e) => setSettingsForm({ ...settingsForm, announcement_banner_type: e.target.value as any })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        >
                          <option value="info"> Information (Bleu)</option>
                          <option value="success"> Succès / Publication (Vert)</option>
                          <option value="warning"> Alerte / Urgent (Orange)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Fiscal Year & Contacts */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Année Budgétaire Active</label>
                  <input
                    type="number"
                    value={settingsForm.fiscal_year}
                    onChange={(e) => setSettingsForm({ ...settingsForm, fiscal_year: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Support / Contact</label>
                  <input
                    type="email"
                    value={settingsForm.contact_email}
                    onChange={(e) => setSettingsForm({ ...settingsForm, contact_email: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Téléphone Support</label>
                  <input
                    type="text"
                    value={settingsForm.contact_phone}
                    onChange={(e) => setSettingsForm({ ...settingsForm, contact_phone: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl font-bold shadow flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Enregistrer les paramètres</span>
                </button>
              </div>
            </form>
          </div>

                    {/* SECURITY & PASSWORD CHANGE CARD */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-xl font-extrabold text-navy-900">
                  Sécurité & Modification du Mot de Passe Administrateur
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Modifiez à tout moment votre mot de passe d'accès au Back-Office. Le nouveau mot de passe est immédiatement salé et chiffré en SHA-256.
              </p>
            </div>

            {pwdChangeError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold">
                ️ {pwdChangeError}
              </div>
            )}

            {pwdChangeSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold">
                {pwdChangeSuccess}
              </div>
            )}

            <form onSubmit={handleDashboardChangePassword} className="space-y-4 max-w-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nouveau mot de passe</label>
                  <input
                    type="password"
                    required
                    value={newDashboardPassword}
                    onChange={(e) => setNewDashboardPassword(e.target.value)}
                    placeholder="Min. 8 caractères..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Confirmer le mot de passe</label>
                  <input
                    type="password"
                    required
                    value={confirmDashboardPassword}
                    onChange={(e) => setConfirmDashboardPassword(e.target.value)}
                    placeholder="Confirmez le mot de passe..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="text-[11px] text-slate-500">
                Critères : 8+ caractères, au moins 1 majuscule, 1 minuscule, et 1 chiffre ou symbole.
              </div>

              <button
                type="submit"
                disabled={isChangingPwd || !newDashboardPassword}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isChangingPwd ? 'Chiffrement...' : 'Mettre à jour mon mot de passe'}</span>
              </button>
            </form>
          </div>

          {/* TOTAL BACKUP & RESTORE SECTION */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" />
                <h3 className="text-xl font-extrabold text-navy-900">
                  Sauvegarde & Restauration Totale des Données
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Téléchargez une copie de secours intégrale contenant tous vos projets, entités, photos et articles personnalisés, ou restaurez-la en 1 clic.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Backup Card */}
              <div className="p-5 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-black text-indigo-900 text-sm">
                    <Download className="w-4 h-4 text-indigo-600" />
                    <span>Exporter la Sauvegarde Complète</span>
                  </div>
                  <p className="text-[11px] text-indigo-800 leading-relaxed">
                    Télécharge un fichier <code>.json</code> complet contenant toutes les données modifiées. Idéal pour garder une copie de sécurité ou migrer.
                  </p>
                </div>
                <button
                  onClick={handleDownloadBackup}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger la Sauvegarde (.json)</span>
                </button>
              </div>

              {/* Restore Card */}
              <div className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-black text-emerald-900 text-sm">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    <span>Restaurer une Sauvegarde</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Importez un fichier de sauvegarde préalablement exporté pour rétablir instantanément toutes vos informations.
                  </p>
                </div>
                <button
                  onClick={() => setIsBackupModalOpen(true)}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>Importer un fichier de sauvegarde</span>
                </button>
              </div>

              {/* Factory Reset Card */}
              <div className="p-5 bg-red-50/70 border border-red-200 rounded-2xl space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-black text-red-900 text-sm">
                    <RefreshCw className="w-4 h-4 text-red-600" />
                    <span>Réinitialisation d'Origine</span>
                  </div>
                  <p className="text-[11px] text-red-800 leading-relaxed">
                    Rétablit les données initiales officielles du gouvernement (192 maires, 31 présidents, 14 institutions et ministères).
                  </p>
                </div>
                <button
                  onClick={handleResetFactory}
                  className="w-full py-2.5 px-4 bg-white hover:bg-red-600 hover:text-white text-red-600 border border-red-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Réinitialiser aux valeurs d'origine</span>
                </button>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: DIGITAL TRANSFORMATION & WEB WEBSITES HUB */}
      {/* ========================================================================= */}
      {adminTab === 'digital_opportunities' && (
        <div className="space-y-8">
          
          {/* Header Banner & Download Actions */}
          <div className="bg-gradient-to-r from-navy-950 via-sky-950 to-navy-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-black uppercase tracking-wider border border-sky-400/30">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Transformation Numérique des Territoires CI</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Programme Portails Web & E-Services Collectivités
                </h3>
                <p className="text-xs sm:text-sm text-sky-100/90 leading-relaxed font-normal">
                  <strong>216 collectivités ivoiriennes (22 Régions et 194 Mairies)</strong> n'ont pas de site web officiel et dépendent de Facebook. 
                  Voici le benchmark mondial, l'architecture MVP prête à déployer et le répertoire complet pour vos prises de contact et partenariats.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full lg:w-auto flex-shrink-0">
                <button
                  onClick={handleDownloadWhitepaper}
                  className="px-5 py-3 bg-white hover:bg-sky-50 text-navy-900 rounded-2xl text-xs font-black shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer group"
                >
                  <Download className="w-4 h-4 text-sky-600 group-hover:scale-110 transition-transform" />
                  <span>Télécharger le Livre Blanc & MVP (.md)</span>
                </button>
                <button
                  onClick={handleExportProspectsCsv}
                  className="px-5 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl text-xs font-black shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer group"
                >
                  <FileSpreadsheet className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Exporter les 216 Collectivités (.csv)</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
              <div className="bg-white/5 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
                <span className="text-[10px] text-sky-200 font-bold uppercase tracking-wider">Mairies sans site</span>
                <div className="text-xl sm:text-2xl font-black mt-1 text-white">194 <span className="text-xs text-sky-300 font-normal">/ 201</span></div>
                <span className="text-[10px] text-amber-300 font-semibold">96.5% captives de Facebook</span>
              </div>
              <div className="bg-white/5 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
                <span className="text-[10px] text-sky-200 font-bold uppercase tracking-wider">Régions sans site</span>
                <div className="text-xl sm:text-2xl font-black mt-1 text-white">22 <span className="text-xs text-sky-300 font-normal">/ 33</span></div>
                <span className="text-[10px] text-amber-300 font-semibold">66.7% sans portail dédié</span>
              </div>
              <div className="bg-white/5 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
                <span className="text-[10px] text-sky-200 font-bold uppercase tracking-wider">Budget d'Investissement Moyen</span>
                <div className="text-xl sm:text-2xl font-black mt-1 text-white">450 M <span className="text-xs text-sky-300 font-normal">FCFA</span></div>
                <span className="text-[10px] text-emerald-300 font-semibold">Capacité d'équipement avérée</span>
              </div>
              <div className="bg-white/5 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
                <span className="text-[10px] text-sky-200 font-bold uppercase tracking-wider">Conformité Loi CAIDP</span>
                <div className="text-xl sm:text-2xl font-black mt-1 text-white">Loi 2013-867</div>
                <span className="text-[10px] text-sky-200 font-semibold">Obligation légale de publication</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BENCHMARK MONDIAL : LES 5 MODÈLES D'EXCELLENCE */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-50 text-brand-blue font-bold">
                  <Globe className="w-5 h-5 text-brand-blue" />
                </span>
                <h3 className="text-xl font-extrabold text-navy-900">
                  Benchmark International : Les Meilleures Pratiques Mondiales
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Comment les meilleures villes et régions du monde conçoivent leurs portails pour les citoyens et investisseurs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              
              {/* Benchmark 1: Gov.uk / Bristol */}
              <div className="bg-slate-50 hover:bg-white rounded-2xl border border-slate-200 p-4 transition-all hover:shadow-md space-y-2.5 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">UK</span>
                    <span>Gov.uk & Bristol</span>
                  </div>
                  <div className="text-[11px] font-bold text-brand-blue uppercase tracking-wider">Clarté Radicale</div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Zéro jargon administratif. 6 boutons d'actions en accueil (*Demander un acte, Payer, Signaler, Voir les chantiers*). Tâche accomplie en 2 clics.
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-blue-50 text-brand-blue w-fit">Parcours Ultra-Simple</span>
              </div>

              {/* Benchmark 2: Lyon / Paris */}
              <div className="bg-slate-50 hover:bg-white rounded-2xl border border-slate-200 p-4 transition-all hover:shadow-md space-y-2.5 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">FR</span>
                    <span>Ville de Lyon & Paris</span>
                  </div>
                  <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Transparence & Projets</div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Cartographie interactive des chantiers en temps réel avec coûts et dates de livraison. Espace de téléchargement des délibérations et budgets.
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 w-fit">Budgets Participatifs</span>
              </div>

              {/* Benchmark 3: Singapour */}
              <div className="bg-slate-50 hover:bg-white rounded-2xl border border-slate-200 p-4 transition-all hover:shadow-md space-y-2.5 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">SG</span>
                    <span>GovTech Singapour</span>
                  </div>
                  <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Moments de Vie</div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Services structurés par besoins de l'usager (*Naissance, Création d'entreprise locale, Permis de construire, Retraite*) plutôt que par organigramme.
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-purple-50 text-purple-700 w-fit">Guichet Unique</span>
              </div>

              {/* Benchmark 4: Kigali / Rwanda */}
              <div className="bg-slate-50 hover:bg-white rounded-2xl border border-slate-200 p-4 transition-all hover:shadow-md space-y-2.5 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">RW</span>
                    <span>Kigali & Irembo</span>
                  </div>
                  <div className="text-[11px] font-bold text-sky-700 uppercase tracking-wider">Tout-Mobile Money</div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Paiement direct des taxes par Mobile Money (Wave, Orange, MTN). Actes avec QR Code sécurisé. 100% sans papier, ultra-rapide sur réseau 3G.
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-sky-50 text-sky-700 w-fit">Mobile First</span>
              </div>

              {/* Benchmark 5: NYC 311 */}
              <div className="bg-slate-50 hover:bg-white rounded-2xl border border-slate-200 p-4 transition-all hover:shadow-md space-y-2.5 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">US</span>
                    <span>New York 311</span>
                  </div>
                  <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Signalements 311</div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Module « Allo Mairie » : photo géolocalisée d'un nid-de-poule, caniveau bouché ou coupure avec ticket de suivi de résolution par les services techniques.
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-amber-50 text-amber-700 w-fit">Suivi Résolution</span>
              </div>

            </div>
          </div>

          {/* ========================================================================= */}
          {/* ARCHITECTURE MVP « PORTAIL TERRITORIAL CIVIC CI » (4 PILIERS) */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-50 text-amber-800 font-bold">
                  <Landmark className="w-5 h-5 text-amber-700" />
                </span>
                <h3 className="text-xl font-extrabold text-navy-900">
                  Architecture du MVP : Le Portail Standardisé Prêt à Déployer
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                La solution modulaire conçue pour être livrée en 10 à 20 jours à chaque collectivité ivoirienne.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Pilier 1 */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/80 to-white border border-blue-100 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                  1
                </div>
                <h4 className="font-extrabold text-navy-900 text-sm">E-Administration & État Civil</h4>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                  <li>Pré-demande d'actes d'état civil en ligne</li>
                  <li>Paiement Mobile Money (Wave, Orange, MTN)</li>
                  <li>Alerte SMS de mise à disposition</li>
                  <li>Prise de RDV avec le cabinet du Maire</li>
                </ul>
              </div>

              {/* Pilier 2 */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white border border-emerald-100 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                  2
                </div>
                <h4 className="font-extrabold text-navy-900 text-sm">Transparence & Chantiers</h4>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                  <li>Intégration directe des données SuiviBudget CI</li>
                  <li>Carte des chantiers avec photos d'avancement</li>
                  <li>Espace délibérations & arrêtés en PDF</li>
                  <li>Conformité légale immédiate Loi CAIDP</li>
                </ul>
              </div>

              {/* Pilier 3 */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/80 to-white border border-amber-100 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                  3
                </div>
                <h4 className="font-extrabold text-navy-900 text-sm">Attractivité & Diaspora</h4>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                  <li>Fiche d'identité territoriale & atouts agro/mines</li>
                  <li>Guide de l'Investisseur & fiscalité locale</li>
                  <li>Espace Diaspora & Projets de co-développement</li>
                  <li>Indexation prioritaire sur Google (SEO)</li>
                </ul>
              </div>

              {/* Pilier 4 */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50/80 to-white border border-purple-100 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                  4
                </div>
                <h4 className="font-extrabold text-navy-900 text-sm">« Allo Mairie » & Citoyenneté</h4>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                  <li>Signalement voirie/éclairage avec photo GPS</li>
                  <li>Tableau de bord pour les services techniques</li>
                  <li>Boîte à idées citoyenne & consultations</li>
                  <li>Synchronisation avec la page Facebook</li>
                </ul>
              </div>

            </div>
          </div>

          {/* ========================================================================= */}
          {/* RÉPERTOIRE INTERACTIF : LES 216 COLLECTIVITÉS CIBLES */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-sky-50 text-sky-700 font-bold">
                    <FileSpreadsheet className="w-5 h-5 text-sky-700" />
                  </span>
                  <h3 className="text-xl font-extrabold text-navy-900">
                    Répertoire de Prospection ({filteredProspects.length} collectivités sans site web)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Recherchez par nom, région ou maire pour préparer vos courriers et rendez-vous institutionnels.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleExportProspectsCsv}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Exporter cette liste (CSV)</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={prospectSearch}
                  onChange={(e) => { setProspectSearch(e.target.value); setProspectPage(1); }}
                  placeholder="Rechercher une commune, région ou maire (ex: San Pedro, Korhogo, Daloa, Adjamé...)"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 font-medium"
                />
                {prospectSearch && (
                  <button
                    onClick={() => { setProspectSearch(''); setProspectPage(1); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'ALL', label: `Toutes (${allInstitutions.filter(i => isSyntheticWeb(i.website)).length})` },
                  { id: 'MAIRIE', label: `Mairies (194)` },
                  { id: 'REGION', label: `Conseils Régionaux (22)` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { setProspectTypeFilter(tab.id as any); setProspectPage(1); }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      prospectTypeFilter === tab.id
                        ? 'bg-sky-700 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Collectivité</th>
                    <th className="py-3 px-4">Pôle / Région</th>
                    <th className="py-3 px-4">Maire / Président</th>
                    <th className="py-3 px-4 text-right">Budget Alloué</th>
                    <th className="py-3 px-4">Présence Sociale</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {paginatedProspects.map((inst) => (
                    <tr key={inst.id} className="hover:bg-sky-50/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-navy-900">
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded-md bg-slate-100 text-slate-600 text-[10px]">
                            {inst.type === 'REGION' ? 'Région' : 'Mairie'}
                          </span>
                          <span>{inst.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {inst.region || inst.district || 'Côte d\'Ivoire'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900">{inst.leader_name || 'Élu désigné'}</span>
                        <div className="text-[10px] text-slate-400">{inst.leader_title}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        {formatFCFA(inst.total_budget_fcfa || 0)}
                      </td>
                      <td className="py-3 px-4">
                        {inst.facebook_url ? (
                          <a 
                            href={inst.facebook_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-bold"
                          >
                            <span>Facebook</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Aucune</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenEditInst(inst)}
                          className="px-2.5 py-1 bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 rounded-lg text-[11px] font-bold shadow-2xs transition-all cursor-pointer"
                        >
                          Gérer la fiche
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 text-xs text-slate-500 font-medium">
              <div>
                Affichage de <strong>{(prospectPage - 1) * prospectPageSize + 1}</strong> à <strong>{Math.min(prospectPage * prospectPageSize, filteredProspects.length)}</strong> sur <strong>{filteredProspects.length}</strong> collectivités cibles
              </div>

              <div className="flex items-center gap-1">
                <button
                  disabled={prospectPage === 1}
                  onClick={() => setProspectPage(1)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer font-bold"
                >
                  « Début
                </button>
                <button
                  disabled={prospectPage === 1}
                  onClick={() => setProspectPage(p => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer font-bold"
                >
                  ‹ Précédent
                </button>
                <span className="px-3 py-1 font-bold text-slate-800">
                  Page {prospectPage} / {totalProspectPages}
                </span>
                <button
                  disabled={prospectPage === totalProspectPages}
                  onClick={() => setProspectPage(p => Math.min(totalProspectPages, p + 1))}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer font-bold"
                >
                  Suivant ›
                </button>
                <button
                  disabled={prospectPage === totalProspectPages}
                  onClick={() => setProspectPage(totalProspectPages)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer font-bold"
                >
                  Fin »
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: TEAM & MODERATOR ACCOUNTS MANAGER */}
      {/* ========================================================================= */}
      {adminTab === 'team_moderators' && (
        <ModeratorManager />
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT INSTITUTION (COMPLETE FORM) */}
      {/* ========================================================================= */}
      {(isEditInstModalOpen || isCreateInstModalOpen) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl p-6 sm:p-8 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center font-bold text-lg">
                  ️
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-navy-900">
                    {editingInst ? `Modifier : ${editingInst.name}` : 'Créer une Nouvelle Entité Publique'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Renseignez la photo, l'identité du responsable, les budgets et coordonnées.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setIsEditInstModalOpen(false); setIsCreateInstModalOpen(false); }} 
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInstitution} className="space-y-4 text-xs">
              
              {/* Photo Live Preview & Photo URL Input */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-4">
                  {instForm.leader_photo_url ? (
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-brand-blue shadow-sm flex-shrink-0 bg-white">
                      <img 
                        src={instForm.leader_photo_url} 
                        alt="Aperçu"
                        className="w-full h-full object-cover object-top"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-slate-200 text-slate-600 flex flex-col items-center justify-center font-bold flex-shrink-0">
                      <span className="text-2xl"></span>
                      <span className="text-[8px] text-slate-400 uppercase font-black">Aucune photo</span>
                    </div>
                  )}

                  <div className="flex-1 space-y-1">
                    <label className="block font-black text-slate-800 uppercase tracking-wider text-[10px]">
                      Lien URL de la Photo Officielle (.jpg, .png)
                    </label>
                    <input
                      type="url"
                      value={instForm.leader_photo_url}
                      onChange={(e) => setInstForm({ ...instForm, leader_photo_url: e.target.value })}
                      placeholder="https://.../photo-officielle.jpg"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-brand-blue"
                    />
                    <p className="text-[10px] text-slate-500">
                      L'image s'affiche instantanément ci-contre dès la saisie.
                    </p>
                  </div>
                </div>
              </div>

              {/* Institution Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nom de l'Entité / Collectivité</label>
                  <input
                    type="text"
                    required
                    value={instForm.name}
                    onChange={(e) => setInstForm({ ...instForm, name: e.target.value })}
                    placeholder="Ex: Mairie de Yamoussoukro, Ministère du Budget..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Catégorie / Type d'Entité</label>
                  <select
                    value={instForm.type}
                    onChange={(e) => setInstForm({ ...instForm, type: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  >
                    <option value="MAIRIE"> Mairie / Commune</option>
                    <option value="REGION">️ Conseil Régional</option>
                    <option value="INSTITUTION">️ Grande Institution</option>
                    <option value="MINISTERE"> Ministère / Gouvernement</option>
                  </select>
                </div>
              </div>

              {/* Geographic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Région</label>
                  <input
                    type="text"
                    value={instForm.region}
                    onChange={(e) => setInstForm({ ...instForm, region: e.target.value })}
                    placeholder="Ex: Bélier, Lagunes..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">District</label>
                  <input
                    type="text"
                    value={instForm.district}
                    onChange={(e) => setInstForm({ ...instForm, district: e.target.value })}
                    placeholder="Ex: Lacs, Denguélé..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Département / Chef-lieu</label>
                  <input
                    type="text"
                    value={instForm.departement}
                    onChange={(e) => setInstForm({ ...instForm, departement: e.target.value })}
                    placeholder="Ex: Yamoussoukro"
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Leader Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nom du Premier Responsable</label>
                  <input
                    type="text"
                    required
                    value={instForm.leader_name}
                    onChange={(e) => setInstForm({ ...instForm, leader_name: e.target.value })}
                    placeholder="Ex: S.E.M. ALASSANE OUATTARA"
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Titre / Rôle Officiel</label>
                  <input
                    type="text"
                    value={instForm.leader_title}
                    onChange={(e) => setInstForm({ ...instForm, leader_title: e.target.value })}
                    placeholder="Ex: Maire de la Commune"
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Parti Politique</label>
                  <input
                    type="text"
                    value={instForm.political_party}
                    onChange={(e) => setInstForm({ ...instForm, political_party: e.target.value })}
                    placeholder="Ex: RHDP, PDCI, Indépendant"
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Web & Social Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Site Web Officiel</label>
                  <input
                    type="url"
                    value={instForm.website}
                    onChange={(e) => setInstForm({ ...instForm, website: e.target.value })}
                    placeholder="https://..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Page Facebook Officielle</label>
                  <input
                    type="url"
                    value={instForm.facebook_url}
                    onChange={(e) => setInstForm({ ...instForm, facebook_url: e.target.value })}
                    placeholder="https://facebook.com/..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Budgets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dotation Fonctionnement (FCFA)</label>
                  <input
                    type="number"
                    value={instForm.budget_functioning_fcfa}
                    onChange={(e) => setInstForm({ ...instForm, budget_functioning_fcfa: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dotation Investissement (FCFA)</label>
                  <input
                    type="number"
                    value={instForm.budget_investment_fcfa}
                    onChange={(e) => setInstForm({ ...instForm, budget_investment_fcfa: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Mission Summary */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Missions & Compétences Clés</label>
                <textarea
                  rows={3}
                  value={instForm.mission_summary}
                  onChange={(e) => setInstForm({ ...instForm, mission_summary: e.target.value })}
                  placeholder="Décrivez brièvement les missions et projets prioritaires de cette entité..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => { setIsEditInstModalOpen(false); setIsCreateInstModalOpen(false); }}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl font-bold shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Enregistrer les modifications</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT PROJECT (BUDGET TABLE) */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-lg font-extrabold text-navy-900">
                {editingProject ? 'Modifier le projet budgétaire' : 'Ajouter une nouvelle ligne budgétaire'}
              </h4>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Titre / Détails de l'investissement</label>
                <input
                  type="text"
                  required
                  value={projectForm.title}
                  onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                  placeholder="Ex: Construction d'un centre de santé à ..."
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Commune</label>
                  <input
                    type="text"
                    required
                    value={projectForm.commune_name}
                    onChange={(e) => setProjectForm({ ...projectForm, commune_name: e.target.value })}
                    className="w-full p-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Région</label>
                  <input
                    type="text"
                    required
                    value={projectForm.region_name}
                    onChange={(e) => setProjectForm({ ...projectForm, region_name: e.target.value })}
                    className="w-full p-2 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Budget Voté (FCFA)</label>
                  <input
                    type="number"
                    required
                    value={projectForm.budget_amount_fcfa}
                    onChange={(e) => setProjectForm({ ...projectForm, budget_amount_fcfa: Number(e.target.value) })}
                    className="w-full p-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Catégorie</label>
                  <select
                    value={projectForm.category}
                    onChange={(e) => setProjectForm({ ...projectForm, category: e.target.value })}
                    className="w-full p-2 border rounded-xl"
                  >
                    <option value="Santé">Santé</option>
                    <option value="Éducation">Éducation</option>
                    <option value="Eau">Eau & Hydraulique</option>
                    <option value="Voirie">Voirie</option>
                    <option value="Energie">Énergie</option>
                    <option value="Marchés">Marchés</option>
                    <option value="Logement">Logement</option>
                    <option value="Culture">Culture</option>
                    <option value="Services">Services</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Statut Terrain</label>
                  <select
                    value={projectForm.current_status}
                    onChange={(e) => setProjectForm({ ...projectForm, current_status: e.target.value as ProjectStatus })}
                    className="w-full p-2 border rounded-xl"
                  >
                    <option value="NOT_STARTED"> Non commencé</option>
                    <option value="IN_PROGRESS"> En cours</option>
                    <option value="COMPLETED"> Terminé</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Avancement (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={projectForm.progress_percentage}
                    onChange={(e) => setProjectForm({ ...projectForm, progress_percentage: Number(e.target.value) })}
                    className="w-full p-2 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Localité / Quartier / Village</label>
                  <input
                    type="text"
                    value={projectForm.locality_village_neighborhood}
                    onChange={(e) => setProjectForm({ ...projectForm, locality_village_neighborhood: e.target.value })}
                    placeholder="Ex: Quartier Résidentiel..."
                    className="w-full p-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Entreprise Exécutante</label>
                  <input
                    type="text"
                    value={projectForm.contractor_name}
                    onChange={(e) => setProjectForm({ ...projectForm, contractor_name: e.target.value })}
                    placeholder="Ex: BTP Ivoire..."
                    className="w-full p-2 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Détails descriptifs</label>
                <textarea
                  rows={2}
                  value={projectForm.details}
                  onChange={(e) => setProjectForm({ ...projectForm, details: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-navy-900 text-white rounded-xl font-bold shadow"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT ARTICLE OR REPORT (CMS) */}
      {/* ========================================================================= */}
      {isArticleModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl p-6 sm:p-8 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-lg font-extrabold text-navy-900">
                {editingArticle ? 'Modifier la publication' : 'Créer une nouvelle publication / rapport'}
              </h4>
              <button onClick={() => setIsArticleModalOpen(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveArticle} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Titre de la Publication</label>
                <input
                  type="text"
                  required
                  value={articleForm.title}
                  onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                  placeholder="Ex: Rapport d'Exécution Budgétaire 2026..."
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Catégorie</label>
                  <select
                    value={articleForm.category}
                    onChange={(e) => setArticleForm({ ...articleForm, category: e.target.value as any })}
                    className="w-full p-2.5 border rounded-xl"
                  >
                    <option value="ACTUALITE">Actualité</option>
                    <option value="RAPPORT">Rapport Budgétaire</option>
                    <option value="COMMUNIQUE">Communiqué Officiel</option>
                    <option value="GUIDE">Guide Citoyen</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Auteur / Source</label>
                  <input
                    type="text"
                    value={articleForm.author_name}
                    onChange={(e) => setArticleForm({ ...articleForm, author_name: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Image de Couverture (URL)</label>
                <input
                  type="url"
                  value={articleForm.cover_image_url}
                  onChange={(e) => setArticleForm({ ...articleForm, cover_image_url: e.target.value })}
                  placeholder="https://.../image.jpg"
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Document Téléchargeable (Nom)</label>
                  <input
                    type="text"
                    value={articleForm.document_name}
                    onChange={(e) => setArticleForm({ ...articleForm, document_name: e.target.value })}
                    placeholder="Ex: Rapport_2026.pdf"
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lien URL du Document (PDF)</label>
                  <input
                    type="url"
                    value={articleForm.document_url}
                    onChange={(e) => setArticleForm({ ...articleForm, document_url: e.target.value })}
                    placeholder="https://.../rapport.pdf"
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Résumé Court</label>
                <textarea
                  rows={2}
                  required
                  value={articleForm.summary}
                  onChange={(e) => setArticleForm({ ...articleForm, summary: e.target.value })}
                  placeholder="Résumé accrocheur en 2-3 lignes..."
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Contenu Complet de l'Article</label>
                <textarea
                  rows={4}
                  required
                  value={articleForm.content}
                  onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                  placeholder="Rédigez l'intégralité du texte ou communiquez les conclusions du rapport..."
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_featured"
                  checked={articleForm.is_featured}
                  onChange={(e) => setArticleForm({ ...articleForm, is_featured: e.target.checked })}
                  className="rounded text-brand-blue"
                />
                <label htmlFor="is_featured" className="font-bold text-slate-700 cursor-pointer">
                  Mettre cette publication à la Une sur la page d'accueil
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsArticleModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-navy-900 text-white rounded-xl font-bold shadow"
                >
                  Publier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CSV IMPORT & MULTI-YEAR INGESTION */}
      {/* ========================================================================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-brand-blue flex items-center justify-center border border-blue-200">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-navy-900">
                    Ingestion & Importation Budgétaire Multi-Années
                  </h4>
                  <p className="text-xs text-slate-500 font-semibold">
                    Loi de Finances (Ministères) ou Budgets des Collectivités (Mairies & Régions)
                  </p>
                </div>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ingestion Parameters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Exercice Budgétaire Cible
                </label>
                <select
                  value={importTargetYear}
                  onChange={(e) => setImportTargetYear(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="AUTO"> Détection Automatique (depuis le CSV)</option>
                  <option value="2026">Exercice 2026</option>
                  <option value="2027">Exercice 2027 (Nouveau)</option>
                  <option value="2028">Exercice 2028 (Futur)</option>
                  <option value="2029">Exercice 2029 (Futur)</option>
                  <option value="2030">Exercice 2030 (Futur)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Mode d'Application
                </label>
                <select
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value as 'REPLACE_YEAR' | 'APPEND')}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="REPLACE_YEAR"> Remplacer l'exercice entier (Recommandé)</option>
                  <option value="APPEND"> Ajouter aux projets existants</option>
                </select>
              </div>
            </div>

            {/* Direct File Selector */}
            <div className="border-2 border-dashed border-slate-200 hover:border-brand-blue/60 transition-colors p-4 rounded-2xl bg-white text-center">
              <label className="cursor-pointer flex flex-col items-center justify-center gap-1.5">
                <FileSpreadsheet className="w-8 h-8 text-brand-blue" />
                <span className="text-xs font-black text-slate-800">
                  Cliquez ici pour sélectionner un fichier CSV officiel (DGBF / DataIvoire)
                </span>
                <span className="text-[11px] text-slate-400 font-semibold">
                  Encodage UTF-8 ou Latin-1 • Séparateur point-virgule (;) ou virgule (,)
                </span>
                <input
                  type="file"
                  accept=".csv, .txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Or Paste CSV Content */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Ou collez le texte brut du fichier CSV :
              </label>
              <textarea
                rows={5}
                value={csvUploadText}
                onChange={(e) => setCsvUploadText(e.target.value)}
                placeholder="Annee;Type;Ministere;Service;Programme;Nature;Libelle;Valeur&#10;2027;EMPLOIS;MINISTERES;...;Travaux de construction;450000000"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono select-all focus:bg-white transition-colors"
              />
            </div>

            {importStatus && (
              <div className="p-4 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-2xl text-xs font-bold space-y-1">
                <div className="flex items-center gap-2 text-emerald-700 font-black">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Importation réussie pour l'exercice {importStatus.detectedYear} !</span>
                </div>
                <div className="text-[11px] text-emerald-800 font-semibold pl-7">
                  • {importStatus.success} projets importés et validés.<br />
                  • Volume budgétaire : {importStatus.totalAmount ? (importStatus.totalAmount / 1000000000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' Mrds FCFA' : 'Calculé'}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-400 font-semibold">
                Action immédiate et transparente pour tous les utilisateurs.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={handleProcessImportCSV}
                  disabled={!csvUploadText.trim()}
                  className="px-6 py-2.5 bg-brand-blue hover:bg-navy-900 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Valider & Déployer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RESTORE BACKUP JSON */}
      {/* ========================================================================= */}
      {isBackupModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-600" />
                <h4 className="text-base font-extrabold text-navy-900">
                  Restaurer la Plateforme depuis un JSON de Sauvegarde
                </h4>
              </div>
              <button onClick={() => setIsBackupModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Collez ci-dessous le contenu du fichier de sauvegarde <code>.json</code> préalablement téléchargé.
            </p>

            <textarea
              rows={8}
              value={backupJsonInput}
              onChange={(e) => setBackupJsonInput(e.target.value)}
              placeholder='{ "version": "6.0", "projects": [...], "institutions": [...] }'
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBackupModalOpen(false)}
                className="px-4 py-2 border rounded-xl text-xs font-bold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleRestoreBackup}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow"
              >
                Rétablir la sauvegarde
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
