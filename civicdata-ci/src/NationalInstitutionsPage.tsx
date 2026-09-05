import React, { useState } from 'react';
import { ArrowLeft, Search, Landmark, ArrowRight, FileText, Globe, ExternalLink, Info, ShieldCheck } from 'lucide-react';
import { NATIONAL_INSTITUTIONS_DATA } from '../../data/nationalBudgetData';
import { Institution, BudgetProject } from '../../types';
import { formatFCFA, formatAmountInWords } from '../../utils/formatters';
import { OfficialDocRequestModal } from '../../components/OfficialDocRequestModal';
import { InstitutionDetailModal } from '../../components/InstitutionDetailModal';

interface NationalInstitutionsPageProps {
  onBack: () => void;
  onNavigateToProjects: (query: string) => void;
  allProjects?: BudgetProject[];
}

const InstitutionPhoto: React.FC<{
  photoUrl?: string;
  name: string;
  sizeClass?: string;
}> = ({ photoUrl, name, sizeClass = "w-20 h-20 sm:w-24 sm:h-24" }) => {
  const [hasError, setHasError] = useState(false);

  const getInitials = (n: string) => {
    return n
      .replace(/^(M\.|Mme|Dr|S\.E\.M\.|Nanan)\s+/i, '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0])
      .join('')
      .toUpperCase();
  };

  if (!photoUrl || hasError) {
    return null;
  }

  return (
    <div className={`${sizeClass} min-w-[5rem] max-w-[5rem] sm:min-w-[6rem] sm:max-w-[6rem] aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm flex-shrink-0 cursor-zoom-in group/photo relative bg-slate-100`}>
      <img
        src={photoUrl}
        alt={name}
        onError={() => setHasError(true)}
        className="w-full h-full object-cover object-top transition-transform duration-300 ease-out group-hover/photo:scale-115"
        loading="lazy"
      />
    </div>
  );
};

export const NationalInstitutionsPage: React.FC<NationalInstitutionsPageProps> = ({
  onBack,
  onNavigateToProjects,
  allProjects = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'PARLEMENT' | 'CONSTITUTIONNEL' | 'CONTROLE'>('ALL');
  const [selectedInstForDoc, setSelectedInstForDoc] = useState<Institution | null>(null);
  const [selectedInstForDetail, setSelectedInstForDetail] = useState<Institution | null>(null);

  const filteredInstitutions = NATIONAL_INSTITUTIONS_DATA.filter((inst: any) => {
    // Strictly exclude ministries from Grandes Institutions page
    const nameLower = (inst.name || '').toLowerCase();
    if (nameLower.startsWith('ministère') || nameLower.startsWith('ministere') || nameLower.includes('délégué')) {
      return false;
    }

    if (selectedCategory === 'PARLEMENT') {
      if (!inst.name.includes('Assemblée') && !inst.name.includes('Sénat')) return false;
    } else if (selectedCategory === 'CONSTITUTIONNEL') {
      if (!inst.name.includes('Constitutionnel')) return false;
    } else if (selectedCategory === 'CONTROLE') {
      if (!inst.name.includes('Comptes') && !inst.name.includes('HABG') && !inst.name.includes('CEI') && !inst.name.includes('Médiateur') && !inst.name.includes('CESEC')) return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      inst.name.toLowerCase().includes(q) ||
      (inst.leader_name && inst.leader_name.toLowerCase().includes(q)) ||
      (inst.info_officer_name && inst.info_officer_name.toLowerCase().includes(q)) ||
      (inst.address && inst.address.toLowerCase().includes(q))
    );
  });

  // Separate Presidence de la Republique from other institutions for distinguished VIP hero display
  const presidence = filteredInstitutions.find((i: any) => i.id === 'inst-presidence');
  const otherInstitutions = filteredInstitutions.filter((i: any) => i.id !== 'inst-presidence');

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight font-sans">
          Institutions de la République
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto font-medium">
          Présidence de la République, Parlement, Juridictions Constitutionnelles et Organes de Contrôle de l'État : dotations budgétaires, dirigeants officiels et contacts.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="max-w-3xl mx-auto space-y-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400 ml-1" />
          <input
            type="text"
            placeholder="Rechercher une institution, un président (ex: Présidence, Assemblée, Sénat, Cour des Comptes, HABG)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-medium text-slate-900 focus:outline-none placeholder:text-slate-400"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {[
            { id: 'ALL', label: 'Toutes les Institutions' },
            { id: 'PARLEMENT', label: 'Parlement (Assemblée & Sénat)' },
            { id: 'CONSTITUTIONNEL', label: 'Juridictions & Conseil Constitutionnel' },
            { id: 'CONTROLE', label: 'Contrôle & Gouvernance (Cour des Comptes, HABG, Médiateur, CESEC)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id as any)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === tab.id
                  ? 'bg-brand-blue text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section 1 : La Présidence de la République (Chef de l'État - Mise en valeur prestige Bleu Marine Royal & Or) */}
      {presidence && (
        <div className="bg-gradient-to-br from-[#0c2a4d] via-[#143d6b] to-[#09203c] rounded-3xl p-6 sm:p-8 md:p-10 text-white shadow-xl border-2 border-amber-400/70 relative overflow-hidden group">
          {/* Subtle Royal Lighting Accents */}
          <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
          <div className="absolute top-0 right-10 w-72 h-72 bg-sky-400/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row gap-6 sm:gap-8 items-start lg:items-center justify-between">
            
            {/* Left: Large Official Portrait of the President */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="relative flex-shrink-0">
                <div className="w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-3xl overflow-hidden border-4 border-amber-400 shadow-2xl bg-[#081a2f] cursor-zoom-in group/pres">
                  <img 
                    src={presidence.leader_photo_url || "/images/presidence_alassane_ouattara.png"} 
                    alt={presidence.leader_name}
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.includes('175277585572.png')) {
                        target.src = "https://www.gouv.ci/uploads/institutions/175277585572.png";
                      }
                    }}
                    className="w-full h-full object-cover object-top transition-transform duration-500 ease-out group-hover/pres:scale-110" 
                  />
                </div>
                <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 text-[10px] sm:text-[11px] font-black uppercase px-3.5 py-0.5 rounded-full shadow-lg whitespace-nowrap">
                  Chef de l'État
                </div>
              </div>

              {/* President & Institution Details */}
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  <span>RÉPUBLIQUE DE CÔTE D'IVOIRE</span>
                  <span>•</span>
                  <span className="text-amber-200">Union - Discipline - Travail</span>
                </div>

                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                  {presidence.name}
                </h2>

                <div className="text-base sm:text-lg font-black text-amber-400">
                  {presidence.leader_name}
                </div>
                <div className="text-xs text-sky-200 font-bold">
                  {presidence.leader_title}
                </div>

                <p className="text-xs text-sky-100/90 leading-relaxed line-clamp-2 sm:line-clamp-3 pt-1 font-normal">
                  {presidence.mission_summary}
                </p>

                {/* Direct Links */}
                <div className="flex flex-wrap items-center gap-2.5 pt-2 text-xs font-semibold text-slate-200">
                  {presidence.website && (
                    <a 
                      href={presidence.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors shadow-2xs font-bold text-xs"
                      title={`Site officiel : ${presidence.website}`}
                    >
                      <Globe className="w-3.5 h-3.5 text-amber-300" />
                      <span>Site Web</span>
                      <ExternalLink className="w-2.5 h-2.5 text-slate-300" />
                    </a>
                  )}
                  {presidence.facebook_url && (
                    <a 
                      href={presidence.facebook_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-400/30 transition-colors shadow-2xs font-bold text-xs"
                      title={`Page Facebook : ${presidence.facebook_url}`}
                    >
                      <svg className="w-3.5 h-3.5 fill-current text-blue-300" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      <span>Facebook</span>
                      <ExternalLink className="w-2.5 h-2.5 text-blue-300" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Right / Bottom: Presidential Budget Block & CTA */}
            <div className="w-full lg:w-80 bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 space-y-3.5 flex-shrink-0 shadow-lg text-white">
              <div className="space-y-1">
                <div className="text-[11px] font-black uppercase text-amber-300 tracking-wider">
                  Dotation Budgétaire Présidence
                </div>
                <div className="text-lg font-black text-white whitespace-nowrap">
                  {formatFCFA(presidence.total_budget_fcfa)}
                </div>
                <div className="text-xs text-amber-200 font-bold whitespace-nowrap">
                  ({formatAmountInWords(presidence.total_budget_fcfa)})
                </div>
              </div>

              {/* Budget bar */}
              <div className="space-y-1.5">
                <div className="w-full bg-slate-900/50 rounded-full h-2 overflow-hidden flex">
                  <div className="bg-sky-400 h-full" style={{ width: `${Math.round((presidence.budget_functioning_fcfa / presidence.total_budget_fcfa) * 100)}%` }} />
                  <div className="bg-emerald-400 h-full" style={{ width: `${Math.round((presidence.budget_investment_fcfa / presidence.total_budget_fcfa) * 100)}%` }} />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-sky-100">
                  <span className="text-sky-300">Fonct. : {Math.round((presidence.budget_functioning_fcfa / presidence.total_budget_fcfa) * 100)}% ({formatAmountInWords(presidence.budget_functioning_fcfa)})</span>
                  <span className="text-emerald-300">Invest. : {Math.round((presidence.budget_investment_fcfa / presidence.total_budget_fcfa) * 100)}% ({formatAmountInWords(presidence.budget_investment_fcfa)})</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => setSelectedInstForDetail(presidence)}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>Consulter la fiche complète</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setSelectedInstForDoc(presidence)}
                  className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-white/20 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-300" />
                  <span>Demande de Documents Publics</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Section 2 : Les Autres Grandes Institutions Constitutionnelles et de Contrôle */}
      <div className="space-y-4">
        {presidence && (
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">
              Institutions Constitutionnelles & Organes de Contrôle ({otherInstitutions.length})
            </h2>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {otherInstitutions.map((inst: any) => {
            const functioningPct = inst.total_budget_fcfa > 0 
              ? Math.round((inst.budget_functioning_fcfa / inst.total_budget_fcfa) * 100) 
              : 0;
            const investmentPct = inst.total_budget_fcfa > 0 ? (100 - functioningPct) : 0;

            return (
              <div 
                key={inst.id}
                onClick={() => setSelectedInstForDetail(inst)}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-brand-blue/50 transition-all flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  {/* Top: Header & Leader Photo */}
                  <div className="flex items-start gap-4 mb-4">
                    <InstitutionPhoto
                      photoUrl={inst.leader_photo_url}
                      name={inst.leader_name || inst.name}
                      sizeClass="w-20 h-20 sm:w-24 sm:h-24"
                    />

                    <div className="space-y-1 min-w-0 flex-1">
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 mb-1">
                        Institution de la République
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-brand-blue transition-colors leading-snug">
                        {inst.name}
                      </h3>
                      {inst.leader_name && (
                        <div className="text-xs text-slate-600 font-bold mt-1">
                          {inst.leader_title} : <span className="text-brand-blue">{inst.leader_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Budget Section */}
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-bold uppercase">Dotation Budgétaire</span>
                      <span className="font-black text-slate-900 whitespace-nowrap">
                        {formatFCFA(inst.total_budget_fcfa)} <span className="text-brand-blue font-bold whitespace-nowrap">({formatAmountInWords(inst.total_budget_fcfa)})</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex">
                      <div className="bg-brand-blue h-full" style={{ width: `${functioningPct}%` }} />
                      <div className="bg-emerald-500 h-full" style={{ width: `${investmentPct}%` }} />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between text-[11px] font-semibold text-slate-600 gap-1 pt-1">
                      <span className="text-brand-blue">
                        Fonct. : <strong className="font-bold">{functioningPct}%</strong> ({formatAmountInWords(inst.budget_functioning_fcfa)})
                      </span>
                      <span className="text-emerald-700">
                        Invest. : <strong className="font-bold">{investmentPct}%</strong> ({formatAmountInWords(inst.budget_investment_fcfa)})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer : Harmonized with MinistriesPage */}
                <div className="pt-3 mt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    {inst.website && (
                      <a
                        href={inst.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-brand-blue hover:text-white text-slate-600 flex items-center justify-center transition-colors shadow-2xs flex-shrink-0"
                        title={`Site officiel : ${inst.website}`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {inst.facebook_url && (
                      <a
                        href={inst.facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 flex items-center justify-center transition-colors shadow-2xs flex-shrink-0"
                        title={`Page Facebook : ${inst.facebook_url}`}
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      </a>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedInstForDoc(inst);
                      }}
                      className="px-2.5 py-1.5 bg-blue-50/90 hover:bg-brand-blue hover:text-white text-brand-blue border border-blue-100 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer flex-shrink-0"
                      title="Générer une demande officielle de documents publics (Loi n°2013-867)"
                    >
                      <FileText className="w-3 h-3 text-brand-orange" />
                      <span className="whitespace-nowrap">Demande CAIDP</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-end sm:justify-start">
                    <span className="font-bold text-brand-blue flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-xs">
                      Fiche & Budget <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Demande RI */}
      <OfficialDocRequestModal
        isOpen={!!selectedInstForDoc}
        onClose={() => setSelectedInstForDoc(null)}
        institution={selectedInstForDoc}
      />

      {/* Modal Fiche Complète Institution */}
      <InstitutionDetailModal
        isOpen={!!selectedInstForDetail}
        onClose={() => setSelectedInstForDetail(null)}
        institution={selectedInstForDetail}
        allProjects={allProjects}
        onNavigateToProjects={onNavigateToProjects}
      />

    </div>
  );
};
