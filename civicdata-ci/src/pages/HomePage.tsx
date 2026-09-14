import { matchesSmartSearch } from '../utils/searchHelpers';
import React, { useState, useMemo, useEffect } from 'react';
import { BudgetProject, ImpactStats, NewsArticle } from '../types';
import { HeroSection } from '../components/HeroSection';
import { StatImpactBanner } from '../components/StatImpactBanner';
import { ProjectCard } from '../components/ProjectCard';
import { dataStore, isTangiblePhysicalProject } from '../services/dataStore';
import { formatFCFA, formatAmountInWords } from '../utils/formatters';
import { 
  ArrowRight, 
  Camera, 
  ShieldCheck, 
  Eye, 
  MapPin,
  Building2,
  Calendar,
  Newspaper,
  FileText,
  Download,
  X,
  Search,
  CheckCircle2,
  Users,
  ExternalLink,
  RotateCw
} from 'lucide-react';

const FREQUENT_CITIES = [
  'Abidjan',
  'Bouaké',
  'Korhogo',
  'Daloa',
  'San-Pédro',
  'Yamoussoukro',
  'Man',
  'Gagnoa',
  'Abengourou',
  'Divo',
];

interface HomePageProps {
  onOpenPrivateSentinel?: () => void;
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
  onOpenPrivateSentinel,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [readingArticle, setReadingArticle] = useState<NewsArticle | null>(null);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [selectedProximityCity, setSelectedProximityCity] = useState<string>('ALL');
  const allProjects = dataStore.getProjects();
  const allArticles = dataStore.getArticles();
  const [stats, setStats] = useState<ImpactStats>(() => dataStore.getImpactStats());

  useEffect(() => {
    return dataStore.subscribe(() => {
      setStats(dataStore.getImpactStats());
    });
  }, []);

  // Filter projects for the search / category
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

  // Calculate sector breakdowns from allProjects
  const sectorConfigs = [
    { 
      name: 'Infrastructures & Voirie', 
      key: 'Infrastructure', 
      countKey: 'Voirie', 
      bgBar: 'bg-blue-600',
      badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
      tagline: 'Routes, ponts & échangeurs' 
    },
    { 
      name: 'Éducation & Formation', 
      key: 'Éducation', 
      countKey: 'Education', 
      bgBar: 'bg-emerald-600',
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      tagline: 'Écoles, collèges & universités' 
    },
    { 
      name: 'Santé & Hygiène', 
      key: 'Santé', 
      countKey: 'Sante', 
      bgBar: 'bg-teal-600',
      badgeBg: 'bg-teal-50 text-teal-800 border-teal-200',
      tagline: 'Hôpitaux, CHU & maternités' 
    },
    { 
      name: 'Eau Potable & Assainissement', 
      key: 'Eau', 
      countKey: 'Eau', 
      bgBar: 'bg-sky-600',
      badgeBg: 'bg-sky-50 text-sky-800 border-sky-200',
      tagline: "Châteaux d'eau, forages & réseaux" 
    },
    { 
      name: 'Commerce & Économie', 
      key: 'Commerce', 
      countKey: 'Commerce', 
      bgBar: 'bg-amber-600',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
      tagline: 'Marchés couverts & zones d\'activités' 
    },
    { 
      name: 'Logement & Aménagement', 
      key: 'Logement', 
      countKey: 'Logement', 
      bgBar: 'bg-indigo-600',
      badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      tagline: 'Logements sociaux & cadre de vie' 
    },
  ];

  const totalAllProjectsAmount = allProjects.reduce((acc, p) => acc + p.budget_amount_fcfa, 0) || 1;

  const sectorData = sectorConfigs.map(s => {
    const matching = allProjects.filter(p => p.category.toLowerCase().includes(s.key.toLowerCase()));
    const amount = matching.reduce((acc, p) => acc + p.budget_amount_fcfa, 0);
    const count = matching.length;
    const pct = Math.max(2, Math.round((amount / totalAllProjectsAmount) * 100));
    return { ...s, amount, count, pct };
  });

  // 1. SECTION 1 : Grands Projets Stratégiques de l'État en Milliards FCFA
  const { heroFeatured, sideArticles } = useMemo(() => {
    // Select tangible State investments with top budgets in Billions / hundreds of Millions FCFA
    const stateProjects = allProjects
      .filter(p => isTangiblePhysicalProject(p) && (p.scope_level === 'NATIONAL' || p.budget_amount_fcfa >= 1_000_000_000))
      .sort((a, b) => b.budget_amount_fcfa - a.budget_amount_fcfa);

    const pool = stateProjects.length > 0 ? stateProjects : allProjects.filter(isTangiblePhysicalProject);

    if (pool.length === 0) {
      return { heroFeatured: null, sideArticles: [] };
    }

    // Top 25 State Mega Projects rotated by shuffleSeed
    const topPool = pool.slice(0, 25);
    const shuffledTop = [...topPool].sort(() => 0.5 - Math.random());

    // 1. Hero: Top State Mega Project
    const hero = shuffledTop[0] || pool[0];

    // 2. Side: 3 State projects with distinct categories and ministries
    const side: BudgetProject[] = [];
    const usedCategories = new Set<string>([hero.category]);
    const usedMinistries = new Set<string>([hero.ministry_name || '']);

    for (const p of shuffledTop) {
      if (p.id === hero.id) continue;
      const minName = p.ministry_name || '';
      if (!usedCategories.has(p.category) || (minName && !usedMinistries.has(minName))) {
        side.push(p);
        usedCategories.add(p.category);
        if (minName) usedMinistries.add(minName);
        if (side.length >= 3) break;
      }
    }

    // Fallback if needed
    if (side.length < 3) {
      for (const p of topPool) {
        if (p.id !== hero.id && !side.some(s => s.id === p.id)) {
          side.push(p);
          if (side.length >= 3) break;
        }
      }
    }

    return { heroFeatured: hero, sideArticles: side };
  }, [allProjects, shuffleSeed]);

  // 2. SECTION 2 : Chantiers Communaux & Régionaux de Proximité
  const localCommunalProjects = useMemo(() => {
    return allProjects.filter(p => 
      isTangiblePhysicalProject(p) && 
      (p.scope_level === 'LOCAL' || (p.commune_name && p.commune_name !== 'National / Multi-Régions' && !p.commune_name.includes('Assemblée') && !p.commune_name.includes('Présidence')))
    );
  }, [allProjects]);

  const defaultDiverseLocalGrid = useMemo(() => {
    // Group local projects by commune to guarantee geographical diversity
    const projectsByCommune = new Map<string, BudgetProject[]>();
    localCommunalProjects.forEach(p => {
      const list = projectsByCommune.get(p.commune_name) || [];
      list.push(p);
      projectsByCommune.set(p.commune_name, list);
    });

    const distinctCommunes = Array.from(projectsByCommune.keys()).sort(() => 0.5 - Math.random());
    const remaining: BudgetProject[] = [];
    const usedCommunes = new Set<string>();

    for (const c of distinctCommunes) {
      const commProjects = projectsByCommune.get(c) || [];
      const proj = commProjects.find(p => p.budget_amount_fcfa >= 10_000_000) || commProjects[0];
      if (proj && !usedCommunes.has(c)) {
        remaining.push(proj);
        usedCommunes.add(c);
        if (remaining.length >= 6) break;
      }
    }

    return remaining;
  }, [localCommunalProjects, shuffleSeed]);

  // Proximity projects based on selected frequent city
  const proximityFilteredProjects = useMemo(() => {
    if (selectedProximityCity === 'ALL') {
      // Default: 6 diverse communal projects across 6 distinct cities
      return defaultDiverseLocalGrid;
    }

    const query = selectedProximityCity.trim().toLowerCase();
    return localCommunalProjects.filter(p => 
      (p.commune_name && p.commune_name.toLowerCase().includes(query)) ||
      (p.region_name && p.region_name.toLowerCase().includes(query)) ||
      (p.title && p.title.toLowerCase().includes(query)) ||
      (p.details && p.details.toLowerCase().includes(query))
    );
  }, [localCommunalProjects, selectedProximityCity, defaultDiverseLocalGrid]);

  return (
    <div className="space-y-14 pb-24 bg-slate-50">
      
      {/* 1. HERO SECTION */}
      <HeroSection
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        onExploreClick={() => onNavigateTab('projects')}
        onOpenSendProof={() => onOpenSendProof()}
        onNavigateTab={onNavigateTab}
      />

      {/* 2. STAT IMPACT BANNER */}
      <StatImpactBanner stats={stats} />

      {/* 3. THE 4 CIVIC TECH PILLARS (BUDGIT STYLE - CLEAN PROFESSIONAL) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            4 Outils au Service de la Transparence Publique
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 font-medium">
            Des technologies citoyennes ouvertes pour auditer, participer et renforcer la confiance républicaine.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Pillar 1: Tracka-CI */}
          <div 
            onClick={() => onOpenSendProof()}
            className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-brand-blue/40 transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-black text-sm group-hover:bg-brand-blue group-hover:text-white transition-all">
                01
              </div>
              <h3 className="text-base font-black text-slate-900 group-hover:text-brand-blue transition-colors">
                Suivi Terrain & Constats
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Photographiez l'avancement réel des chantiers dans votre commune et déposez un constat citoyen vérifiable.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-brand-blue">
              <span>Transmettre un constat</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Pillar 2: Budget Ouvert */}
          <div 
            onClick={() => onNavigateTab('projects')}
            className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-brand-blue/40 transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-black text-sm group-hover:bg-slate-900 group-hover:text-white transition-all">
                02
              </div>
              <h3 className="text-base font-black text-slate-900 group-hover:text-brand-blue transition-colors">
                Budget Ouvert 2026
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Explorez 7 162 lignes d'investissement et 3 461 Mds FCFA votés pour les collectivités et ministères.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-brand-blue">
              <span>Consulter les chantiers</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Pillar 3: Portail CAIDP */}
          <div 
            onClick={() => onNavigateTab('institutions')}
            className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-brand-blue/40 transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-black text-sm group-hover:bg-slate-900 group-hover:text-white transition-all">
                03
              </div>
              <h3 className="text-base font-black text-slate-900 group-hover:text-brand-blue transition-colors">
                Transparence CAIDP
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Accédez aux coordonnées des Responsables d'Information officiels conformément à la Loi n°2013-867.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-brand-blue">
              <span>Annuaire officiel</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Pillar 4: Observatoire */}
          <div 
            onClick={() => onNavigateTab('observatory')}
            className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-brand-blue/40 transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-black text-sm group-hover:bg-slate-900 group-hover:text-white transition-all">
                04
              </div>
              <h3 className="text-base font-black text-slate-900 group-hover:text-brand-blue transition-colors">
                Observatoire & Rapports
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Baromètre d'exécution, constats citoyens validés et analyses budgétaires synthétiques.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-brand-blue">
              <span>Voir le baromètre</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

        </div>
      </section>

      {/* 4. INTERACTIVE SECTOR BREAKDOWN (BUDGET STORYTELLING) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Où vont les investissements publics en 2026 ?
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Répartition sectorielle des 7 162 chantiers inscrits au budget d'État et des collectivités locales.
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('projects')}
              className="text-xs font-bold text-brand-blue flex items-center gap-1 hover:underline flex-shrink-0"
            >
              Voir le détail complet <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sectorData.map((sec) => (
              <div
                key={sec.name}
                onClick={() => {
                  setSelectedCategory(sec.key);
                  onNavigateTab('projects');
                }}
                className="p-5 bg-white hover:bg-slate-50/80 rounded-2xl border border-slate-200/90 hover:border-brand-blue/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Header: Titre du Secteur & Part Budgétaire Claire (Option A) */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-black text-slate-900 text-base group-hover:text-brand-blue transition-colors leading-tight">
                        {sec.name}
                      </h4>
                      <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                        {sec.tagline}
                      </span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-black border flex-shrink-0 ${sec.badgeBg}`}>
                      {sec.pct} % du budget
                    </span>
                  </div>

                  {/* PILIER 1 : Budget & Jauge de Poids Financier (Option C) */}
                  <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">
                        Budget alloué 2026
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 font-medium">
                        {formatFCFA(sec.amount)}
                      </span>
                    </div>
                    
                    <div className="text-xl font-black text-slate-900 tracking-tight">
                      {formatAmountInWords(sec.amount)} FCFA
                    </div>

                    {/* Jauge explicite */}
                    <div className="space-y-1 pt-1">
                      <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`${sec.bgBar} h-full rounded-full transition-all duration-500`} 
                          style={{ width: `${Math.min(100, Math.max(3, sec.pct))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* PILIER 2 : Impact Réel sur le Terrain (Option C) */}
                  <div className="flex items-center justify-between bg-slate-50/50 rounded-xl px-3.5 py-2.5 border border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="text-xs font-bold text-slate-700">
                        <strong className="text-slate-900 font-black">{sec.count.toLocaleString('fr-FR')}</strong> chantiers prévus
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-brand-blue group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      Explorer <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. SECTION 1 : GRANDS PROJETS STRATÉGIQUES DE L'ÉTAT (EN MILLIARDS FCFA) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header with Title and Dynamic Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 border-b border-slate-200/80 pb-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-sans">
              Grands Projets Stratégiques de l'État
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Sélection des plus importants investissements publics de l'année 2026 (Infrastructures nationales, Transports, Santé, Eau en Milliards FCFA).
            </p>
          </div>

          <button
            onClick={() => setShuffleSeed(s => s + 1)}
            className="self-start sm:self-auto px-3.5 py-2 bg-white hover:bg-slate-100 active:scale-95 text-slate-700 hover:text-brand-blue border border-slate-200 shadow-2xs rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0"
            title="Découvrir d'autres grands projets stratégiques"
          >
            <RotateCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Actualiser la sélection</span>
          </button>
        </div>

        {/* Editorial 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: HERO FEATURED STORY (STATE MEGA PROJECT) */}
          {heroFeatured && (
            <div 
              onClick={() => onSelectProject(heroFeatured)}
              className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden cursor-pointer group hover:shadow-md hover:border-brand-blue/30 transition-all flex flex-col justify-between p-6 sm:p-8"
            >
              <div className="space-y-4">
                {/* Header Tags */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 bg-brand-blue text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-2xs">
                      {heroFeatured.category}
                    </span>
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 font-black text-xs uppercase tracking-wider rounded-lg">
                      Projet Majeur d'État
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-brand-blue" />
                    {heroFeatured.ministry_name || heroFeatured.commune_name}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-brand-blue transition-colors leading-snug pt-1">
                  {heroFeatured.title}
                </h3>

                {/* Financial Highlight Box */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Dotation Budgétaire Allouée
                    </span>
                    <span className="text-xl font-black text-slate-900 block">
                      {formatFCFA(heroFeatured.budget_amount_fcfa)}
                    </span>
                  </div>
                  <div className="text-right sm:text-right">
                    <span className="text-xs font-black text-brand-blue bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                      {formatAmountInWords(heroFeatured.budget_amount_fcfa)} FCFA
                    </span>
                  </div>
                </div>

                {/* Project Details Description */}
                <p className="text-slate-600 text-sm leading-relaxed line-clamp-3 font-normal">
                  {heroFeatured.details}
                </p>
              </div>

              {/* Card Footer */}
              <div className="pt-5 mt-5 flex items-center justify-between border-t border-slate-100 text-xs">
                <span className="font-bold text-brand-blue inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                  Consulter la Fiche & Déposer un Constat
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          )}

          {/* RIGHT: STACKED EDITORIAL LIST (STATE PROJECTS) */}
          <div className="lg:col-span-5 space-y-4">
            {sideArticles.map((article) => (
              <div
                key={article.id}
                onClick={() => onSelectProject(article)}
                className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:border-brand-blue/40 hover:shadow-md transition-all cursor-pointer group"
              >
                {/* Header Tag + Ministry */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-black text-[11px] uppercase tracking-wider text-brand-blue bg-blue-50 px-2 py-0.5 rounded">
                    {article.category}
                  </span>
                  <span className="text-xs text-slate-500 font-medium truncate max-w-[200px]" title={article.ministry_name || article.commune_name}>
                    {article.ministry_name || article.commune_name}
                  </span>
                </div>

                {/* Article Title */}
                <h4 className="font-black text-sm sm:text-base text-slate-900 group-hover:text-brand-blue transition-colors leading-snug mb-2 line-clamp-2">
                  {article.title}
                </h4>

                {/* Budget Pill (Dual Display) & Harmonized Action Button */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-black text-slate-900 block">
                      {formatFCFA(article.budget_amount_fcfa)}
                    </span>
                    <span className="text-[10px] font-bold text-brand-blue block">
                      ({formatAmountInWords(article.budget_amount_fcfa)} FCFA)
                    </span>
                  </div>
                  <span className="text-brand-blue font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Fiche & Constat
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>

      </section>

      {/* 5. SECTION 2 : CHANTIERS COMMUNAUX & RÉGIONAUX DE PROXIMITÉ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 border-b border-slate-200 pb-5">
          <div className="max-w-3xl">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Chantiers Communaux & Régionaux de Proximité
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1 leading-relaxed">
              Découvrez et suivez en direct les projets de développement local financés et exécutés par vos Mairies et Conseils Régionaux.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('projects')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-blue hover:bg-brand-blue-dark active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex-shrink-0 self-start md:self-auto"
          >
            <span>Explorer les {allProjects.length.toLocaleString('fr-FR')} projets</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Proximity Local Selector (Option 1: Clean, no duplicate search bar) */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-2xs mb-8 space-y-3">
          
          {/* Header with label & quick reset */}
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-brand-blue" />
              <span>Filtrer les chantiers de proximité par localité :</span>
            </span>

            {selectedProximityCity !== 'ALL' && (
              <button
                onClick={() => setSelectedProximityCity('ALL')}
                className="text-xs font-bold text-brand-blue hover:text-brand-blue-dark flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Toutes les localités</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Villes Fréquentes: Single fluid horizontal scrolling row on mobile/tablet, wrap on desktop */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none -mx-1 px-1">
            <button
              onClick={() => setSelectedProximityCity('ALL')}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedProximityCity === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm border border-slate-900'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60'
              }`}
            >
              Toutes les localités
            </button>

            {FREQUENT_CITIES.map((city) => {
              const isActive = selectedProximityCity === city;
              return (
                <button
                  key={city}
                  onClick={() => setSelectedProximityCity(city)}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-brand-blue text-white shadow-sm border border-brand-blue'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {city}
                </button>
              );
            })}
          </div>

          {/* Status Bar */}
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">
              {selectedProximityCity !== 'ALL' ? (
                <>
                  <span className="font-bold text-slate-900">{proximityFilteredProjects.length}</span> chantiers d'infrastructure affichés pour <span className="font-bold text-brand-blue">« {selectedProximityCity} »</span>
                </>
              ) : (
                <>
                  Panorama des chantiers concrets de voirie, santé, écoles et eau potable à travers la Côte d'Ivoire
                </>
              )}
            </span>

            {selectedProximityCity !== 'ALL' && (
              <button
                onClick={() => setSelectedProximityCity('ALL')}
                className="text-brand-blue hover:underline font-bold"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* 6 Grid Cards */}
        {proximityFilteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {proximityFilteredProjects.slice(0, 6).map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onSelect={onSelectProject}
                onSendProof={onOpenSendProof}
                onShare={onOpenShare}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
            <p className="text-slate-600 font-bold text-sm">
              Aucun chantier d'investissement trouvé pour « {selectedProximityCity} ».
            </p>
            <button
              onClick={() => setSelectedProximityCity('ALL')}
              className="px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Afficher toutes les localités
            </button>
          </div>
        )}

      </section>

      {/* MODAL: READ ARTICLE */}
      {readingArticle && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl p-6 sm:p-8 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-100 text-purple-800">
                  {readingArticle.category}
                </span>
                <span className="text-xs text-slate-400">{readingArticle.published_at}</span>
              </div>
              <button 
                onClick={() => setReadingArticle(null)} 
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {readingArticle.cover_image_url && (
              <div className="h-56 w-full rounded-2xl overflow-hidden shadow-xs">
                <img src={readingArticle.cover_image_url} alt={readingArticle.title} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="space-y-3">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                {readingArticle.title}
              </h3>
              
              <div className="p-4 bg-slate-50 rounded-2xl border-l-4 border-purple-600 text-xs sm:text-sm font-medium text-slate-700 italic leading-relaxed">
                {readingArticle.summary}
              </div>

              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line space-y-3 pt-2">
                {readingArticle.content}
              </div>

              {readingArticle.document_name && (
                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 flex items-center justify-between gap-3 mt-4">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-5 h-5 text-purple-700 flex-shrink-0" />
                    <div>
                      <span className="font-extrabold text-xs text-purple-900 block">{readingArticle.document_name}</span>
                      <span className="text-[10px] text-purple-700">Document officiel téléchargeable</span>
                    </div>
                  </div>
                  {readingArticle.document_url ? (
                    <a
                      href={readingArticle.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Télécharger</span>
                    </a>
                  ) : (
                    <span className="px-3 py-1.5 bg-white text-purple-800 border border-purple-200 rounded-xl text-xs font-bold">
                      Document public
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setReadingArticle(null)}
                className="px-5 py-2.5 bg-navy-900 text-white rounded-xl text-xs font-bold shadow"
              >
                Fermer la lecture
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
