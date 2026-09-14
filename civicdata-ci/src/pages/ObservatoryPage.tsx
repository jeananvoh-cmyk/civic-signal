import React, { useState, useEffect } from 'react';
import { CitizenProof, ProjectStatus, BudgetProject } from '../types';
import { dataStore } from '../services/dataStore';
import { formatFCFA, formatAmountInWords, formatDateFR, getStatusConfig } from '../utils/formatters';
import { BudgetReportsView } from '../components/BudgetReportsView';
import { STRATEGIC_PROJECTS_LIST, StrategicProject } from '../data/strategicProjectsData';
import { 
  Camera, 
  Video,
  MapPin, 
  ThumbsUp, 
  CheckCircle2, 
  Search, 
  FileText, 
  Info, 
  ArrowRight, 
  HardHat, 
  ExternalLink, 
  Landmark, 
  Building2, 
  Calendar, 
  Clock, 
  Filter, 
  Check, 
  ChevronRight,
  Eye
} from 'lucide-react';

interface ObservatoryPageProps {
  onOpenSendProof: (project?: BudgetProject) => void;
  onSelectProjectById: (projectId: string) => void;
}

export const ObservatoryPage: React.FC<ObservatoryPageProps> = ({
  onOpenSendProof,
  onSelectProjectById,
}) => {
  const [activeTab, setActiveTab] = useState<'gallery' | 'reports'>('gallery');
  
  // Selected Strategic Focus Project (defaults to Séguéla-Touba)
  const [selectedStrategicProjectId, setSelectedStrategicProjectId] = useState<string>('proj-infra-seguela-touba-104mrd');
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);

  // Strategic Gallery Filters
  const [strategicSectorFilter, setStrategicSectorFilter] = useState<string>('ALL');
  const [strategicStatusFilter, setStrategicStatusFilter] = useState<string>('ALL');
  const [strategicSearchQuery, setStrategicSearchQuery] = useState<string>('');

  // Local Communal Proofs Filters
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Confirmation count overrides for strategic projects
  const [strategicConfirmations, setStrategicConfirmations] = useState<Record<string, number>>({});
  
  const [approvedProofs, setApprovedProofs] = useState<CitizenProof[]>(() => dataStore.getApprovedProofs());

  useEffect(() => {
    return dataStore.subscribe(() => {
      setApprovedProofs(dataStore.getApprovedProofs());
    });
  }, []);

  const allProjects = dataStore.getProjects();

  // Active Project for Focus Showcase
  const activeStrategicProject: StrategicProject = 
    STRATEGIC_PROJECTS_LIST.find(p => p.id === selectedStrategicProjectId) || STRATEGIC_PROJECTS_LIST[0];

  const handleSelectStrategicProject = (projectId: string) => {
    setSelectedStrategicProjectId(projectId);
    setActivePhotoIndex(0);
    const element = document.getElementById('strategic-focus-showcase');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleConfirmStrategic = (projectId: string) => {
    if (dataStore.hasUserConfirmed(projectId)) return;
    dataStore.recordLocalConfirmation(projectId);
    setStrategicConfirmations(prev => ({
      ...prev,
      [projectId]: (prev[projectId] ?? (STRATEGIC_PROJECTS_LIST.find(p => p.id === projectId)?.confirmationsCount || 100)) + 1
    }));
  };

  // Filter Strategic Projects Gallery
  const filteredStrategicProjects = STRATEGIC_PROJECTS_LIST.filter(project => {
    const matchesSector = strategicSectorFilter === 'ALL' || project.sector === strategicSectorFilter;
    const matchesStatus = strategicStatusFilter === 'ALL' || project.status === strategicStatusFilter;
    const matchesSearch = !strategicSearchQuery || 
      project.title.toLowerCase().includes(strategicSearchQuery.toLowerCase()) ||
      project.subtitle.toLowerCase().includes(strategicSearchQuery.toLowerCase()) ||
      project.contractor.toLowerCase().includes(strategicSearchQuery.toLowerCase()) ||
      project.region.toLowerCase().includes(strategicSearchQuery.toLowerCase()) ||
      project.sector.toLowerCase().includes(strategicSearchQuery.toLowerCase());
    
    return matchesSector && matchesStatus && matchesSearch;
  });

  // Local / Communal proofs
  const localProofs = approvedProofs.filter(p => p.project_id !== 'proj-infra-seguela-touba-104mrd');
  const filteredLocalProofs = localProofs.filter((proof) => {
    const matchesSearch =
      !searchQuery ||
      (proof.project_title && proof.project_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (proof.commune_name && proof.commune_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      proof.comment.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatusFilter === 'ALL' || proof.citizen_status_claim === selectedStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleConfirm = (proofId: string) => {
    dataStore.confirmProof(proofId);
  };

  // Metrics for Budget Voté vs Avancement Constaté
  const totalVerifiedProofs = approvedProofs.length + STRATEGIC_PROJECTS_LIST.length;
  const inProgressCount = STRATEGIC_PROJECTS_LIST.filter(p => p.status === 'IN_PROGRESS').length + approvedProofs.filter(p => p.citizen_status_claim === 'IN_PROGRESS').length;
  const completedCount = STRATEGIC_PROJECTS_LIST.filter(p => p.status === 'COMPLETED').length + approvedProofs.filter(p => p.citizen_status_claim === 'COMPLETED').length;
  const notStartedProofs = approvedProofs.filter(p => p.citizen_status_claim === 'NOT_STARTED').length;

  // Candidate projects for discovery flow
  const candidateProjects = allProjects.slice(0, 3);

  // Sector Badge Formatter
  const getSectorBadgeStyle = (sector: string) => {
    switch (sector) {
      case 'Routes & Voiries':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Transport & Mobilité':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'Santé':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Éducation':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="relative">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-24 bg-[#FAFAFA]">
        
        {/* ========================================================================= */}
        {/* 1. CLEAN PAGE HEADER                                                     */}
        {/* ========================================================================= */}
        <div className="print:hidden flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                Contrôle Citoyen
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Loi de Finances 2026
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight font-sans">
              Observatoire Citoyen des Chantiers Publics
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Suivi photographique de terrain, veille contractuelle et vérification citoyenne indépendante des <strong>3 453,8 Milliards FCFA</strong> d'investissements de l'État et des collectivités locales.
            </p>
          </div>

          {/* Top Primary CTA */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              onClick={() => onOpenSendProof()}
              className="py-3 px-6 bg-brand-orange hover:bg-brand-orange-dark active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Déposer un Constat Terrain</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. SECTION TABS SWITCHER                                                 */}
        {/* ========================================================================= */}
        <div className="print:hidden flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 max-w-xl">
          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'gallery'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:bg-white/50'
            }`}
          >
            <Camera className="w-4 h-4 text-brand-orange" />
            <span>Galerie & Chantiers Stratégiques ({STRATEGIC_PROJECTS_LIST.length + approvedProofs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:bg-white/50'
            }`}
          >
            <FileText className="w-4 h-4 text-brand-blue" />
            <span>Bilans & Rapports d'Étape 2026</span>
          </button>
        </div>

        {/* TAB 1: REPORTS VIEW */}
        {activeTab === 'reports' ? (
          <BudgetReportsView />
        ) : (
          <>
            {/* ========================================================================= */}
            {/* 3. COMPARATIVE PROGRESS STATS                                            */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Budget Voté vs Avancement Constaté sur le Terrain
                  </h3>
                  <p className="text-xs text-slate-500">
                    Synthèse des observations vérifiées par la communauté citoyenne et les sentinelles régionales
                  </p>
                </div>

                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold self-start sm:self-auto border border-slate-200/70">
                  {totalVerifiedProofs} chantiers & constats répertoriés
                </span>
              </div>

              {/* 3 Metric Progress Boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Box 1: En chantier */}
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-amber-900 font-bold block">En chantier effectif</span>
                    <span className="text-2xl font-black text-slate-900 mt-0.5 block">{inProgressCount}</span>
                    <span className="text-[11px] text-slate-600">Travaux en cours constatés</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <span className="w-3.5 h-3.5 rounded-full bg-amber-500"></span>
                  </div>
                </div>

                {/* Box 2: Livré */}
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-emerald-900 font-bold block">Terminé & Livré</span>
                    <span className="text-2xl font-black text-slate-900 mt-0.5 block">{completedCount}</span>
                    <span className="text-[11px] text-slate-600">Ouvrages opérationnels</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500"></span>
                  </div>
                </div>

                {/* Box 3: Non démarré */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-700 font-bold block">En attente de démarrage</span>
                    <span className="text-2xl font-black text-slate-900 mt-0.5 block">{notStartedProofs}</span>
                    <span className="text-[11px] text-slate-600">Projets prévus au budget</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                    <span className="w-3.5 h-3.5 rounded-full bg-slate-400"></span>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 4. TIER 1: FOCUS SHOWCASE CHANTIER STRATÉGIQUE                            */}
            {/* ========================================================================= */}
            <div id="strategic-focus-showcase" className="scroll-mt-6 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all">
              
              {/* Clean Sober Header Banner */}
              <div className="bg-slate-50 border-b border-slate-200 px-5 sm:px-7 py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Grand Chantier de l'État • Fiche d'Enquête Approfondie
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 text-[10px] font-medium">
                      {activeStrategicProject.fundingSource}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-0.5">
                    {activeStrategicProject.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white border shadow-2xs ${
                    activeStrategicProject.status === 'COMPLETED' 
                      ? 'text-emerald-700 border-emerald-200' 
                      : 'text-amber-800 border-amber-200'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      activeStrategicProject.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}></span>
                    <span>{activeStrategicProject.statusLabel}</span>
                  </span>
                </div>
              </div>

              <div className="p-5 sm:p-6 space-y-6">
                {/* Top Grid: Photo Showcase (Left) & Key Technical Specs (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* LEFT: Photo Viewer with Multiple Angles & Testimonial */}
                  <div className="lg:col-span-6 flex flex-col justify-between space-y-3.5">
                    <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-2xs aspect-video sm:aspect-4/3 max-h-[340px] group">
                      <img
                        src={activeStrategicProject.photos[activePhotoIndex]?.url || activeStrategicProject.photos[0]?.url}
                        alt={activeStrategicProject.photos[activePhotoIndex]?.caption || activeStrategicProject.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />

                      {/* Top Left Badge: Certified Proof */}
                      <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-white/10">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Constat terrain vérifié</span>
                      </div>

                      {/* Top Right Badge: Location */}
                      <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-xs text-white px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 border border-white/10">
                        <MapPin className="w-3 h-3 text-slate-300" />
                        <span>{activeStrategicProject.region}</span>
                      </div>

                      {/* Bottom Overlay: Accreditation & Source */}
                      {activeStrategicProject.investigativeTestimony && (
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3.5 text-white">
                          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 text-xs">
                            <div>
                              <div className="text-[11px] text-slate-300">
                                Observation & suivi : <strong className="text-white">{activeStrategicProject.investigativeTestimony.author}</strong> ({activeStrategicProject.investigativeTestimony.role})
                              </div>
                            </div>

                            {activeStrategicProject.investigativeTestimony.sourceUrl && (
                              <a
                                href={activeStrategicProject.investigativeTestimony.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-slate-300 hover:text-white underline transition-colors self-start sm:self-auto"
                              >
                                <span>{activeStrategicProject.investigativeTestimony.sourceLabel || 'Source vérifiée'}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Photo Switcher Controls (if multiple photos) */}
                    {activeStrategicProject.photos.length > 1 && (
                      <div className="grid grid-cols-2 gap-2">
                        {activeStrategicProject.photos.map((photo, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActivePhotoIndex(idx)}
                            className={`p-2 rounded-xl text-left border transition-all flex items-center gap-2 cursor-pointer ${
                              activePhotoIndex === idx
                                ? 'bg-white border-brand-blue ring-2 ring-brand-blue/20 shadow-2xs'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <img
                              src={photo.url}
                              alt={photo.caption}
                              className="w-11 h-9 rounded-md object-cover flex-shrink-0 border border-slate-200"
                            />
                            <div className="min-w-0">
                              <div className="text-[11px] font-bold text-slate-900 truncate">
                                Vue #{idx + 1}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate">
                                {photo.caption}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Investigative Citizen Testimony Box */}
                    {activeStrategicProject.investigativeTestimony && (
                      <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-1.5">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Témoignage d'investigation sur le terrain
                        </div>
                        <p className="text-xs text-slate-700 italic leading-relaxed">
                          « {activeStrategicProject.investigativeTestimony.quote} »
                        </p>
                        <div className="text-[11px] font-medium text-slate-500 text-right">
                          — <strong>{activeStrategicProject.investigativeTestimony.author}</strong>, {activeStrategicProject.investigativeTestimony.role}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RIGHT: Official Specifications Grid & Dual Progress Gauge */}
                  <div className="lg:col-span-6 flex flex-col justify-between space-y-3.5">
                    
                    {/* Project Full Title & Subtitle */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getSectorBadgeStyle(activeStrategicProject.sector)}`}>
                          {activeStrategicProject.sector}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {activeStrategicProject.region}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                        {activeStrategicProject.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {activeStrategicProject.subtitle}
                      </p>
                    </div>

                    {/* Contractual Timeline & Dual Delays Gauge */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-600" />
                          <span className="text-xs font-bold text-slate-900">
                            Avancement Physique vs Délai Contractuel
                          </span>
                        </div>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white text-slate-600 border border-slate-200">
                          Démarré en {activeStrategicProject.startDate}
                        </span>
                      </div>

                      {/* Dual Comparative Progress Bars */}
                      <div className="space-y-2.5 pt-0.5">
                        <div>
                          <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                            <span>Avancement physique constaté</span>
                            <span className="font-bold text-slate-900">
                              {activeStrategicProject.physicalProgressPercent}% {activeStrategicProject.physicalProgressPercent >= 100 ? '(Livré)' : '(En cours)'}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                activeStrategicProject.physicalProgressPercent >= 100 ? 'bg-emerald-600' : 'bg-brand-blue'
                              }`} 
                              style={{ width: `${Math.min(100, activeStrategicProject.physicalProgressPercent)}%` }}
                            ></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                            <span>Délai contractuel consommé</span>
                            <span className="font-bold text-slate-900">
                              {activeStrategicProject.contractualElapsedPercent}% ({activeStrategicProject.contractualDurationMonths} mois prévus)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-slate-400 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${Math.min(100, activeStrategicProject.contractualElapsedPercent)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Calendar Dates Micro-Grid */}
                      <div className="grid grid-cols-3 gap-2 pt-0.5 text-center text-xs">
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <div className="text-[10px] text-slate-500">Démarrage</div>
                          <div className="font-bold text-slate-800 mt-0.5">{activeStrategicProject.startDate}</div>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <div className="text-[10px] text-slate-500">Délai initial</div>
                          <div className="font-bold text-slate-800 mt-0.5">{activeStrategicProject.contractualDurationMonths} mois</div>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <div className="text-[10px] text-slate-500">Échéance prévue</div>
                          <div className="font-bold text-slate-800 mt-0.5">{activeStrategicProject.estimatedCompletionDate}</div>
                        </div>
                      </div>
                    </div>

                    {/* 4 Pillars Official Canevas Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      
                      {/* Pillar 1: Montant & Financement */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                          Montant & Financement
                        </span>
                        <div className="text-sm font-bold text-slate-900">
                          {activeStrategicProject.budgetFormatted}
                        </div>
                        <div className="text-[11px] text-slate-600 truncate" title={activeStrategicProject.fundingSource}>
                          {activeStrategicProject.fundingSource}
                        </div>
                      </div>

                      {/* Pillar 2: Maîtrise d'Ouvrage */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                          Maîtrise d'Ouvrage
                        </span>
                        <div className="text-xs font-bold text-slate-900 truncate" title={activeStrategicProject.supervisingEntity}>
                          {activeStrategicProject.supervisingEntity}
                        </div>
                        <div className="text-[11px] text-slate-600">
                          Déléguée : <strong className="text-slate-800">{activeStrategicProject.delegatedAuthority}</strong>
                        </div>
                      </div>

                      {/* Pillar 3: Entreprise BTP & Contrôle */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                          Entreprise BTP Adjudicataire
                        </span>
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {activeStrategicProject.contractor}
                        </div>
                        <div className="text-[11px] text-slate-600 truncate">
                          Contrôle : <strong className="text-slate-800">{activeStrategicProject.auditOffice}</strong>
                        </div>
                      </div>

                      {/* Pillar 4: Impact & Envergure */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                          Impact & Envergure
                        </span>
                        <div className="text-xs font-bold text-slate-900 line-clamp-1" title={activeStrategicProject.keyImpact}>
                          {activeStrategicProject.keyImpact}
                        </div>
                        <div className="text-[11px] text-slate-600">
                          Suivi citoyen vérifié
                        </div>
                      </div>

                    </div>

                    {/* Action CTAs */}
                    <div className="pt-1 flex flex-col sm:flex-row items-center gap-2.5">
                      {activeStrategicProject.budgetProjectId && (
                        <button
                          type="button"
                          onClick={() => onSelectProjectById(activeStrategicProject.budgetProjectId!)}
                          className="w-full sm:flex-1 py-2.5 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-300" />
                          <span>Fiche budgétaire</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          const matchingProject: BudgetProject = allProjects.find(p => p.id === activeStrategicProject.budgetProjectId) || {
                            id: activeStrategicProject.budgetProjectId || activeStrategicProject.id,
                            commune_name: 'Séguéla & Touba',
                            region_name: activeStrategicProject.region,
                            category: activeStrategicProject.sector,
                            nature_expense: 'Investissements',
                            title: activeStrategicProject.title,
                            budget_amount_fcfa: activeStrategicProject.budgetFCFA,
                            fiscal_year: 2026,
                            current_status: activeStrategicProject.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
                            progress_percentage: Math.round(activeStrategicProject.physicalProgressPercent),
                            contractor_name: activeStrategicProject.contractor,
                            locality_village_neighborhood: 'Axe Séguéla - Sifié - Touba',
                            created_at: new Date().toISOString(),
                            source: 'Ministère de l’Équipement et de l’Entretien Routier / AGEROUTE',
                          };
                          onOpenSendProof(matchingProject);
                        }}
                        className="w-full sm:flex-1 py-2.5 px-3.5 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Ajouter un constat</span>
                      </button>

                      <button
                        type="button"
                        disabled={dataStore.hasUserConfirmed(activeStrategicProject.id)}
                        onClick={() => handleConfirmStrategic(activeStrategicProject.id)}
                        className={`w-full sm:w-auto py-2.5 px-3.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-2xs ${
                          dataStore.hasUserConfirmed(activeStrategicProject.id)
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 cursor-default'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 cursor-pointer'
                        }`}
                        title={dataStore.hasUserConfirmed(activeStrategicProject.id) ? "Vous avez déjà confirmé ce chantier depuis ce navigateur" : "Confirmer cette observation citoyenne"}
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${dataStore.hasUserConfirmed(activeStrategicProject.id) ? 'text-emerald-600 fill-emerald-600/20' : 'text-slate-500'}`} />
                        <span>
                          {dataStore.hasUserConfirmed(activeStrategicProject.id) ? '✓ Confirmé' : 'Confirmer'} ({strategicConfirmations[activeStrategicProject.id] ?? activeStrategicProject.confirmationsCount})
                        </span>
                      </button>
                    </div>

                  </div>

                </div>
              </div>

            </div>

            {/* ========================================================================= */}
            {/* 5. TIER 2: MULTI-PROJECT STRATEGIC GALLERY                                */}
            {/* ========================================================================= */}
            {filteredStrategicProjects.length > 1 && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Grands Chantiers Publics sous Veille Stratégique
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Portfolio des investissements structurants suivis en continu à travers les 31 régions de Côte d'Ivoire.
                  </p>
                </div>

                <span className="text-xs text-slate-600 font-bold bg-slate-100 px-3 py-1 rounded-full border border-slate-200 self-start sm:self-auto">
                  {filteredStrategicProjects.length} chantiers nationaux
                </span>
              </div>

              {/* Gallery Filter Bar */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                
                {/* Sector & Status Filter Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                    Secteurs :
                  </span>

                  {[
                    { id: 'ALL', label: 'Tous' },
                    { id: 'Routes & Voiries', label: 'Routes & Voiries' },
                    { id: 'Transport & Mobilité', label: 'Transport' },
                    { id: 'Santé', label: 'Santé' },
                    { id: 'Éducation', label: 'Éducation' },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setStrategicSectorFilter(filter.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        strategicSectorFilter === filter.id
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}

                  <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block"></div>

                  {/* Status toggle */}
                  {[
                    { id: 'ALL', label: 'Tous états' },
                    { id: 'IN_PROGRESS', label: 'En cours' },
                    { id: 'COMPLETED', label: 'Livrés' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setStrategicStatusFilter(st.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                        strategicStatusFilter === st.id
                          ? 'bg-brand-blue text-white shadow-xs font-bold'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                {/* Search in strategic projects */}
                <div className="w-full lg:w-64 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrer un grand chantier..."
                    value={strategicSearchQuery}
                    onChange={(e) => setStrategicSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-brand-blue"
                  />
                </div>

              </div>

              {/* 3-Column Responsive Grid of Standardized Strategic Project Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredStrategicProjects.map((project) => {
                  const isSelected = project.id === selectedStrategicProjectId;

                  return (
                    <div
                      key={project.id}
                      className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between group ${
                        isSelected 
                          ? 'border-brand-blue ring-2 ring-brand-blue/25 shadow-md' 
                          : 'border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <div>
                        {/* Thumbnail Image */}
                        <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                          <img
                            src={project.photos[0]?.url}
                            alt={project.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />

                          {/* Sector Badge */}
                          <div className="absolute top-3 left-3">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shadow-2xs backdrop-blur-xs ${getSectorBadgeStyle(project.sector)} bg-white/95`}>
                              {project.sector}
                            </span>
                          </div>

                          {/* Status Badge */}
                          <div className="absolute top-3 right-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-2xs bg-white/95 border ${
                              project.status === 'COMPLETED' ? 'text-emerald-800 border-emerald-200' : 'text-amber-800 border-amber-200'
                            }`}>
                              <span className={`w-2 h-2 rounded-full ${project.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                              <span>{project.status === 'COMPLETED' ? 'Livré 100%' : `${project.physicalProgressPercent}%`}</span>
                            </span>
                          </div>

                          {/* Region overlay */}
                          <div className="absolute bottom-2.5 left-3 bg-slate-900/80 backdrop-blur-xs text-white px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-300" />
                            <span>{project.region}</span>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-4 space-y-3">
                          <div>
                            <h4 
                              onClick={() => handleSelectStrategicProject(project.id)}
                              className="font-bold text-sm text-slate-900 line-clamp-2 hover:text-brand-blue cursor-pointer transition-colors leading-snug"
                              title="Afficher la fiche détaillée dans le focus"
                            >
                              {project.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                              {project.subtitle}
                            </p>
                          </div>

                          {/* Dual Progress Gauge (Physical vs Contractual) */}
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                            <div>
                              <div className="flex justify-between text-[10.5px] text-slate-600 mb-0.5">
                                <span>Avancement physique</span>
                                <span className="font-bold text-slate-900">{project.physicalProgressPercent}%</span>
                              </div>
                              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${project.physicalProgressPercent >= 100 ? 'bg-emerald-600' : 'bg-brand-blue'}`}
                                  style={{ width: `${Math.min(100, project.physicalProgressPercent)}%` }}
                                ></div>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-[10.5px] text-slate-600 mb-0.5">
                                <span>Délai écoulé</span>
                                <span className="font-bold text-slate-700">{project.contractualElapsedPercent}%</span>
                              </div>
                              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-slate-400 h-full rounded-full"
                                  style={{ width: `${Math.min(100, project.contractualElapsedPercent)}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>

                          {/* Meta line: Budget & Contractor */}
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Budget alloué</span>
                              <span className="font-bold text-slate-900">{project.budgetFormatted}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Entreprise BTP</span>
                              <span className="font-semibold text-slate-700 truncate max-w-[130px] block" title={project.contractor}>
                                {project.contractor}
                              </span>
                            </div>
                          </div>

                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="p-3 bg-slate-50/90 border-t border-slate-100 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectStrategicProject(project.id)}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-brand-blue text-white shadow-2xs'
                              : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isSelected ? 'Fiche active' : 'Examiner ce chantier'}</span>
                        </button>

                        {project.budgetProjectId && (
                          <button
                            type="button"
                            onClick={() => onSelectProjectById(project.budgetProjectId!)}
                            className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-colors cursor-pointer"
                            title="Consulter la fiche budgétaire"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
            )}

            {/* ========================================================================= */}
            {/* 6. TIER 3: VEILLE CITOYENNE DE PROXIMITÉ (Chantiers Communaux & Locaux)   */}
            {/* ========================================================================= */}
            <div className="pt-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Veille Citoyenne de Proximité • Chantiers Communaux & Régionaux
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Constats photographiques des sentinelles citoyennes dans les collectivités territoriales (Poro, Gbêkê, etc.).
                  </p>
                </div>

                <span className="text-xs text-slate-600 font-bold bg-slate-100 px-3 py-1 rounded-full border border-slate-200 self-start sm:self-auto">
                  {filteredLocalProofs.length} constat{filteredLocalProofs.length > 1 ? 's' : ''} communal{filteredLocalProofs.length > 1 ? 'aux' : ''}
                </span>
              </div>

              {/* Sober Notice Démonstrative locale (Zero emojis) */}
              {localProofs.some(p => p.is_demo) && (
                <div className="bg-slate-50 border border-slate-200 border-l-4 border-l-slate-400 rounded-2xl p-4 shadow-2xs">
                  <div className="space-y-0.5 text-xs">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span>Exemples Illustratifs • Projets Communaux & Quartiers</span>
                      <span className="text-[10px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full font-bold">Modèles Démonstratifs</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11.5px]">
                      Ces fiches locales illustrent concrètement comment les constats photographiques permettent de vérifier l'avancement des chantiers municipaux. Dès la validation des signalements transmis par les citoyens de votre commune, cet espace basculera automatiquement sur les preuves de terrain de votre localité.
                    </p>
                  </div>
                </div>
              )}

              {/* Status & Search Filter Bar for Local Proofs */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                
                {/* Status Pills */}
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setSelectedStatusFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedStatusFilter === 'ALL'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Toutes ({approvedProofs.length})
                  </button>

                  <button
                    onClick={() => setSelectedStatusFilter('IN_PROGRESS')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedStatusFilter === 'IN_PROGRESS'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>En chantier ({approvedProofs.filter(p => p.citizen_status_claim === 'IN_PROGRESS').length})</span>
                  </button>

                  <button
                    onClick={() => setSelectedStatusFilter('COMPLETED')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedStatusFilter === 'COMPLETED'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Livré ({approvedProofs.filter(p => p.citizen_status_claim === 'COMPLETED').length})</span>
                  </button>

                  <button
                    onClick={() => setSelectedStatusFilter('NOT_STARTED')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedStatusFilter === 'NOT_STARTED'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span>Non démarré ({notStartedProofs})</span>
                  </button>
                </div>

                {/* Search */}
                <div className="w-full sm:w-64 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrer par commune, titre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-brand-blue"
                  />
                </div>

              </div>

              {/* Local Feed: Media Cards Grid */}
              {filteredLocalProofs.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-6">
                  <div className="max-w-md mx-auto space-y-2">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center border border-amber-200">
                      <Search className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Aucun constat local ne correspond à cette recherche
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Soyez la première sentinelle citoyenne à documenter un chantier communal dans cette zone.
                    </p>
                  </div>

                  {/* Candidate projects waiting for inspection */}
                  <div className="max-w-3xl mx-auto text-left pt-2 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                      Chantiers prioritaires à vérifier près de chez vous :
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {candidateProjects.map((p) => (
                        <div key={p.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-brand-orange uppercase">{p.commune_name}</span>
                            <h5 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">{p.title}</h5>
                            <div className="text-[11px] font-black text-slate-700">{formatFCFA(p.budget_amount_fcfa)}</div>
                          </div>
                          <button
                            onClick={() => onOpenSendProof(p)}
                            className="mt-3 w-full py-1.5 bg-white hover:bg-brand-blue hover:text-white text-slate-800 text-xs font-bold rounded-lg border border-slate-300 transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Déposer le 1er constat</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredLocalProofs.map((proof) => {
                    const project = allProjects.find(p => p.id === proof.project_id);
                    const status = getStatusConfig(proof.citizen_status_claim);

                    return (
                      <div 
                        key={proof.id}
                        className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-brand-blue/40 transition-all duration-200 overflow-hidden flex flex-col justify-between group"
                      >
                        <div>
                          
                          {/* Media Container */}
                          <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-900">
                            {proof.media_type === 'VIDEO' && proof.video_url ? (
                              <video
                                src={proof.video_url}
                                controls
                                className="w-full h-full object-cover bg-black"
                              />
                            ) : (
                              <img
                                src={proof.photo_url || proof.image_url}
                                alt={proof.project_title || "Preuve citoyenne"}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80';
                                }}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            )}
                            
                            {/* Floating Status Pill */}
                            <div className="absolute top-3 right-3 pointer-events-none">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-md bg-white/95 border ${status.badgeClass}`}>
                                <span className={`w-2 h-2 rounded-full ${status.dotClass}`}></span>
                                <span>{status.label}</span>
                              </span>
                            </div>

                            {/* Demonstration Pill if is_demo */}
                            {proof.is_demo && (
                              <div className="absolute top-3 left-3 pointer-events-none bg-slate-900/80 backdrop-blur-xs text-amber-300 border border-amber-400/40 px-2.5 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
                                <span>Exemple Illustratif</span>
                              </div>
                            )}

                            {/* Media Type Badge */}
                            {!proof.is_demo && (
                              <div className="absolute top-3 left-3 pointer-events-none bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
                                {proof.media_type === 'VIDEO' ? <Video className="w-3 h-3 text-sky-400" /> : <Camera className="w-3 h-3 text-orange-400" />}
                                <span>{proof.media_type === 'VIDEO' ? 'Vidéo' : 'Photo HD'}</span>
                              </div>
                            )}

                            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white px-2.5 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 pointer-events-none">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Observation vérifiée</span>
                            </div>
                          </div>

                          {/* Body Content */}
                          <div className="p-5 space-y-3">
                            
                            {/* Title & Location */}
                            <div>
                              <h4 
                                onClick={() => proof.project_id && onSelectProjectById(proof.project_id)}
                                className="font-black text-base text-slate-900 line-clamp-2 hover:text-brand-blue cursor-pointer transition-colors leading-snug"
                                title="Voir la fiche détaillée du projet"
                              >
                                {proof.project_title || "Chantier public"}
                              </h4>

                              <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                <MapPin className="w-3.5 h-3.5 text-brand-orange flex-shrink-0" />
                                <span className="font-bold text-slate-700">{proof.commune_name}</span>
                                <span>•</span>
                                <span>{formatDateFR(proof.created_at)}</span>
                              </div>
                            </div>

                            {/* Citizen Observation */}
                            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed italic">
                              "{proof.comment}"
                            </p>

                            {/* Project Budget Context */}
                            {project && (
                              <div className="text-[11px] flex justify-between items-center text-slate-500 pt-1 border-t border-slate-100">
                                <span>Budget alloué :</span>
                                <span className="font-black text-slate-900">{formatFCFA(project.budget_amount_fcfa)} <span className="text-brand-blue font-bold">({formatAmountInWords(project.budget_amount_fcfa)})</span></span>
                              </div>
                            )}

                          </div>

                        </div>

                        {/* Card Footer: Confirmation Counter */}
                        <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                          <div className="text-xs text-slate-600 font-semibold">
                            <span>Par <strong>{proof.user_name}</strong></span>
                          </div>

                          {(() => {
                            const isProofConfirmed = dataStore.hasUserConfirmed(proof.id);
                            return (
                              <button
                                disabled={isProofConfirmed}
                                onClick={() => handleConfirm(proof.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-xs transition-all ${
                                  isProofConfirmed
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 cursor-default'
                                    : 'bg-white hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-200 cursor-pointer'
                                }`}
                                title={isProofConfirmed ? "Vous avez déjà confirmé cette observation depuis ce navigateur" : "Confirmer cette observation citoyenne"}
                              >
                                <ThumbsUp className={`w-3.5 h-3.5 ${isProofConfirmed ? 'text-emerald-600 fill-emerald-600/20' : 'text-emerald-600'}`} />
                                <span>{isProofConfirmed ? '✓ Confirmé' : 'Confirmer'} ({proof.confirmations_count})</span>
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
};
