import React, { useState, useEffect } from 'react';
import { Institution, BudgetProject, BudgetLineItem } from '../types';
import { formatFCFA, formatAmountInWords } from '../utils/formatters';
import { 
  X, 
  Globe, 
  ExternalLink, 
  MapPin, 
  Phone, 
  Mail, 
  Building2, 
  TrendingUp, 
  FileText, 
  ArrowRight, 
  ShieldCheck, 
  User, 
  CheckCircle2, 
  Share2, 
  Layers, 
  AlertCircle,
  Search,
  Filter,
  GraduationCap,
  Briefcase,
  Award,
  Sparkles,
  FolderOpen,
  Info
} from 'lucide-react';
import { OfficialDocRequestModal } from './OfficialDocRequestModal';
import { findCaidpRI } from '../data/caidpRiData';
import { dataStore } from '../services/dataStore';
import { isSafeUrl } from '../utils/security';

interface InstitutionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  institution: Institution | null;
  allProjects: BudgetProject[];
  onNavigateToProjects: (query: string) => void;
}

const ModalLeaderAvatar: React.FC<{
  photoUrl?: string;
  name: string;
  isPresidence?: boolean;
}> = ({ photoUrl, name, isPresidence }) => {
  const [hasError, setHasError] = useState(false);

  const effectivePhotoUrl = isPresidence && (!photoUrl || photoUrl.includes('contacts/177210730046'))
    ? '/images/presidence_alassane_ouattara.png'
    : photoUrl;

  const initials = name
    .replace(/^(M\.|Mme|Dr|S\.E\.M\.|Nanan)\s+/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase() || 'CI';

  if (!effectivePhotoUrl || hasError) {
    if (isPresidence) {
      return (
        <div className="relative group flex-shrink-0">
          <img
            src="https://www.gouv.ci/uploads/institutions/175277585572.png"
            alt={name}
            className="w-16 h-16 sm:w-20 sm:h-20 ring-2 ring-amber-400 border-2 border-amber-300 rounded-2xl object-cover object-top shadow-md bg-white"
          />
          <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-0.5 rounded-full shadow-xs" title="Chef de l'État">
            <ShieldCheck className="w-3 h-3" />
          </div>
        </div>
      );
    }
    return (
      <div className="relative group flex-shrink-0">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-100 border-2 border-white ring-2 ring-slate-200 flex items-center justify-center font-black text-slate-700 text-sm shadow-md">
          {initials}
        </div>
        <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-0.5 rounded-full shadow-xs" title="En fonction officielle">
          <ShieldCheck className="w-3 h-3" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative group flex-shrink-0">
      <img
        src={effectivePhotoUrl}
        alt={name}
        onError={() => setHasError(true)}
        className={`${isPresidence ? 'w-16 h-16 sm:w-20 sm:h-20 ring-2 ring-amber-400 border-2 border-amber-300' : 'w-14 h-14 sm:w-16 sm:h-16 border-2 border-white ring-2 ring-slate-100'} rounded-2xl object-cover object-top shadow-md bg-white`}
      />
      <div className={`absolute -bottom-1 -right-1 ${isPresidence ? 'bg-amber-500 text-slate-950' : 'bg-emerald-600 text-white'} p-0.5 rounded-full shadow-xs`} title="En fonction officielle">
        <ShieldCheck className="w-3 h-3" />
      </div>
    </div>
  );
};

export const InstitutionDetailModal: React.FC<InstitutionDetailModalProps> = ({
  isOpen,
  onClose,
  institution,
  allProjects,
  onNavigateToProjects,
}) => {
  // 3 Primary Consolidate Tabs
  const [activeTab, setActiveTab] = useState<'PROJECTS' | 'FINANCES' | 'LEADER_MISSIONS'>('PROJECTS');
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [selectedProjectForDoc, setSelectedProjectForDoc] = useState<BudgetProject | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Filters for Budget Lines
  const [lineSearch, setLineSearch] = useState('');
  const [selectedNature, setSelectedNature] = useState('ALL');

  // Filters for Citizen Projects
  const [projectSearch, setProjectSearch] = useState('');
  const [selectedProjectCategory, setSelectedProjectCategory] = useState('ALL');

  // Dynamic async budget lines loader (Lazy bundle splitting to save 31MB initial download)
  const [entityBudgetLines, setEntityBudgetLines] = useState<BudgetLineItem[]>([]);
  const [isLoadingLines, setIsLoadingLines] = useState(false);

  useEffect(() => {
    if (!isOpen || !institution) {
      setEntityBudgetLines([]);
      return;
    }
    let isMounted = true;
    setIsLoadingLines(true);
    import('../data/budgetLinesData')
      .then(({ getBudgetLinesForEntity }) => {
        if (isMounted) {
          const lines = getBudgetLinesForEntity(
            institution.name, 
            institution.type, 
            institution.leader_title || institution.leader_name
          );
          setEntityBudgetLines(lines);
          setIsLoadingLines(false);
        }
      })
      .catch((err) => {
        console.warn("Erreur chargement dynamique des lignes budgétaires:", err);
        if (isMounted) setIsLoadingLines(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, institution?.id, institution?.name, institution?.type, institution?.leader_title, institution?.leader_name]);

  if (!isOpen || !institution) return null;

  // Extract unique natures
  const uniqueNatures = Array.from(new Set(
    entityBudgetLines.map(l => l.nature).filter(Boolean)
  )) as string[];

  // Filter lines
  const filteredLines = entityBudgetLines.filter(l => {
    const matchesSearch = !lineSearch.trim() || 
      l.libelle.toLowerCase().includes(lineSearch.toLowerCase().trim()) ||
      (l.sous_categorie_3 && l.sous_categorie_3.toLowerCase().includes(lineSearch.toLowerCase().trim()));

    const matchesNature = selectedNature === 'ALL' || l.nature === selectedNature;

    return matchesSearch && matchesNature;
  });

  const totalLinesAmount = entityBudgetLines.reduce((sum, l) => sum + (l.montant_fcfa || 0), 0);

  // Budget ratios (Safe zero & exact proportion handling)
  const functioningBudget = institution.budget_functioning_fcfa || 0;
  const investmentBudget = institution.budget_investment_fcfa || 0;
  const totalBudget = institution.total_budget_fcfa || (functioningBudget + investmentBudget) || 0;

  let functioningPct = 0;
  let investmentPct = 0;

  if (totalBudget > 0) {
    if (investmentBudget === 0 && functioningBudget > 0) {
      functioningPct = 100;
      investmentPct = 0;
    } else if (functioningBudget === 0 && investmentBudget > 0) {
      functioningPct = 0;
      investmentPct = 100;
    } else {
      functioningPct = Math.round((functioningBudget / totalBudget) * 100);
      investmentPct = 100 - functioningPct;
    }
  }

  // Resolve CAIDP Information Officer accurately from registry
  const caidpMatch = dataStore.findCaidpEntity(institution.name) || findCaidpRI(institution.name);
  const riName = (caidpMatch?.ri_name && caidpMatch.ri_name !== 'Non désigné') 
    ? caidpMatch.ri_name 
    : (institution.info_officer_name || '');
  const riFunction = caidpMatch?.ri_function || institution.info_officer_title || "Service d'Accès aux Documents Publics (Loi n°2013-867)";
  const riEmail = (caidpMatch?.email && caidpMatch.email !== "Pas d'email" && caidpMatch.email !== "") 
    ? caidpMatch.email 
    : (institution.info_officer_email && institution.info_officer_email !== "Pas d'email" ? institution.info_officer_email : "");
  const riPhone = (caidpMatch?.phone && caidpMatch.phone !== "Pas de numéro" && caidpMatch.phone !== "") 
    ? caidpMatch.phone 
    : (institution.info_officer_phone && institution.info_officer_phone !== "Pas de numéro" ? institution.info_officer_phone : "");

  // Clean entity name for project matching
  const cleanName = institution.name
    .replace(/^Mairie de\s+/i, '')
    .replace(/^Conseil Régional du\s+/i, '')
    .replace(/^Conseil Régional de la\s+/i, '')
    .replace(/^Conseil Régional de l['’]/i, '')
    .replace(/^Conseil Régional des\s+/i, '')
    .replace(/^Conseil Régional d['’]/i, '')
    .replace(/^Ministère d'État,\s*/i, '')
    .replace(/^Ministère de l['’]/i, '')
    .replace(/^Ministère de la\s+/i, '')
    .replace(/^Ministère des\s+/i, '')
    .replace(/^Ministère du\s+/i, '')
    .replace(/^Ministère Délégué chargé de l['’]/i, '')
    .replace(/^Ministère Délégué chargé de la\s+/i, '')
    .replace(/^Ministère Délégué chargé des\s+/i, '')
    .replace(/^Ministère Délégué chargé du\s+/i, '')
    .trim();

  // Smart matching for ministries and local authorities
  const relatedProjects = allProjects.filter(p => {
    if (institution.type === 'MAIRIE') {
      return p.commune_name.toLowerCase().includes(cleanName.toLowerCase()) ||
             p.title.toLowerCase().includes(cleanName.toLowerCase());
    }
    if (institution.type === 'REGION' || institution.type === 'DISTRICT') {
      return p.region_name.toLowerCase().includes(institution.region.toLowerCase()) ||
             (institution.district && p.district_name && p.district_name.toLowerCase().includes(institution.district.toLowerCase())) ||
             p.title.toLowerCase().includes(cleanName.toLowerCase());
    }

    const instName = institution.name.toLowerCase();
    const instTitle = (institution.leader_title || '').toLowerCase();
    const pMin = (p.ministry_name || '').toLowerCase();
    const pServ = (p.service_name || '').toLowerCase();
    const pInst = (p.institution_name || '').toLowerCase();
    const pTitle = p.title.toLowerCase();

    if (pMin && (pMin.includes(cleanName.toLowerCase()) || instName.includes(pMin))) return true;
    if (pServ && (pServ.includes(cleanName.toLowerCase()) || instName.includes(pServ))) return true;
    if (pInst && (pInst.includes(cleanName.toLowerCase()) || instName.includes(pInst))) return true;

    if (instName.includes('santé') || instTitle.includes('santé')) {
      return p.category === 'SANTE' || pTitle.includes('santé') || pTitle.includes('chu') || pTitle.includes('chr') || pTitle.includes('hôpital') || pTitle.includes('dispensaire') || pTitle.includes('médic') || pTitle.includes('cmu');
    }
    if (instName.includes('éducation') || instName.includes('enseignement') || instTitle.includes('éducation')) {
      return p.category === 'EDUCATION' || pTitle.includes('école') || pTitle.includes('collège') || pTitle.includes('lycée') || pTitle.includes('classe') || pTitle.includes('formation professionnelle');
    }
    if (instName.includes('hydraulique') || instName.includes('assainissement') || instName.includes('salubrité')) {
      return p.category === 'EAU' || p.category === 'ASSAINISSEMENT' || pTitle.includes('eau') || pTitle.includes('forage') || pTitle.includes('château') || pTitle.includes('adduction') || pTitle.includes('drainage') || pTitle.includes('canivaux');
    }
    if (instName.includes('infrastructure') || instName.includes('équipement') || instName.includes('routier')) {
      return p.category === 'INFRASTRUCTURE' || p.category === 'TRANSPORT' || pTitle.includes('route') || pTitle.includes('pont') || pTitle.includes('bitumage') || pTitle.includes('voirie') || pTitle.includes('échangeur') || pTitle.includes('autoroute');
    }
    if (instName.includes('transport') || instTitle.includes('transport')) {
      return p.category === 'TRANSPORT' || pTitle.includes('sotra') || pTitle.includes('gare') || pTitle.includes('port') || pTitle.includes('aéroport') || pTitle.includes('métro') || pTitle.includes('brt');
    }
    if (instName.includes('énergie') || instName.includes('mines') || instName.includes('pétrole')) {
      return p.category === 'ENERGIE' || pTitle.includes('électrif') || pTitle.includes('solaire') || pTitle.includes('centrale') || pTitle.includes('lumière') || pTitle.includes('baleine');
    }
    if (instName.includes('agriculture') || instName.includes('vivrier') || instName.includes('rural')) {
      return p.category === 'AGRICULTURE' || pTitle.includes('agricol') || pTitle.includes('riz') || pTitle.includes('vivrier') || pTitle.includes('plantation') || pTitle.includes('barrage hydro');
    }
    if (instName.includes('urbanisme') || instName.includes('logement') || instName.includes('cadre de vie') || instName.includes('construction')) {
      return pTitle.includes('logement') || pTitle.includes('habitat') || pTitle.includes('urbanisme') || pTitle.includes('cité') || pTitle.includes('foncier');
    }
    if (instName.includes('jeunesse') || instName.includes('insertion') || instName.includes('service civique')) {
      return pTitle.includes('jeun') || pTitle.includes('emploi') || pTitle.includes('insertion') || pTitle.includes('service civique') || pTitle.includes('apprentissage');
    }
    if (instName.includes('sécurité') || instName.includes('intérieur')) {
      return p.category === 'SECURITE' || pTitle.includes('police') || pTitle.includes('commissariat') || pTitle.includes('gendarmerie') || pTitle.includes('pompier') || pTitle.includes('sécurité');
    }
    if (instName.includes('défense')) {
      return p.category === 'SECURITE' || pTitle.includes('militaire') || pTitle.includes('caserne') || pTitle.includes('armé') || pTitle.includes('défense');
    }
    if (instName.includes('justice')) {
      return pTitle.includes('justice') || pTitle.includes('tribunal') || pTitle.includes('prison') || pTitle.includes('pénitentiaire') || pTitle.includes('palais de justice');
    }
    if (instName.includes('sport')) {
      return p.category === 'SPORT' || pTitle.includes('stade') || pTitle.includes('agora') || pTitle.includes('sport') || pTitle.includes('olympique');
    }
    if (instName.includes('culture') || instName.includes('tourisme')) {
      return p.category === 'CULTURE' || pTitle.includes('culture') || pTitle.includes('musée') || pTitle.includes('touris') || pTitle.includes('patrimoine') || pTitle.includes('hôtel');
    }
    if (instName.includes('environnement') || instName.includes('transition écologique') || instName.includes('eaux et forêts')) {
      return p.category === 'ENVIRONNEMENT' || pTitle.includes('forêt') || pTitle.includes('climat') || pTitle.includes('côtière') || pTitle.includes('parc') || pTitle.includes('reboisement');
    }
    if (instName.includes('numérique') || instName.includes('digitalisation')) {
      return pTitle.includes('numérique') || pTitle.includes('fibre') || pTitle.includes('data center') || pTitle.includes('digital') || pTitle.includes('informatique');
    }
    if (instName.includes('solidarité') || instName.includes('pauvreté') || instName.includes('cohésion')) {
      return p.category === 'SOCIAL' || pTitle.includes('filets sociaux') || pTitle.includes('vulnérable') || pTitle.includes('solidarité') || pTitle.includes('pauvreté');
    }

    return pTitle.includes(cleanName.toLowerCase());
  });

  // Filter citizen projects within the tab
  const filteredCitizenProjects = relatedProjects.filter(p => {
    const matchesSearch = !projectSearch.trim() ||
      p.title.toLowerCase().includes(projectSearch.toLowerCase().trim()) ||
      p.commune_name.toLowerCase().includes(projectSearch.toLowerCase().trim()) ||
      p.region_name.toLowerCase().includes(projectSearch.toLowerCase().trim());

    const matchesCat = selectedProjectCategory === 'ALL' || p.category === selectedProjectCategory;
    return matchesSearch && matchesCat;
  });

  const totalProjectsBudget = relatedProjects.reduce((sum, p) => sum + (p.budget_amount_fcfa || 0), 0);

  const handleShareProject = (proj: BudgetProject) => {
    const text = `Chantier citoyen : ${proj.title} - Budget : ${formatFCFA(proj.budget_amount_fcfa)} (${proj.commune_name || 'Côte d\'Ivoire'}). Suivi transparent sur SuiviBudget CI : https://suivibudget.ci/`;
    if (navigator.share) {
      navigator.share({ title: proj.title, text, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleRequestProjectDoc = (proj: BudgetProject) => {
    setSelectedProjectForDoc(proj);
    setDocModalOpen(true);
  };

  // Helper to clean redundant project location text
  const getCleanProjectLocation = (proj: BudgetProject) => {
    if (proj.commune_name && proj.commune_name.length > 0 && !proj.commune_name.toLowerCase().includes('ministère') && !proj.commune_name.toLowerCase().includes('primature') && proj.commune_name.length < 35) {
      return `${proj.commune_name}${proj.region_name ? ', ' + proj.region_name : ''}`;
    }
    if (proj.region_name && !proj.region_name.toLowerCase().includes('ministère') && !proj.region_name.toLowerCase().includes('primature') && proj.region_name.length < 35) {
      return proj.region_name;
    }
    return 'Territoire National / Multi-Régions';
  };

  // Helper to clean redundant contractor / service text
  const shouldDisplayService = (serviceName?: string) => {
    if (!serviceName) return false;
    const s = serviceName.toLowerCase();
    const inst = institution.name.toLowerCase();
    if (s.length > 60 || s.includes(cleanName.toLowerCase()) || inst.includes(s)) {
      return false;
    }
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* ========================================================= */}
        {/* 1. EN-TÊTE ÉPURÉ & RESPONSIVE (AUCUN DOUBLON) */}
        {/* ========================================================= */}
        <div className="p-4 sm:p-6 pb-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-sky-50/30 to-slate-50 relative flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            
            <div className="flex items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
              {/* Leader / Minister Photo (Format harmonieux avec gestion fallback) */}
              <ModalLeaderAvatar
                photoUrl={institution.leader_photo_url}
                name={institution.leader_name || institution.name}
                isPresidence={institution.id === 'inst-presidence'}
              />

              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                    institution.type === 'MINISTERE' ? 'bg-sky-700 text-white shadow-2xs' :
                    institution.type === 'MAIRIE' ? 'bg-emerald-700 text-white' :
                    institution.type === 'REGION' ? 'bg-indigo-700 text-white' : 'bg-brand-blue text-white'
                  }`}>
                    {institution.type === 'MINISTERE' ? 'Gouvernement de Côte d\'Ivoire' : 
                     institution.type === 'MAIRIE' ? 'Collectivité Municipale' : 
                     institution.type === 'REGION' ? 'Conseil Régional' : 'Institution de la République'}
                  </span>

                  {institution.green_line_number && (
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 whitespace-nowrap">
                      <Phone className="w-2.5 h-2.5 flex-shrink-0" /> N° Vert : {institution.green_line_number}
                    </span>
                  )}
                </div>

                <h2 className="text-base sm:text-xl font-black text-slate-900 leading-snug line-clamp-2" title={institution.name}>
                  {institution.name}
                </h2>

                {institution.leader_name && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-700 truncate">
                    <span className="font-bold text-slate-900">{institution.leader_name}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 font-medium truncate">{institution.leader_title || 'Premier Responsable'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions & Close Button */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {institution.website && isSafeUrl(institution.website) && (
                <a 
                  href={institution.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-white text-slate-700 hover:bg-brand-blue hover:text-white border border-slate-200 shadow-2xs transition-colors"
                  title={`Site officiel : ${institution.website}`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Site Web</span>
                </a>
              )}

              {institution.facebook_url && isSafeUrl(institution.facebook_url) && (
                <a 
                  href={institution.facebook_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-blue-50 text-[#1877F2] hover:bg-[#1877F2] hover:text-white border border-blue-200/80 shadow-2xs transition-colors"
                  title={`Page Facebook : ${institution.facebook_url}`}
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    <path fill="#FFFFFF" d="M16.671 15.457l.532-3.47h-3.328v-2.25c0-.949.465-1.874 1.956-1.874h1.542V4.91s-1.374-.235-2.686-.235c-2.741 0-4.533 1.662-4.533 4.669v2.227H7.078v3.47h3.076V23.93c.613.096 1.24.143 1.875.143s1.262-.047 1.875-.143v-8.473h2.767z"/>
                  </svg>
                  <span>Facebook</span>
                </a>
              )}

              <button
                onClick={() => {
                  setSelectedProjectForDoc(null);
                  setDocModalOpen(true);
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-brand-blue hover:bg-brand-blue-dark text-white shadow-2xs transition-colors cursor-pointer"
                title="Générer une demande officielle de documents publics (Loi n°2013-867)"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Demande de Documents Publics</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-full bg-white hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors shadow-xs border border-slate-200 cursor-pointer"
                title="Fermer la fiche"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Liens Web/Facebook sur Mobile */}
          {(institution.website || institution.facebook_url) && (
            <div className="flex sm:hidden items-center gap-2 pt-2.5 mt-2 border-t border-slate-200/60">
              {institution.website && isSafeUrl(institution.website) && (
                <a 
                  href={institution.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs active:scale-95 transition-all"
                >
                  <Globe className="w-3.5 h-3.5 text-slate-500" />
                  <span>Site Web</span>
                </a>
              )}
              {institution.facebook_url && isSafeUrl(institution.facebook_url) && (
                <a 
                  href={institution.facebook_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-[#1877F2] border border-blue-200 shadow-2xs active:scale-95 transition-all"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    <path fill="#FFFFFF" d="M16.671 15.457l.532-3.47h-3.328v-2.25c0-.949.465-1.874 1.956-1.874h1.542V4.91s-1.374-.235-2.686-.235c-2.741 0-4.533 1.662-4.533 4.669v2.227H7.078v3.47h3.076V23.93c.613.096 1.24.143 1.875.143s1.262-.047 1.875-.143v-8.473h2.767z"/>
                  </svg>
                  <span>Facebook</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 2. BARRE DE NAVIGATION EN 3 ONGLETS MAJEURS (SANS CLUTTER) */}
        {/* ========================================================= */}
        <div className="px-4 sm:px-6 bg-white border-b border-slate-200 flex items-center gap-2 overflow-x-auto scrollbar-none flex-shrink-0">
          {[
            { 
              id: 'PROJECTS', 
              label: 'Chantiers & Projets',
              badge: relatedProjects.length > 0 ? `${relatedProjects.length}` : undefined
            },
            { 
              id: 'FINANCES', 
              label: 'Budget & Finances',
              badge: isLoadingLines ? 'Chargement...' : (entityBudgetLines.length > 0 ? `${entityBudgetLines.length} lignes` : 'Exercice 2026')
            },
            { 
              id: 'LEADER_MISSIONS', 
              label: institution.type === 'MINISTERE' ? 'Le Ministre & Missions' :
                     institution.type === 'REGION' ? 'Présidence & Organisation' :
                     institution.type === 'MAIRIE' ? 'Le Maire & Organisation' : 'Direction & Missions',
              badge: undefined
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-3 sm:px-4 text-xs font-black uppercase tracking-wider transition-all border-b-2 whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-brand-blue text-brand-blue bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === tab.id ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ========================================================= */}
        {/* 3. CONTENU DES 3 ONGLETS HARMONISÉS */}
        {/* ========================================================= */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/70">

          {/* ========================================================= */}
          {/* TAB 1 : CHANTIERS & PROJETS CONCRETS */}
          {/* ========================================================= */}
          {activeTab === 'PROJECTS' && (
            <div className="space-y-4">
              
              {/* Synthèse Chantiers Référencés */}
              <div className="bg-gradient-to-r from-blue-900 via-brand-blue to-sky-800 rounded-2xl p-4 sm:p-5 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 bg-brand-orange text-white px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" />
                    <span>Observatoire Citoyen</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight">
                    Chantiers & Investissements Concrets
                  </h3>
                  <p className="text-xs text-blue-100">
                    Projets d'investissements publics pilotés par <strong>{institution.name}</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 flex-shrink-0">
                  <div className="text-center pr-3 border-r border-white/20">
                    <span className="text-[10px] font-bold uppercase text-blue-200 block">Chantiers</span>
                    <span className="text-xl font-black text-white">{relatedProjects.length}</span>
                  </div>
                  <div className="text-left pl-1">
                    <span className="text-[10px] font-bold uppercase text-blue-200 block">Enveloppe Votée</span>
                    <span className="text-sm sm:text-base font-black text-amber-300">
                      {formatFCFA(totalProjectsBudget > 0 ? totalProjectsBudget : institution.budget_investment_fcfa)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Filtres de Recherche */}
              <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="relative flex-1 w-full">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrer par mot-clé, commune, région..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white"
                  />
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={selectedProjectCategory}
                    onChange={(e) => setSelectedProjectCategory(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none"
                  >
                    <option value="ALL">Toutes les catégories</option>
                    <option value="EDUCATION">Éducation & Formation</option>
                    <option value="SANTE">Santé & Hôpitaux</option>
                    <option value="EAU">Eau & Hydraulique</option>
                    <option value="INFRASTRUCTURE">Infrastructures & Bâtiments</option>
                    <option value="ENERGIE">Énergie & Électricité</option>
                    <option value="AGRICULTURE">Agriculture</option>
                    <option value="SPORT">Sport & Loisirs</option>
                    <option value="SOCIAL">Social</option>
                  </select>
                </div>
              </div>

              {/* Liste des Cartes de Projets Épurées */}
              {filteredCitizenProjects.length > 0 ? (
                <div className="space-y-3">
                  {filteredCitizenProjects.map((proj) => (
                    <div 
                      key={proj.id} 
                      className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs hover:border-brand-blue/50 hover:shadow-xs transition-all space-y-3 group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-brand-blue/10 text-brand-blue">
                              {proj.category}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800">
                              Exercice 2026
                            </span>
                            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-brand-orange" />
                              <span>{getCleanProjectLocation(proj)}</span>
                            </span>
                          </div>

                          <h4 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-brand-blue transition-colors leading-snug">
                            {proj.title}
                          </h4>

                          {shouldDisplayService(proj.service_name) && (
                            <p className="text-xs text-slate-500 font-medium">
                              Service d'exécution : <span className="font-semibold text-slate-700">{proj.service_name}</span>
                            </p>
                          )}
                        </div>

                        <div className="sm:text-right bg-slate-50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl sm:border-l sm:border-slate-100 sm:pl-4 flex-shrink-0">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Dotation Allouée</span>
                          <span className="text-lg font-black text-brand-blue block">
                            {formatFCFA(proj.budget_amount_fcfa)}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 block">
                            ({formatAmountInWords(proj.budget_amount_fcfa)})
                          </span>
                        </div>
                      </div>

                      {/* Actions Chantier */}
                      <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span className="text-[11px] font-medium text-slate-600">
                            Statut : <strong className="text-emerald-700 font-bold">{proj.current_status === 'IN_PROGRESS' ? 'En cours d\'exécution' : proj.current_status === 'COMPLETED' ? 'Livré aux populations' : 'Inscrit au Budget 2026'}</strong>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRequestProjectDoc(proj)}
                            className="px-2.5 py-1 rounded-lg font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer text-[11px]"
                            title="Demander les documents contractuels de ce chantier"
                          >
                            <FileText className="w-3 h-3 text-brand-orange" />
                            <span>Demande CAIDP</span>
                          </button>

                          <button
                            onClick={() => handleShareProject(proj)}
                            className="px-2.5 py-1 rounded-lg font-bold bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue border border-brand-blue/20 flex items-center gap-1 transition-colors cursor-pointer text-[11px]"
                            title="Partager ce chantier aux citoyens"
                          >
                            <Share2 className="w-3 h-3" />
                            <span>Partager</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
                  <div className="flex justify-center"><Search className="w-7 h-7 text-slate-300" /></div>
                  <h5 className="text-sm font-black text-slate-800">Aucun projet ne correspond à ce filtre</h5>
                  <p className="text-xs text-slate-500">
                    Consultez l'ensemble des {relatedProjects.length} chantiers en réinitialisant les critères.
                  </p>
                  <button
                    onClick={() => {
                      setProjectSearch('');
                      setSelectedProjectCategory('ALL');
                    }}
                    className="px-3.5 py-1.5 bg-brand-blue text-white rounded-xl text-xs font-bold hover:bg-sky-700 transition-colors"
                  >
                    Réinitialiser
                  </button>
                </div>
              )}

              {relatedProjects.length > 0 && (
                <div className="text-center pt-1">
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToProjects(cleanName);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all"
                  >
                    <span>Explorer ces {relatedProjects.length} projets dans l'annuaire national</span>
                    <ArrowRight className="w-3.5 h-3.5 text-brand-orange" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2 : BUDGET & FINANCES DE L'ÉTAT (SYNTHÈSE + LIGNES) */}
          {/* ========================================================= */}
          {activeTab === 'FINANCES' && (
            <div className="space-y-5">
              
              {/* Synthèse Graphique & Ventilation */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Dotation Globale (Loi de Finances 2026)</span>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                      {formatFCFA(institution.total_budget_fcfa)}
                    </h3>
                    <p className="text-xs text-brand-blue font-bold">
                      {formatAmountInWords(institution.total_budget_fcfa)}
                    </p>
                  </div>

                  <div className="text-xs text-slate-500 font-medium">
                    Exercice Budgétaire : <span className="font-bold text-slate-800">2026 (LFI)</span>
                  </div>
                </div>

                {/* Blocs Fonctionnement vs Investissement */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-sky-50 rounded-xl border border-sky-200 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-sky-700 block">Dépenses de Fonctionnement</span>
                    <span className="text-lg font-black text-slate-900 block">{formatFCFA(institution.budget_functioning_fcfa)}</span>
                    <span className="text-xs font-bold text-sky-800 block">({functioningPct}% du budget total)</span>
                  </div>

                  <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">Dépenses d'Investissement Public</span>
                    <span className="text-lg font-black text-slate-900 block">{formatFCFA(institution.budget_investment_fcfa)}</span>
                    <span className="text-xs font-bold text-emerald-800 block">({investmentPct}% du budget total)</span>
                    {investmentBudget === 0 && (
                      <span className="text-[10px] text-slate-500 block pt-0.5 italic">
                        Crédits d'investissement portés par les ministères sectoriels
                      </span>
                    )}
                  </div>
                </div>

                {/* Jauge Bicolore */}
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                  {functioningPct > 0 && (
                    <div className="bg-sky-600 h-full transition-all duration-500" style={{ width: `${functioningPct}%` }} title={`Fonctionnement: ${functioningPct}%`}></div>
                  )}
                  {investmentPct > 0 && (
                    <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${investmentPct}%` }} title={`Investissement: ${investmentPct}%`}></div>
                  )}
                </div>
              </div>

              {/* ========================================================================= */}
              {/* FOCUS : LISTE OFFICIELLE DES DÉPENSES D'INVESTISSEMENT PUBLIC (LFI 2026) */}
              {/* ========================================================================= */}
              {relatedProjects.length > 0 ? (
                <div className="bg-emerald-50/80 border-2 border-emerald-300/80 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200 pb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                        <h4 className="text-xs sm:text-sm font-black text-emerald-950 uppercase tracking-wider">
                          Dépenses d'Investissement Public : Projets & Chantiers Inscrits ({relatedProjects.length})
                        </h4>
                      </div>
                      <p className="text-xs text-emerald-800 font-medium">
                        Projets et opérations d'équipements votés à la Loi de Finances 2026 pour <strong>{institution.name}</strong>.
                      </p>
                    </div>

                    <button
                      onClick={() => setActiveTab('PROJECTS')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer flex-shrink-0"
                    >
                      <span>Onglet Chantiers</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {relatedProjects.map((proj) => (
                      <div 
                        key={proj.id} 
                        className="bg-white rounded-xl p-3.5 sm:p-4 border border-emerald-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-emerald-400 hover:shadow-xs transition-all"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                              {proj.category || 'INVESTISSEMENT'}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase bg-slate-100 text-slate-700">
                              Exercice 2026
                            </span>
                            <span className="text-[11px] text-slate-500 font-semibold truncate">
                              {proj.program_name || 'Programme d\'Investissement Public'}
                            </span>
                          </div>

                          <h5 className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
                            {proj.title}
                          </h5>

                          {proj.details && (
                            <p className="text-[11px] text-slate-500 line-clamp-1 font-medium">
                              {proj.details}
                            </p>
                          )}
                        </div>

                        <div className="text-left sm:text-right bg-emerald-50/60 sm:bg-transparent p-2.5 sm:p-0 rounded-xl sm:border-l sm:border-slate-100 sm:pl-4 flex-shrink-0">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Crédit Voté (LFI)</span>
                          <span className="text-base sm:text-lg font-black text-emerald-800 block whitespace-nowrap">
                            {formatFCFA(proj.budget_amount_fcfa)}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600 block whitespace-nowrap">
                            ({formatAmountInWords(proj.budget_amount_fcfa)})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : institution.budget_investment_fcfa > 0 ? (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 sm:p-5 space-y-2.5 shadow-2xs">
                  <div className="flex items-center gap-2 border-b border-emerald-200 pb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <h4 className="text-xs sm:text-sm font-black text-emerald-950 uppercase tracking-wider">
                      Dépenses d'Investissement Public Votées : {formatFCFA(institution.budget_investment_fcfa)}
                    </h4>
                  </div>
                  <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                    Cette enveloppe de <strong>{formatAmountInWords(institution.budget_investment_fcfa)}</strong> ({investmentPct}% du budget total) est inscrite à la Loi de Finances 2026 pour les investissements matériels, logistiques, numériques et d'aménagement de <strong>{institution.name}</strong>.
                  </p>
                  <div className="pt-1">
                    <button
                      onClick={() => setDocModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-300" />
                      <span>Demander le détail des marchés publics d'investissement (Loi CAIDP)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-100/90 border border-slate-200 rounded-2xl p-4 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Investissements Immobiliers & Bâtiments Centralisés par l'État
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Conformément aux règles de la comptabilité publique ivoirienne, <strong>{institution.name}</strong> ne porte pas de ligne de crédit d'investissement direct en propre (100% de sa dotation est affectée au fonctionnement et au personnel). Les réhabilitations et acquisitions immobilières sont portées et exécutées par le Ministère de la Construction et du Logement.
                  </p>
                </div>
              )}

              {/* Lignes Budgétaires Détaillées */}
              {isLoadingLines ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
                  <div className="w-7 h-7 border-2 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs font-bold text-slate-700">Chargement des lignes budgétaires officielles (LFI 2026)...</p>
                  <p className="text-[11px] text-slate-400">Décompression asynchrone des programmes et dotations...</p>
                </div>
              ) : entityBudgetLines.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-3 rounded-2xl border border-slate-200">
                    <div className="relative flex-1 w-full">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Rechercher une ligne (personnel, matériel, bourses...)"
                        value={lineSearch}
                        onChange={(e) => setLineSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <select
                        value={selectedNature}
                        onChange={(e) => setSelectedNature(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none"
                      >
                        <option value="ALL">Toutes les natures ({entityBudgetLines.length})</option>
                        {uniqueNatures.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Tableau des Dépenses */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                            <th className="p-3 pl-4">Intitulé du Programme & Dépense</th>
                            <th className="p-3">Nature</th>
                            <th className="p-3 pr-4 text-right">Montant (FCFA)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                          {filteredLines.map((line) => (
                            <tr key={line.id} className="hover:bg-sky-50/40 transition-colors">
                              <td className="p-3 pl-4">
                                <div className="font-bold text-slate-900 text-xs">{line.libelle}</div>
                                <div className="text-[10px] text-slate-400">{line.sous_categorie_3 || line.sous_categorie_2 || 'LFI-2026'}</div>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                  line.nature?.toLowerCase().includes('personnel') ? 'bg-purple-100 text-purple-800' :
                                  line.nature?.toLowerCase().includes('investissement') ? 'bg-emerald-100 text-emerald-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {line.nature || 'Fonctionnement'}
                                </span>
                              </td>
                              <td className="p-3 pr-4 text-right font-black text-slate-900">
                                {formatFCFA(line.montant_fcfa)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-3">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                  <div className="space-y-1">
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Ventilation Officielle du Budget 2026 (Loi de Finances)
                    </h5>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Les montants officiels votés pour <strong>{institution.name}</strong> s'élèvent à <strong>{formatFCFA(institution.budget_functioning_fcfa)}</strong> ({functioningPct}%) en fonctionnement et <strong>{formatFCFA(institution.budget_investment_fcfa)}</strong> ({investmentPct}%) en investissements publics.
                    </p>
                  </div>
                  <button
                    onClick={() => setDocModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-300" />
                    <span>Demander les pièces justificatives budgétaires (Loi CAIDP)</span>
                  </button>
                </div>
              )}

            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3 : LE MINISTRE & MISSIONS OFFICIELLES */}
          {/* ========================================================= */}
          {activeTab === 'LEADER_MISSIONS' && (
            <div className="space-y-4">
              
              {/* Biographie & Vision */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 text-brand-blue flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Biographie & Profil Républicain
                  </h4>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal text-justify">
                  {institution.leader_bio || `${institution.leader_name || 'Le Premier Responsable'} assure la direction, la représentation légale et la coordination générale des politiques publiques pour le compte de ${institution.name} conformément aux décrets de la République de Côte d'Ivoire.`}
                </p>
              </div>

              {/* Formations & Parcours (si renseignés) */}
              {((institution.leader_education && institution.leader_education.length > 0) || (institution.leader_experience && institution.leader_experience.length > 0)) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {institution.leader_education && institution.leader_education.length > 0 && (
                    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2.5">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-brand-blue" />
                        <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                          Diplômes & Formation
                        </h5>
                      </div>
                      <ul className="space-y-1.5">
                        {institution.leader_education.map((edu, idx) => (
                          <li key={idx} className="text-xs text-slate-700 flex items-start gap-2 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-blue mt-1.5 flex-shrink-0"></span>
                            <span>{edu}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {institution.leader_experience && institution.leader_experience.length > 0 && (
                    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2.5">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-brand-orange" />
                        <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                          Hautes Fonctions & Expérience
                        </h5>
                      </div>
                      <ul className="space-y-1.5">
                        {institution.leader_experience.map((exp, idx) => (
                          <li key={idx} className="text-xs text-slate-700 flex items-start gap-2 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-orange mt-1.5 flex-shrink-0"></span>
                            <span>{exp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Missions et Compétences Institutionnelles */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Attributions & Missions Régaliennes
                  </h4>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-medium">
                  {institution.mission_summary || `Conception, mise en œuvre et suivi-évaluation des politiques sectorielles de l'État ivoirien pour le département : ${institution.name}.`}
                </p>
              </div>

              {/* Organigramme & Directions Clés */}
              {institution.organigramme_details && institution.organigramme_details.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-brand-blue" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Organigramme & Structures Opérationnelles
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {institution.organigramme_details.map((section, idx) => (
                      <div key={idx} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2">
                        <h5 className="text-[11px] font-black uppercase tracking-wider text-brand-blue flex items-center gap-1.5">
                          <FolderOpen className="w-3.5 h-3.5 text-brand-orange" />
                          <span>{section.title}</span>
                        </h5>

                        <ul className="space-y-1.5">
                          {section.items.map((item, itemIdx) => (
                            <li key={itemIdx} className="text-xs font-medium text-slate-700 flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0"></span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ) : institution.organigramme_summary && institution.organigramme_summary.length > 0 ? (
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-brand-blue" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Directions & Pôles Rattachés
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {institution.organigramme_summary.map((dir, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-brand-blue/10 text-brand-blue flex items-center justify-center font-black text-[10px] flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="truncate">{dir}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Responsable de l'Information (CAIDP) */}
              <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white space-y-3 shadow-sm">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-brand-orange" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-white">
                      Accès aux Documents Publics (Loi n°2013-867)
                    </h4>
                  </div>
                  <a 
                    href="https://caidp.ci/institutrecherche" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[10px] text-brand-orange hover:underline font-bold flex items-center gap-1"
                  >
                    <span>Registre CAIDP</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Conformément à la Loi n°2013-867, chaque citoyen dispose du droit légal de solliciter les rapports budgétaires, contrats et documents administratifs de cette structure.
                </p>

                <div className="bg-slate-800 rounded-xl p-3.5 border border-slate-700 text-xs space-y-1.5">
                  {riName ? (
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Responsable de l'Information (RI) :</span>
                      <div className="font-bold text-white text-sm">{riName}</div>
                      {riFunction && <div className="text-slate-300 text-xs mt-0.5">{riFunction}</div>}
                    </div>
                  ) : (
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Service Référent :</span>
                      <div className="font-bold text-white text-sm">{riFunction}</div>
                    </div>
                  )}

                  {riEmail ? (
                    <div className="text-slate-300 pt-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{riEmail}</span>
                    </div>
                  ) : null}

                  {riPhone ? (
                    <div className="text-slate-300 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{riPhone}</span>
                    </div>
                  ) : null}

                  {!riEmail && !riPhone && (
                    <div className="pt-1 text-[11px] text-slate-400">
                      Contacts directs non publiés sur le registre public CAIDP. Saisine par courrier écrit ou via{' '}
                      <a href="https://caidp.ci" target="_blank" rel="noopener noreferrer" className="text-brand-orange font-bold hover:underline">caidp.ci</a>.
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setSelectedProjectForDoc(null);
                      setDocModalOpen(true);
                    }}
                    className="w-full mt-2 py-2 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Demande de Documents Publics (Loi CAIDP)</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* ========================================================= */}
        {/* 4. PIED DE PAGE AVEC ACTIONS CITOYENNES */}
        {/* ========================================================= */}
        <div className="p-3.5 sm:px-6 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5 flex-shrink-0">
          <button
            onClick={() => {
              setSelectedProjectForDoc(null);
              setDocModalOpen(true);
            }}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-brand-orange" />
            <span>Demande de Documents Publics (Loi CAIDP)</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-full text-xs font-bold transition-colors cursor-pointer"
          >
            Fermer la fiche
          </button>
        </div>

      </div>

      {/* SOUS-MODAL DEMANDE CAIDP */}
      <OfficialDocRequestModal
        isOpen={docModalOpen}
        onClose={() => {
          setDocModalOpen(false);
          setSelectedProjectForDoc(null);
        }}
        institution={institution}
        project={selectedProjectForDoc}
      />
    </div>
  );
};
