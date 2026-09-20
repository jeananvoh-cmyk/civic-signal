import React, { useState } from 'react';
import { ArrowLeft, Search, MapPin, ChevronDown, ArrowRight, FileText, Globe, ExternalLink, Info, Eye, EyeOff } from 'lucide-react';
import { Institution, BudgetProject } from '../../types';
import { formatFCFA, formatAmountInWords, getInstitutionLeaderGender } from '../../utils/formatters';
import { OfficialDocRequestModal } from '../../components/OfficialDocRequestModal';
import { InstitutionDetailModal } from '../../components/InstitutionDetailModal';
import { LeaderPortrait } from '../../components/LeaderPortrait';
import { PaginationBar } from '../../components/PaginationBar';

interface RegionalCouncilsPageProps {
  onBack: () => void;
  institutions: Institution[];
  allProjects: BudgetProject[];
  onNavigateToProjects: (regionName: string) => void;
}

export const RegionalCouncilsPage: React.FC<RegionalCouncilsPageProps> = ({
  onBack,
  institutions,
  allProjects,
  onNavigateToProjects,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState('ALL');
  const [selectedGender, setSelectedGender] = useState<'ALL' | 'M' | 'F'>('ALL');
  const [page, setPage] = useState(1);
  const [revealedParties, setRevealedParties] = useState<Record<string, boolean>>({});
  const [revealAllParties, setRevealAllParties] = useState<boolean>(false);

  const toggleRevealParty = (id: string) => {
    setRevealedParties(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  const [pageSize, setPageSize] = useState(8);

  const [selectedInstForDoc, setSelectedInstForDoc] = useState<Institution | null>(null);
  const [selectedInstForDetail, setSelectedInstForDetail] = useState<Institution | null>(null);

  const normalize = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  // Dynamic Parity Stats for Regional Councils & Districts
  const allRegions = institutions.filter(i => i.type === 'REGION' || i.type === 'DISTRICT');
  const totalRegionsCount = allRegions.length;
  const femaleRegionsCount = allRegions.filter(r => getInstitutionLeaderGender(r) === 'F').length;
  const maleRegionsCount = totalRegionsCount - femaleRegionsCount;
  const femaleRegionsPct = totalRegionsCount > 0 ? Math.round((femaleRegionsCount / totalRegionsCount) * 100) : 0;
  const maleRegionsPct = totalRegionsCount > 0 ? 100 - femaleRegionsPct : 0;

  // Unique Districts
  const uniqueDistricts = Array.from(
    new Set(institutions.filter(i => (i.type === 'REGION' || i.type === 'DISTRICT') && i.district).map(i => i.district))
  ).filter(Boolean).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

  // Filtered Regions
  const filteredRegions = institutions.filter(i => {
    if (i.type !== 'REGION' && i.type !== 'DISTRICT') return false;

    const matchesGender = selectedGender === 'ALL' || getInstitutionLeaderGender(i) === selectedGender;

    const matchesSearch = !searchQuery.trim() ||
      normalize(i.name).includes(normalize(searchQuery)) ||
      normalize(i.region).includes(normalize(searchQuery)) ||
      (i.district && normalize(i.district).includes(normalize(searchQuery))) ||
      (i.departement && normalize(i.departement).includes(normalize(searchQuery)));

    const matchesDistrict = selectedDistrictFilter === 'ALL' ||
      normalize(i.district) === normalize(selectedDistrictFilter);

    return matchesSearch && matchesDistrict && matchesGender;
  }).sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));

  const totalPages = Math.ceil(filteredRegions.length / pageSize) || 1;
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredRegions.length);
  const paginatedRegions = filteredRegions.slice(startIndex, endIndex);

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      
      {/* Top Navigation & Clean Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-sans">
            Conseils Régionaux & Districts (33)
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl font-medium">
            Les 31 régions et 2 districts autonomes de Côte d'Ivoire, leurs dotations budgétaires, présidents et contacts officiels.
          </p>
        </div>
      </div>

      {/* Filter Toolbar & Observatoire Parité */}
      <div className="max-w-3xl mx-auto space-y-3">
        {/* Filtre paritaire républicain (Segmented Control tactile) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setSelectedGender('ALL');
                setPage(1);
              }}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                selectedGender === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              Tous <span className="ml-1 text-[11px] font-semibold text-slate-500">{totalRegionsCount}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedGender('F');
                setPage(1);
              }}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                selectedGender === 'F'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              Femmes <span className="ml-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded-md">{femaleRegionsCount} • {femaleRegionsPct}%</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedGender('M');
                setPage(1);
              }}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                selectedGender === 'M'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              Hommes <span className="ml-1 text-[11px] font-semibold text-blue-800 bg-blue-100/80 px-1.5 py-0.5 rounded-md">{maleRegionsCount} • {maleRegionsPct}%</span>
            </button>
          </div>

          <div className="text-[11px] font-medium text-slate-500 px-2 sm:px-1 flex items-center justify-between sm:justify-end gap-2">
            <span>Observatoire parité exécutif</span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">Loi n°2019-870</span>
          </div>
        </div>

        {/* Filtres District & Recherche */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 ml-1">
              District Autonome ({uniqueDistricts.length})
            </label>
            <div className="relative">
              <select
                value={selectedDistrictFilter}
                onChange={(e) => {
                  setSelectedDistrictFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full appearance-none pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-brand-orange"
              >
                <option value="ALL">Tous les Districts</option>
                {uniqueDistricts.map(dist => (
                  <option key={dist} value={dist}>{dist}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 ml-1">
              Recherche Région / Chef-lieu
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Région, chef-lieu (ex: Gbêkê, San Pedro)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-brand-orange"
              />
            </div>
          </div>
        </div>

        {/* Bouton Partis */}
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={() => setRevealAllParties(!revealAllParties)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl border text-xs font-bold transition-all shadow-xs ${
              revealAllParties 
                ? 'bg-slate-900 border-slate-900 text-white' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Afficher ou masquer tous les partis politiques"
          >
            {revealAllParties ? <EyeOff className="w-3.5 h-3.5 text-brand-orange" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
            <span>{revealAllParties ? 'Masquer tous les partis' : 'Afficher tous les partis politiques'}</span>
          </button>
        </div>
      </div>

      {/* Grid of Regions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {paginatedRegions.map((inst) => {
          const functioningPct = inst.total_budget_fcfa > 0 
            ? Math.round((inst.budget_functioning_fcfa / inst.total_budget_fcfa) * 100) 
            : 0;
          const investmentPct = inst.total_budget_fcfa > 0 ? (100 - functioningPct) : 0;
          const relatedProjectsCount = allProjects.filter(p => 
            p.region_name.toLowerCase() === inst.region.toLowerCase()
          ).length;

          return (
            <div key={inst.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-brand-blue/50 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-start gap-4 mb-3">
                  <LeaderPortrait
                    photoUrl={inst.leader_photo_url}
                    name={inst.leader_name || inst.name}
                    title={inst.leader_title || 'Président'}
                    sizeClass="w-20 h-20 sm:w-24 sm:h-24 min-w-[5rem] max-w-[5rem] sm:min-w-[6rem] sm:max-w-[6rem]"
                  />

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700">
                        {inst.district ? `District ${inst.district}` : 'Collectivité Territoriale'}
                      </span>
                      {inst.political_party && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRevealParty(inst.id);
                          }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                            (revealAllParties || revealedParties[inst.id])
                              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                          title="Cliquer pour afficher ou masquer l'étiquette politique du président"
                        >
                          {(revealAllParties || revealedParties[inst.id]) ? (
                            <>
                              <EyeOff className="w-3 h-3 text-brand-orange" />
                              <span>{inst.political_party}</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3 text-slate-400" />
                              <span>Parti politique</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-brand-blue transition-colors leading-snug">
                      {inst.name}
                    </h3>
                    {inst.leader_name && (
                      <div className="text-xs text-slate-600 font-bold mt-0.5">
                        {inst.leader_title || 'Président'} : <span className="text-brand-blue">{inst.leader_name}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-2 mt-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold uppercase">Dotation Budgétaire Régionale</span>
                    <span className="font-black text-slate-900">
                      {formatFCFA(inst.total_budget_fcfa)} <span className="text-brand-blue font-bold">({formatAmountInWords(inst.total_budget_fcfa)})</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden flex">
                    <div className="bg-brand-blue h-full" style={{ width: `${functioningPct}%` }}></div>
                    <div className="bg-emerald-500 h-full" style={{ width: `${investmentPct}%` }}></div>
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

              <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
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

                  <button
                    onClick={() => setSelectedInstForDetail(inst)}
                    className="px-2.5 py-1.5 bg-brand-blue/10 hover:bg-brand-blue hover:text-white text-brand-blue rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 flex-shrink-0 cursor-pointer"
                    title="Consulter la fiche détaillée du Conseil Régional"
                  >
                    <Info className="w-3 h-3" />
                    <span className="whitespace-nowrap">Fiche Région</span>
                  </button>
                </div>

                <div className="flex-shrink-0 w-full sm:w-auto">
                  <button
                    onClick={() => onNavigateToProjects(inst.region)}
                    className="w-full sm:w-auto px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark active:scale-95 text-white text-xs font-bold rounded-xl sm:rounded-full transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <span>Voir les projets ({relatedProjectsCount})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Bar */}
      <PaginationBar
        currentPage={safePage}
        totalPages={totalPages}
        totalItems={filteredRegions.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[8, 16, 24, 48]}
        itemLabel="collectivité"
      />

      {/* Modal Demande RI */}
      <OfficialDocRequestModal
        isOpen={!!selectedInstForDoc}
        onClose={() => setSelectedInstForDoc(null)}
        institution={selectedInstForDoc}
      />

      {/* Modal Fiche Détaillée Région */}
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
