import { matchesSmartSearch } from '../utils/searchHelpers';
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Building2, Landmark, User, FileText, ArrowRight, CornerDownLeft, Sparkles, MapPin } from 'lucide-react';
import { Institution, BudgetProject } from '../types';
import { GOVERNMENT_OFFICIALS, OfficialLeader } from '../data/governmentData';
import { NATIONAL_INSTITUTIONS_DATA } from '../data/nationalBudgetData';
import { formatFCFA, formatAmountInWords } from '../utils/formatters';

interface SpotlightSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  institutions: Institution[];
  projects: BudgetProject[];
  onSelectInstitution: (institutionName: string, type: string) => void;
  onSelectProject: (projectId: string) => void;
  onSelectOfficial: (official: OfficialLeader) => void;
}

export const SpotlightSearchModal: React.FC<SpotlightSearchModalProps> = ({
  isOpen,
  onClose,
  institutions,
  projects,
  onSelectInstitution,
  onSelectProject,
  onSelectOfficial,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Normalize string for accent-insensitive search
  const normalize = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const q = normalize(query);

  // Grouped search results
  const mairiesResults = !q ? [] : institutions
    .filter((i: Institution) => i.type === 'MAIRIE' && matchesSmartSearch([i.name, i.region, i.district, i.departement, i.leader_name], query))
    .slice(0, 4);

  const regionsResults = !q ? [] : institutions
    .filter((i: Institution) => (i.type === 'REGION' || i.type === 'DISTRICT') && matchesSmartSearch([i.name, i.region, i.district, i.departement, i.leader_name], query))
    .slice(0, 3);

  const ministersResults = !q ? [] : GOVERNMENT_OFFICIALS
    .filter((o: OfficialLeader) => matchesSmartSearch([o.name, o.role_title, o.department_ministry], query))
    .slice(0, 3);

  const nationalInstResults = !q ? [] : NATIONAL_INSTITUTIONS_DATA
    .filter((inst: any) => matchesSmartSearch([inst.name, inst.president_name, inst.title, inst.description], query))
    .slice(0, 3);

  const projectsResults = !q ? [] : projects
    .filter((p: BudgetProject) => 
      normalize(p.title).includes(q) || 
      normalize(p.commune_name).includes(q) || 
      normalize(p.region_name).includes(q) ||
      normalize(p.category).includes(q)
    )
    .slice(0, 5);

  // Flattened results for keyboard navigation
  const allResults: Array<{
    type: 'MAIRIE' | 'REGION' | 'MINISTER' | 'NATIONAL' | 'PROJECT';
    data: any;
  }> = [
    ...mairiesResults.map((data: any) => ({ type: 'MAIRIE' as const, data })),
    ...regionsResults.map((data: any) => ({ type: 'REGION' as const, data })),
    ...ministersResults.map((data: any) => ({ type: 'MINISTER' as const, data })),
    ...nationalInstResults.map((data: any) => ({ type: 'NATIONAL' as const, data })),
    ...projectsResults.map((data: any) => ({ type: 'PROJECT' as const, data })),
  ];

  const totalResultsCount = allResults.length;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (totalResultsCount || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + (totalResultsCount || 1)) % (totalResultsCount || 1));
      } else if (e.key === 'Enter' && allResults[selectedIndex]) {
        e.preventDefault();
        handleSelect(allResults[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, allResults]);

  const handleSelect = (item: { type: string; data: any }) => {
    onClose();
    if (item.type === 'MAIRIE' || item.type === 'REGION') {
      onSelectInstitution(item.data.name, item.type);
    } else if (item.type === 'MINISTER') {
      onSelectOfficial(item.data);
    } else if (item.type === 'NATIONAL') {
      onSelectInstitution(item.data.name, 'NATIONAL');
    } else if (item.type === 'PROJECT') {
      onSelectProject(item.data.id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-md flex items-start justify-center p-4 sm:p-6 pt-16 sm:pt-24 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar Input */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-3.5 bg-slate-50/50">
          <Search className="w-5 h-5 text-brand-blue flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher une commune, une région, un ministre, un député, un chantier (ex: Cocody, Santé, Pont)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm sm:text-base font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-black text-slate-400 bg-white border border-slate-200 rounded-md shadow-2xs">
            ESC
          </kbd>
        </div>

        {/* Search Results Area */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-5 divide-y divide-slate-100">
          
          {/* Initial State / Suggestions when query is empty */}
          {!query.trim() && (
            <div className="py-8 text-center space-y-4">
              <div className="inline-flex p-3 rounded-2xl bg-brand-blue/10 text-brand-blue">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-900">Recherche Universelle Suivi Budget CI</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Accédez instantanément aux 201 communes, 33 régions, membres du gouvernement et 4 586 chantiers publics de Côte d'Ivoire.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <span className="text-[11px] font-bold text-slate-400 mr-1">Suggestions :</span>
                {['Mairie de Cocody', 'Bouaké', 'Ministère de la Santé', 'Assemblée Nationale', 'Yopougon', 'San Pedro'].map((sug) => (
                  <button
                    key={sug}
                    onClick={() => setQuery(sug)}
                    className="px-3 py-1 bg-slate-100 hover:bg-brand-blue hover:text-white rounded-full text-xs font-semibold text-slate-600 transition-colors"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No Results Found */}
          {query.trim() && totalResultsCount === 0 && (
            <div className="py-12 text-center space-y-2">
              <div className="text-3xl"></div>
              <h4 className="text-sm font-bold text-slate-800">Aucun résultat trouvé pour « {query} »</h4>
              <p className="text-xs text-slate-500">
                Vérifiez l'orthographe ou essayez un mot-clé plus général (ex: "Abidjan", "Éducation", "Mairie").
              </p>
            </div>
          )}

          {/* 1. Mairies Results */}
          {mairiesResults.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400 px-2">
                <Building2 className="w-3.5 h-3.5 text-brand-blue" />
                <span>Conseils Municipaux & Mairies ({mairiesResults.length})</span>
              </div>
              <div className="space-y-1">
                {mairiesResults.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleSelect({ type: 'MAIRIE', data: m })}
                    className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center font-bold text-sm">
                        ️
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-brand-blue transition-colors">
                          {m.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Région {m.region} • {m.is_tax_quota_commune ? "Autonomie fiscale DGI" : `Dotation : ${formatFCFA(m.total_budget_fcfa)} (${formatAmountInWords(m.total_budget_fcfa)})`}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-blue group-hover:translate-x-1 transition-all" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Régions Results */}
          {regionsResults.length > 0 && (
            <div className="space-y-2 pt-4">
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400 px-2">
                <MapPin className="w-3.5 h-3.5 text-brand-orange" />
                <span>Conseils Régionaux & Districts ({regionsResults.length})</span>
              </div>
              <div className="space-y-1">
                {regionsResults.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => handleSelect({ type: 'REGION', data: r })}
                    className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-orange-50 text-brand-orange flex items-center justify-center font-bold text-sm">
                        ️
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-brand-orange transition-colors">
                          {r.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Chef-lieu : {r.departement} • Budget : {formatFCFA(r.total_budget_fcfa)}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-orange group-hover:translate-x-1 transition-all" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Ministers & Officials */}
          {ministersResults.length > 0 && (
            <div className="space-y-2 pt-4">
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400 px-2">
                <User className="w-3.5 h-3.5 text-brand-blue" />
                <span>Gouvernement & Ministères ({ministersResults.length})</span>
              </div>
              <div className="space-y-1">
                {ministersResults.map((o: OfficialLeader) => (
                  <div
                    key={o.id}
                    onClick={() => handleSelect({ type: 'MINISTER', data: o })}
                    className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={o.photo_url} 
                        alt={o.name} 
                        className="w-9 h-9 rounded-full object-cover border border-slate-200" 
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-brand-blue transition-colors">
                          {o.name}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          {o.role_title}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-blue group-hover:translate-x-1 transition-all" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. National Institutions */}
          {nationalInstResults.length > 0 && (
            <div className="space-y-2 pt-4">
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400 px-2">
                <Landmark className="w-3.5 h-3.5 text-slate-700" />
                <span>Grandes Institutions ({nationalInstResults.length})</span>
              </div>
              <div className="space-y-1">
                {nationalInstResults.map((inst: any) => (
                  <div
                    key={inst.id}
                    onClick={() => handleSelect({ type: 'NATIONAL', data: inst })}
                    className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-sm">
                        ️
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-brand-blue transition-colors">
                          {inst.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          RI : {inst.info_officer_name} • {inst.address}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-blue group-hover:translate-x-1 transition-all" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Projects Results */}
          {projectsResults.length > 0 && (
            <div className="space-y-2 pt-4">
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400 px-2">
                <FileText className="w-3.5 h-3.5 text-brand-blue" />
                <span>Chantiers & Projets Budgétaires ({projectsResults.length})</span>
              </div>
              <div className="space-y-1">
                {projectsResults.map((p: BudgetProject) => (
                  <div
                    key={p.id}
                    onClick={() => handleSelect({ type: 'PROJECT', data: p })}
                    className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        ️
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-brand-blue transition-colors line-clamp-1">
                          {p.title}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span> {p.commune_name || p.region_name}</span>
                          <span>•</span>
                          <span className="font-black text-slate-900">{formatFCFA(p.budget_amount_fcfa)}</span> <span className="text-brand-blue font-bold">({formatAmountInWords(p.budget_amount_fcfa)})</span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-blue group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Keyboard Helper Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium px-4">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-600">↑↓</kbd> Naviguer
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-600">↵</kbd> Ouvrir
            </span>
          </div>
          <div className="flex items-center gap-1">
            <CornerDownLeft className="w-3 h-3" />
            <span>SuiviBudget CI Moteur Unifié</span>
          </div>
        </div>

      </div>
    </div>
  );
};
