import React, { useState } from 'react';
import { BudgetProject, ImpactStats } from '../types';
import { HeroSection } from '../components/HeroSection';
import { StatImpactBanner } from '../components/StatImpactBanner';
import { ProjectCard } from '../components/ProjectCard';
import { dataStore } from '../services/dataStore';
import { 
  Flame, 
  ArrowRight, 
  Camera, 
  ShieldCheck, 
  Eye, 
  CheckCircle2, 
  Sparkles, 
  Building2,
  TrendingUp
} from 'lucide-react';

interface HomePageProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSelectProject: (project: BudgetProject) => void;
  onOpenSendProof: (project?: BudgetProject) => void;
  onOpenShare: (project: BudgetProject) => void;
  onNavigateTab: (tab: 'institutions' | 'projects' | 'observatory') => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  searchQuery,
  setSearchQuery,
  onSelectProject,
  onOpenSendProof,
  onOpenShare,
  onNavigateTab,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const allProjects = dataStore.getProjects();
  const stats = dataStore.getImpactStats();

  // Filter projects for the "Projets du Moment" grid
  const filteredProjects = allProjects.filter((p) => {
    const matchesSearch = 
      !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.commune_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.region_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = 
      selectedCategory === 'ALL' ||
      p.category.toLowerCase().includes(selectedCategory.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  const featuredProjects = filteredProjects.slice(0, 6);

  return (
    <div className="space-y-10 pb-20">
      
      {/* 1. HERO SECTION */}
      <HeroSection
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        onExploreClick={() => onNavigateTab('projects')}
      />

      {/* 2. STAT IMPACT BANNER (4 Big Number Cards) */}
      <StatImpactBanner stats={stats} />

      {/* 3. PROJETS DU MOMENT (FEATURED PROJECTS GRID) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-terracotta-600 mb-1">
              <Flame className="w-4 h-4 text-terracotta-500" />
              <span>Priorités & Chantiers Clés</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight font-sans">
              Projets du Moment en Côte d'Ivoire
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Investissements publics locaux votés pour l'exercice 2026
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('projects')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-navy-900 hover:text-terracotta-600 transition-colors group self-start sm:self-auto"
          >
            <span>Explorer les {allProjects.length} projets</span>
            <ArrowRight className="w-4 h-4 text-terracotta-500 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Projects Grid */}
        {featuredProjects.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-sm max-w-md mx-auto">
            <p className="text-slate-600 font-medium">Aucun projet ne correspond à votre recherche.</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); }}
              className="mt-3 px-4 py-2 bg-navy-900 text-white rounded-xl text-xs font-bold"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {featuredProjects.map((project) => (
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

      </section>

      {/* 4. CITIZEN ENGAGEMENT CALLOUT BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-r from-navy-900 via-navy-800 to-navy-950 text-white p-6 sm:p-10 shadow-xl overflow-hidden border border-navy-700">
          
          <div className="absolute right-0 top-0 w-80 h-80 bg-terracotta-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            <div className="lg:col-span-8 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-terracotta-500/20 text-terracotta-300 text-xs font-semibold border border-terracotta-500/30">
                <ShieldCheck className="w-4 h-4" />
                <span>Réseau des Observateurs Citoyens</span>
              </div>
              
              <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                Vous constatez un chantier public près de chez vous ?
              </h3>
              
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Prenez une photo depuis votre téléphone, indiquez le statut réel (Non démarré, En cours, Livré) et publiez votre constatation pour alimenter l'Observatoire Terrain de Côte d'Ivoire.
              </p>
            </div>

            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 justify-center">
              <button
                onClick={() => onOpenSendProof()}
                className="py-3.5 px-6 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
              >
                <Camera className="w-5 h-5" />
                <span>Envoyer une preuve photo</span>
              </button>

              <button
                onClick={() => onNavigateTab('observatory')}
                className="py-3 px-6 bg-navy-800 hover:bg-navy-700 border border-navy-600 text-slate-200 hover:text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Eye className="w-4 h-4 text-terracotta-400" />
                <span>Voir les photos de l'Observatoire</span>
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* 5. HOW IT WORKS 3-STEP EXPLAINER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h3 className="text-xl sm:text-2xl font-extrabold text-navy-900 tracking-tight">
            Comment fonctionne le Contrôle Citoyen ?
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Une démarche transparente et participative en 3 étapes simples
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col items-start">
            <div className="w-10 h-10 rounded-xl bg-navy-50 text-navy-900 font-extrabold flex items-center justify-center text-lg mb-3">
              1
            </div>
            <h4 className="text-base font-bold text-navy-900 mb-1">
              Consultez le Budget Public
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Recherchez votre commune ou région et découvrez chaque ligne d'investissement votée en FCFA dans la Loi de Finances.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col items-start">
            <div className="w-10 h-10 rounded-xl bg-terracotta-50 text-terracotta-600 font-extrabold flex items-center justify-center text-lg mb-3">
              2
            </div>
            <h4 className="text-base font-bold text-navy-900 mb-1">
              Vérifiez sur le Terrain
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Rendez-vous sur place, photographiez le chantier et partagez l'état d'avancement réel en toute indépendance.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col items-start">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 font-extrabold flex items-center justify-center text-lg mb-3">
              3
            </div>
            <h4 className="text-base font-bold text-navy-900 mb-1">
              Alertez & Suivez l'Impact
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Les preuves sont vérifiées et publiées dans l'Observatoire. Partagez les fiches pour demander des comptes aux élus.
            </p>
          </div>

        </div>
      </section>

    </div>
  );
};
