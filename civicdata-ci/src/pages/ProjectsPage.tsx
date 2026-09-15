import { matchesSmartSearch, normalizeSearchText } from '../utils/searchHelpers';
import React, { useState, useRef } from 'react';
import { BudgetProject } from '../types';
import { ProjectCard } from '../components/ProjectCard';
import { CATEGORIES, getCategoryBadgeClass } from '../data/categories';
import { dataStore } from '../services/dataStore';
import { formatCompactFCFA, formatFCFA, formatAmountInWords, getProjectEntityInfo } from '../utils/formatters';
import { 
  Camera,
  Search, 
  Filter, 
  ArrowUpDown, 
  MapPin, 
  Building2,
  TrendingUp,
  LayoutGrid,
  Table as TableIcon,
  Download,
  ArrowRight,
  Share2,
  Sparkles,
  Navigation,
  CheckCircle,
  Eye,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';

interface ProjectsPageProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSelectProject: (project: BudgetProject) => void;
  onOpenSendProof: (project: BudgetProject) => void;
  onOpenShare: (project: BudgetProject) => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({
  searchQuery,
  setSearchQuery,
  onSelectProject,
  onOpenSendProof,
  onOpenShare,
}) => {
  const allProjects = dataStore.getProjects();
  const [selectedScope, setSelectedScope] = useState<'LOCAL' | 'NATIONAL' | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [onlyPhysical, setOnlyPhysical] = useState<boolean>(true); // Youth friendly default: filter out pure salaries/provisions
  const [sortBy, setSortBy] = useState<'amount-desc' | 'amount-asc' | 'title'>('amount-desc');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const activeFiltersCount = (selectedCategory !== 'ALL' ? 1 : 0) + 
    (selectedRegion !== 'ALL' ? 1 : 0) + 
    (sortBy !== 'amount-desc' ? 1 : 0);

  // Helper for physical infrastructure filter (youth filter)
  const isAbstractProject = (p: BudgetProject) => {
    const titleLow = p.title.toLowerCase();
    return titleLow.startsWith('assurer le traitement salarial') || 
           titleLow.startsWith('traitement salarial') || 
           titleLow.startsWith('indemnité') ||
           titleLow.startsWith('provision pour investissement');
  };

  // Base scope pools (dynamically reactive to onlyPhysical toggle)
  const activePool = onlyPhysical ? allProjects.filter(p => !isAbstractProject(p)) : allProjects;
  const localProjectsTotal = activePool.filter(p => p.scope_level !== 'NATIONAL');
  const nationalProjectsTotal = activePool.filter(p => p.scope_level === 'NATIONAL');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [jumpInput, setJumpInput] = useState<string>('');
  const PAGE_SIZE = viewMode === 'TABLE' ? pageSize : 12;

  // Horizontal scroll container ref for categories
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // Extract unique regions for dropdown
  const uniqueRegions = Array.from(new Set(allProjects.map(p => p.region_name))).filter(Boolean).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

  // GPS Geolocation trigger for "Around Me"
  const [isLocating, setIsLocating] = useState(false);
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        // Default smart focus on Abidjan or nearby region
        setSelectedRegion('Abidjan');
        setCurrentPage(1);
      },
      () => {
        setIsLocating(false);
        setSelectedRegion('Abidjan');
        setCurrentPage(1);
      }
    );
  };

  // Filter and sort projects
  const filteredProjects = activePool.filter((p) => {
    // Scope Level Filter (Double Échelle)
    const matchesScope =
      selectedScope === 'ALL' ||
      (selectedScope === 'LOCAL' && p.scope_level !== 'NATIONAL') ||
      (selectedScope === 'NATIONAL' && p.scope_level === 'NATIONAL');

    if (!matchesScope) return false;

    // Text search
    const matchesSearch = matchesSmartSearch(
      [
        p.title,
        p.commune_name,
        p.region_name,
        p.category,
        p.locality_village_neighborhood,
        p.contractor_name,
        p.institution_name,
        p.ministry_name || '',
      ],
      searchQuery
    );

    // Category filter
    const matchesCategory =
      selectedCategory === 'ALL' ||
      normalizeSearchText(p.category) === normalizeSearchText(selectedCategory) ||
      normalizeSearchText(p.category).includes(normalizeSearchText(selectedCategory));

    // Status filter
    const matchesStatus =
      selectedStatus === 'ALL' || p.current_status === selectedStatus;

    // Region filter
    const matchesRegion =
      selectedRegion === 'ALL' ||
      normalizeSearchText(p.region_name) === normalizeSearchText(selectedRegion);

    return matchesSearch && matchesCategory && matchesStatus && matchesRegion;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (sortBy === 'amount-desc') return b.budget_amount_fcfa - a.budget_amount_fcfa;
    if (sortBy === 'amount-asc') return a.budget_amount_fcfa - b.budget_amount_fcfa;
    return a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' });
  });

  // Calculate stats
  const totalBudgetFiltered = filteredProjects.reduce((acc, curr) => acc + curr.budget_amount_fcfa, 0);

  // Pagination bounds
  const totalPages = Math.ceil(sortedProjects.length / PAGE_SIZE) || 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, sortedProjects.length);
  const paginatedProjects = sortedProjects.slice(startIndex, endIndex);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Intitule', 'Entite_En_Charge', 'Region', 'Secteur', 'Budget_FCFA', 'Statut'];
    const rows = sortedProjects.map(p => {
      const entity = getProjectEntityInfo(p.commune_name, p.region_name);
      return [
        p.id,
        `"${p.title.replace(/"/g, '""')}"`,
        `"${entity.entityName}"`,
        `"${p.region_name || ''}"`,
        `"${p.category || ''}"`,
        p.budget_amount_fcfa,
        p.current_status
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vie-publique-ci-chantiers-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-8">
      
      {/* ========================================================================= */}
      {/* 1. YOUTH CITIZEN ENGAGEMENT BANNER                                        */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-brand-blue to-slate-900 text-white rounded-3xl p-4 sm:p-7 mb-4 sm:mb-6 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-5">
          <div>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-brand-orange text-white text-xs font-black uppercase tracking-wider mb-2 shadow-2xs">
              <span>Investissements Publics 2026</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white">
              Observatoire des Projets Locaux & Grands Chantiers en Côte d'Ivoire
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 mt-1.5 max-w-2xl leading-relaxed">
              Explorez les <strong>{localProjectsTotal.length.toLocaleString('fr-FR')} projets communaux, régionaux</strong> et <strong>{nationalProjectsTotal.length.toLocaleString('fr-FR')} chantiers d'État prévus</strong>, et contribuez avec vos constats sur le terrain.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl border border-white/20 flex-shrink-0 w-full sm:w-auto justify-around sm:justify-start">
            <div>
              <span className="text-[10px] text-slate-300 block font-bold uppercase tracking-wider">Chantiers Actifs</span>
              <span className="text-lg sm:text-2xl font-black text-white">{filteredProjects.length.toLocaleString('fr-FR')}</span>
            </div>
            <div className="w-px h-8 bg-white/20 mx-1"></div>
            <div>
              <span className="text-[10px] text-slate-300 block font-bold uppercase tracking-wider">Budget Alloué</span>
              <span className="text-lg sm:text-2xl font-black text-brand-orange">{formatCompactFCFA(totalBudgetFiltered)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. OPTIMIZED SEARCH & SMART FILTER BAR (CLEAN & MODERN)                   */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-3.5 sm:p-6 border border-slate-200 shadow-sm mb-6 space-y-4">
        
        {/* TOP LEVEL: Primary Scope Switcher + Real Projects + View Modes + Export */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Scope Segmented Control: 3 equal tabs, 100% visible on mobile, zero truncation */}
          <div className="grid grid-cols-3 p-1 sm:p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/70 gap-1 w-full lg:flex-1">
            {/* 1. TOUS */}
            <button
              onClick={() => {
                setSelectedScope('ALL');
                setCurrentPage(1);
              }}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 sm:px-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                selectedScope === 'ALL'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Tous</span>
              <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black ${
                selectedScope === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {activePool.length.toLocaleString('fr-FR')}
              </span>
            </button>

            {/* 2. LOCAUX */}
            <button
              onClick={() => {
                setSelectedScope('LOCAL');
                setCurrentPage(1);
              }}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 sm:px-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                selectedScope === 'LOCAL'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span><span className="hidden sm:inline">Projets </span>Locaux</span>
              <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black ${
                selectedScope === 'LOCAL' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {localProjectsTotal.length.toLocaleString('fr-FR')}
              </span>
            </button>

            {/* 3. GRANDS CHANTIERS */}
            <button
              onClick={() => {
                setSelectedScope('NATIONAL');
                setCurrentPage(1);
              }}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 sm:px-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                selectedScope === 'NATIONAL'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span><span className="hidden sm:inline">Grands </span>Chantiers</span>
              <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black ${
                selectedScope === 'NATIONAL' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {nationalProjectsTotal.length.toLocaleString('fr-FR')}
              </span>
            </button>
          </div>

          {/* Secondary Controls: Physical Filter + View Mode Switcher + Export CSV */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between lg:justify-end gap-2.5 w-full lg:w-auto">
            {/* Real Projects Filter: 50/50 symmetric grid on mobile, inline on sm+ */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200/70 text-xs w-full sm:w-auto">
              <button
                onClick={() => {
                  setOnlyPhysical(true);
                  setCurrentPage(1);
                }}
                className={`py-2 px-3 text-center rounded-xl font-extrabold transition-all cursor-pointer ${
                  onlyPhysical
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Afficher uniquement les chantiers physiques et équipements concrets"
              >
                Chantiers Réels
              </button>
              <button
                onClick={() => {
                  setOnlyPhysical(false);
                  setCurrentPage(1);
                }}
                className={`py-2 px-3 text-center rounded-xl font-extrabold transition-all cursor-pointer ${
                  !onlyPhysical
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Afficher toutes les lignes de crédits budgétaires"
              >
                Tout le Budget
              </button>
            </div>

            {/* View Mode & Export CSV: Balanced row on mobile */}
            <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
              {/* View Mode (Grid vs Table) */}
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200/70 text-xs flex-1 sm:flex-initial">
                <button
                  onClick={() => setViewMode('GRID')}
                  className={`px-3 py-2 text-center rounded-xl font-extrabold transition-all cursor-pointer ${
                    viewMode === 'GRID'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Affichage en Grille de Cartes"
                >
                  Grille
                </button>
                <button
                  onClick={() => setViewMode('TABLE')}
                  className={`px-3 py-2 text-center rounded-xl font-extrabold transition-all cursor-pointer ${
                    viewMode === 'TABLE'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Affichage en Tableau Détaillé"
                >
                  Tableau
                </button>
              </div>

              {/* Export CSV Button */}
              <button
                onClick={handleExportCSV}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-2xl transition-all border border-slate-200 text-xs font-black flex-1 sm:flex-initial cursor-pointer"
                title="Exporter les résultats filtrés en fichier CSV pour Excel"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* MIDDLE LEVEL: Search Bar + Mobile Filters Trigger */}
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
            {/* Main Search Input */}
            <div className="lg:col-span-12 relative">
              <input
                type="text"
                placeholder="Rechercher un chantier, une commune, un collège, un hôpital..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition-all placeholder:text-slate-400 text-slate-900"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded-full"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Mobile Filters Toggle Button (Hidden on Desktop) */}
          <div className="flex lg:hidden items-center justify-between gap-2 pt-1">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                showMobileFilters || activeFiltersCount > 0
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{showMobileFilters ? 'Masquer les filtres' : 'Filtres & Tri (Régions, Thématiques...)'}</span>
              {activeFiltersCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-brand-orange text-white text-[10px] font-black">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <button
              onClick={handleLocateMe}
              disabled={isLocating}
              className="flex items-center gap-1.5 py-2 px-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex-shrink-0 cursor-pointer"
              title="Afficher les chantiers géolocalisés autour de ma position GPS"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Près de moi</span>
              <span className="sm:hidden">GPS</span>
            </button>
          </div>

          {/* Advanced Dropdowns (Collapsible on Mobile, always visible on Desktop) */}
          <div className={`${showMobileFilters ? 'grid' : 'hidden lg:grid'} grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 pt-1`}>
            {/* Region Dropdown */}
            <div className="lg:col-span-5">
              <select
                value={selectedRegion}
                onChange={(e) => {
                  setSelectedRegion(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 cursor-pointer transition-all truncate"
              >
                <option value="ALL">Toutes les Régions ({uniqueRegions.length})</option>
                {uniqueRegions.map(reg => (
                  <option key={reg} value={reg}>{reg}</option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="lg:col-span-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 cursor-pointer transition-all truncate"
              >
                <option value="amount-desc">Budget Décroissant</option>
                <option value="amount-asc">Budget Croissant</option>
                <option value="title">Alphabétique (A-Z)</option>
              </select>
            </div>

            {/* Around Me Button (Desktop) */}
            <div className="hidden lg:block lg:col-span-3">
              <button
                onClick={handleLocateMe}
                disabled={isLocating}
                className="w-full flex items-center justify-center py-2.5 px-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-2xl text-xs font-black shadow-xs transition-all cursor-pointer"
                title="Afficher les chantiers géolocalisés autour de ma position GPS"
              >
                <span>{isLocating ? 'Géolocalisation...' : 'Près de moi'}</span>
              </button>
            </div>
          </div>

          {/* Categories Filter (Collapsible on Mobile, always visible on Desktop) */}
          <div className={`${showMobileFilters ? 'block' : 'hidden lg:block'} pt-2 border-t border-slate-100`}>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setCurrentPage(1);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/60'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. RESULTS VIEW (GRID OR TABLE)                                           */}
      {/* ========================================================================= */}
      {sortedProjects.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center my-8">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-black text-slate-900">Aucun chantier ne correspond à vos critères</h3>
          <p className="text-xs text-slate-500 mt-1">Essayez d'élargir vos filtres ou de changer de région.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
              setSelectedRegion('ALL');
              setSelectedStatus('ALL');
              setOnlyPhysical(true);
            }}
            className="mt-4 px-4 py-2 bg-brand-blue text-white text-xs font-bold rounded-xl shadow-2xs hover:bg-brand-blue-dark transition-colors inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réinitialiser les filtres</span>
          </button>
        </div>
      ) : viewMode === 'GRID' ? (

        /* 1. GRID VIEW (CARDS) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedProjects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onSelect={onSelectProject}
              onSendProof={onOpenSendProof}
              onShare={onOpenShare}
            />
          ))}
        </div>

      ) : (

        /* 2. TABLE VIEW (DATA TABLE) - Responsive 100% width with 0 horizontal scroll */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead className="bg-slate-50 text-[11px] uppercase font-black tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-3 min-w-[200px]">Intitulé du Chantier</th>
                  <th className="py-3.5 px-3 whitespace-nowrap min-w-[150px] w-[20%]">Entité en Charge</th>
                  <th className="py-3.5 px-3 whitespace-nowrap min-w-[110px] w-[13%]">Secteur</th>
                  <th className="py-3.5 px-3 text-right whitespace-nowrap min-w-[140px] w-[17%]">Budget Alloué</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap min-w-[125px] w-[15%]">Statut / Suivi</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap min-w-[110px] w-[12%]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedProjects.map((p) => {
                  const entity = getProjectEntityInfo(p.commune_name, p.region_name);
                  const proofs = dataStore.getProofsForProject(p.id);
                  const verifiedProofs = proofs.filter(pr => pr.verification_status === 'APPROVED');
                  const hasOfficialResponse = !!(p as any).official_response || !!(p as any).official_report_url;

                  return (
                    <tr 
                      key={p.id} 
                      onClick={() => onSelectProject(p)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                    >
                      {/* Col 1: Intitulé du Chantier */}
                      <td className="py-3 px-3 font-bold text-slate-900">
                        <div className="line-clamp-2 group-hover:text-brand-blue transition-colors text-xs font-black leading-snug">
                          {p.title}
                        </div>
                      </td>

                      {/* Col 2: Entité en Charge (Maître d'ouvrage) */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border ${entity.entityBadgeClass}`}>
                          {entity.entityType === 'MAIRIE' ? '' : '️'}
                          <span className="truncate max-w-[140px] sm:max-w-none">{entity.entityName}</span>
                        </span>
                      </td>

                      {/* Col 3: Secteur */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${getCategoryBadgeClass(p.category)}`}>
                          {p.category}
                        </span>
                      </td>

                      {/* Col 4: Budget Alloué (Dual Display) */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="font-black text-slate-900 text-xs">
                          {formatFCFA(p.budget_amount_fcfa)}
                        </div>
                        <div className="text-[10px] font-bold text-brand-blue">
                          ({formatAmountInWords(p.budget_amount_fcfa)} FCFA)
                        </div>
                      </td>

                      {/* Col 5: Statut / Suivi */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {hasOfficialResponse ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1 shadow-2xs">
                            <span>️ Rapport reçu</span>
                          </span>
                        ) : verifiedProofs.length > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-50 text-sky-800 border border-sky-200 inline-flex items-center gap-1 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
                            <span>{verifiedProofs.length} constat(s)</span>
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenSendProof(p);
                            }}
                            className="px-2 py-0.5 rounded-full text-[10px] font-medium text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors inline-flex items-center gap-1"
                            title="Aucun constat citoyen à ce jour. Cliquez pour transmettre une photo de terrain."
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            <span>En attente de constat</span>
                          </button>
                        )}
                      </td>

                      {/* Col 6: Action (Suivi Citoyen) */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenSendProof(p);
                          }}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-brand-blue text-white rounded-lg text-[11px] font-bold transition-all inline-flex items-center gap-1 shadow-2xs active:scale-95"
                          title="Transmettre une photo preuve pour ce chantier"
                        >
                          <Camera className="w-3 h-3" />
                          <span>Suivi Citoyen</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      )}

      {/* ========================================================================= */}
      {/* 4. GUIDE DES PAGES & NAVIGATION DIRECTE (Interactive Pagination Bar)       */}
      {/* ========================================================================= */}
      {sortedProjects.length > 0 && (() => {
        // Generate visible page numbers with smart ellipsis
        const getVisiblePages = (current: number, total: number) => {
          if (total <= 7) {
            return Array.from({ length: total }, (_, i) => i + 1);
          }
          if (current <= 4) {
            return [1, 2, 3, 4, 5, '...', total];
          }
          if (current >= total - 3) {
            return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
          }
          return [1, '...', current - 1, current, current + 1, '...', total];
        };

        const visiblePages = getVisiblePages(safePage, totalPages);

        const handleJumpSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          const target = parseInt(jumpInput, 10);
          if (!isNaN(target) && target >= 1 && target <= totalPages) {
            setCurrentPage(target);
            setJumpInput('');
            window.scrollTo({ top: 300, behavior: 'smooth' });
          }
        };

        return (
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4 mt-8">
            
            {/* 1. Direct Page Numbers Guide */}
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {/* First Page */}
              <button
                onClick={() => {
                  setCurrentPage(1);
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                disabled={safePage <= 1}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-black text-xs shadow-2xs"
                title="Première page (Page 1)"
              >
                «
              </button>

              {/* Prev Page */}
              <button
                onClick={() => {
                  setCurrentPage(p => Math.max(1, p - 1));
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                disabled={safePage <= 1}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-black text-sm shadow-2xs"
                title="Page précédente"
              >
                ‹
              </button>

              {/* Page Number Pills */}
              {visiblePages.map((pg, idx) => {
                if (pg === '...') {
                  return (
                    <span key={`ellipsis-${idx}`} className="w-8 h-9 flex items-center justify-center text-slate-400 font-black text-xs">
                      ...
                    </span>
                  );
                }
                const pageNum = pg as number;
                const isActive = pageNum === safePage;

                return (
                  <button
                    key={`page-${pageNum}`}
                    onClick={() => {
                      setCurrentPage(pageNum);
                      window.scrollTo({ top: 300, behavior: 'smooth' });
                    }}
                    className={`min-w-[36px] h-9 px-2.5 flex items-center justify-center rounded-xl font-black text-xs transition-all shadow-2xs ${
                      isActive
                        ? 'bg-brand-blue text-white shadow-md scale-105'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-blue-50 hover:text-brand-blue hover:border-blue-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {/* Next Page */}
              <button
                onClick={() => {
                  setCurrentPage(p => Math.min(totalPages, p + 1));
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                disabled={safePage >= totalPages}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-black text-sm shadow-2xs"
                title="Page suivante"
              >
                ›
              </button>

              {/* Last Page */}
              <button
                onClick={() => {
                  setCurrentPage(totalPages);
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                disabled={safePage >= totalPages}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-black text-xs shadow-2xs"
                title={`Dernière page (Page ${totalPages})`}
              >
                »
              </button>
            </div>

            {/* 2. Direct Jump Form & Page Size Selector */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
              
              {/* Quick Jump Input */}
              <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-bold px-2">Aller à la page :</span>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  placeholder={`1-${totalPages}`}
                  value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value)}
                  className="w-20 h-8 px-2 text-center font-black text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-blue"
                />
                <button
                  type="submit"
                  className="h-8 px-3 bg-brand-blue hover:bg-brand-blue-dark text-white font-bold rounded-lg transition-colors shadow-2xs active:scale-95"
                >
                  Aller
                </button>
              </form>

              {/* Page Density Selector */}
              {viewMode === 'TABLE' && (
                <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold px-1.5">Lignes :</span>
                  {[20, 50, 100].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setPageSize(size);
                        setCurrentPage(1);
                      }}
                      className={`h-8 px-2.5 rounded-lg font-black text-xs transition-all ${
                        pageSize === size
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-white'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              )}

              {/* Total Count Display */}
              <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
                {startIndex + 1}-{endIndex} / {sortedProjects.length}
              </div>

            </div>

          </div>
        );
      })()}

    </div>
  );
};
