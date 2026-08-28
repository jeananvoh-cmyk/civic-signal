import React, { useState } from 'react';
import { BudgetProject, ProjectStatus } from '../types';
import { ProjectCard } from '../components/ProjectCard';
import { CATEGORIES } from '../data/categories';
import { dataStore } from '../services/dataStore';
import { formatFCFA, formatCompactFCFA } from '../utils/formatters';
import { 
  Coins, 
  Search, 
  Filter, 
  ArrowUpDown, 
  MapPin, 
  CheckCircle2,
  Building2,
  TrendingUp
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
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'amount-desc' | 'amount-asc' | 'title'>('amount-desc');

  // Extract unique regions for the dropdown
  const uniqueRegions = Array.from(new Set(allProjects.map(p => p.region_name))).sort();

  // Filter and sort projects
  const filteredProjects = allProjects.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.commune_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.region_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.locality_village_neighborhood && p.locality_village_neighborhood.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'ALL' || p.category.toLowerCase().includes(selectedCategory.toLowerCase());

    const matchesStatus =
      selectedStatus === 'ALL' || p.current_status === selectedStatus;

    const matchesRegion =
      selectedRegion === 'ALL' || p.region_name === selectedRegion;

    return matchesSearch && matchesCategory && matchesStatus && matchesRegion;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (sortBy === 'amount-desc') return b.budget_amount_fcfa - a.budget_amount_fcfa;
    if (sortBy === 'amount-asc') return a.budget_amount_fcfa - b.budget_amount_fcfa;
    return a.title.localeCompare(b.title);
  });

  const totalFilteredBudget = sortedProjects.reduce((sum, p) => sum + p.budget_amount_fcfa, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-24">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold mb-2">
            <Coins className="w-4 h-4 text-terracotta-500" />
            <span>Module 2 • Données de la Loi de Finances 2026</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-navy-900 tracking-tight font-sans">
            Budget Public & Projets d'Infrastructures
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Explorez les lignes d'investissements publics votées pour chaque commune et région de Côte d'Ivoire. Consultez les montants en FCFA et les fiches vulgarisées.
          </p>
        </div>

        {/* Aggregate Stats Box */}
        <div className="p-3.5 bg-gradient-to-br from-navy-900 to-navy-950 text-white rounded-2xl shadow-md border border-navy-800 flex items-center gap-4 text-xs">
          <div>
            <span className="text-slate-400 block">Projets affichés</span>
            <span className="font-extrabold text-lg text-white font-sans">{sortedProjects.length}</span>
          </div>
          <div className="h-8 w-px bg-navy-800"></div>
          <div>
            <span className="text-slate-400 block">Total Budget Filtré</span>
            <span className="font-extrabold text-lg text-terracotta-400 font-sans">{formatCompactFCFA(totalFilteredBudget)}</span>
          </div>
        </div>
      </div>

      {/* SEARCH AND ADVANCED FILTERS BAR */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
        
        {/* Main Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par mot-clé, commune, région, village (ex: Bakro, école, forage...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800 focus:bg-white"
          />
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Filter 1: Category */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Catégorie / Secteur
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-700"
            >
              <option value="ALL">Toutes les catégories</option>
              <option value="Santé">Santé & Maternités</option>
              <option value="Éducation">Éducation & Écoles</option>
              <option value="Eau">Eau & Hydraulique (HVA)</option>
              <option value="Voirie">Voirie & Routes</option>
              <option value="Energie">Électrification & Énergie</option>
              <option value="Marchés">Marchés & Commerces</option>
              <option value="Logement">Logement Social</option>
              <option value="Culture">Culture & Sport</option>
              <option value="Services">Services Généraux</option>
            </select>
          </div>

          {/* Filter 2: Status */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Statut Terrain
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-700"
            >
              <option value="ALL">Tous les statuts (🔴/🟡/🟢)</option>
              <option value="NOT_STARTED">🔴 Non commencé</option>
              <option value="IN_PROGRESS">🟡 En cours</option>
              <option value="COMPLETED">🟢 Terminé / Livré</option>
            </select>
          </div>

          {/* Filter 3: Region */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Région / District
            </label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-700"
            >
              <option value="ALL">Toutes les régions ({uniqueRegions.length})</option>
              {uniqueRegions.map((reg) => (
                <option key={reg} value={reg}>{reg}</option>
              ))}
            </select>
          </div>

          {/* Filter 4: Sort */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Trier par
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-700"
            >
              <option value="amount-desc">Budget : Plus élevé d'abord</option>
              <option value="amount-asc">Budget : Moins élevé d'abord</option>
              <option value="title">Titre du projet (A-Z)</option>
            </select>
          </div>

        </div>

      </div>

      {/* PROJECTS LIST GRID */}
      {sortedProjects.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-md mx-auto">
          <p className="text-base font-bold text-navy-900">Aucun projet trouvé</p>
          <p className="text-xs text-slate-500 mt-1">
            Essayez de modifier vos critères de recherche ou vos filtres.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
              setSelectedStatus('ALL');
              setSelectedRegion('ALL');
            }}
            className="mt-4 px-4 py-2 bg-navy-900 text-white rounded-xl text-xs font-bold"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onSelect={onSelectProject}
              onSendProof={onOpenSendProof}
              onShare={onOpenShare}
            />
          ))}
        </div>
      )}

    </div>
  );
};
