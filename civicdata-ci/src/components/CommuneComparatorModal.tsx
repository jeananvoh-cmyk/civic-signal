import React, { useState } from 'react';
import { X, ArrowRightLeft, Building2, MapPin, CheckCircle, TrendingUp, DollarSign, Briefcase } from 'lucide-react';
import { Institution, BudgetProject } from '../types';
import { formatFCFA, formatAmountInWords } from '../utils/formatters';

interface CommuneComparatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  institutions: Institution[];
  projects: BudgetProject[];
  initialCommuneA?: Institution | null;
  initialCommuneB?: Institution | null;
  onNavigateToProjects: (communeName: string) => void;
}

export const CommuneComparatorModal: React.FC<CommuneComparatorModalProps> = ({
  isOpen,
  onClose,
  institutions,
  projects,
  initialCommuneA,
  initialCommuneB,
  onNavigateToProjects,
}) => {
  const mairies = institutions
    .filter(i => i.type === 'MAIRIE')
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));

  const [communeAId, setCommuneAId] = useState<string>(
    initialCommuneA?.id || mairies[0]?.id || ''
  );
  const [communeBId, setCommuneBId] = useState<string>(
    initialCommuneB?.id || mairies[1]?.id || ''
  );

  if (!isOpen) return null;

  const communeA = mairies.find(m => m.id === communeAId) || mairies[0];
  const communeB = mairies.find(m => m.id === communeBId) || mairies[1];

  const getCleanName = (name: string) => (name || '').replace(/^Mairie du\s+/i, '').replace(/^Mairie de la\s+/i, '').replace(/^Mairie des\s+/i, '').replace(/^Mairie de\s+/i, '').replace(/^Mairie d['’]\s*/i, '').trim();

  const getProjectsCount = (inst: Institution) => {
    const clean = getCleanName(inst.name).toLowerCase();
    return projects.filter(p => 
      p.commune_name.toLowerCase().includes(clean) || 
      p.region_name.toLowerCase() === inst.region.toLowerCase()
    ).length;
  };

  const projectsA = getProjectsCount(communeA);
  const projectsB = getProjectsCount(communeB);

  const functioningPctA = communeA.total_budget_fcfa > 0 ? Math.round((communeA.budget_functioning_fcfa / communeA.total_budget_fcfa) * 100) : 0;
  const investmentPctA = communeA.total_budget_fcfa > 0 ? (100 - functioningPctA) : 0;

  const functioningPctB = communeB.total_budget_fcfa > 0 ? Math.round((communeB.budget_functioning_fcfa / communeB.total_budget_fcfa) * 100) : 0;
  const investmentPctB = communeB.total_budget_fcfa > 0 ? (100 - functioningPctB) : 0;

  const budgetDiff = Math.abs(communeA.total_budget_fcfa - communeB.total_budget_fcfa);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-brand-blue text-white flex items-center justify-center font-extrabold text-xl shadow-lg flex-shrink-0">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-brand-blue/20 text-brand-blue mb-1">
                Comparateur Territorial
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                Comparaison de Collectivités & Mairies
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5 sm:p-8 space-y-8 bg-slate-50/50">

          {/* Selectors Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            
            {/* Commune A Select */}
            <div className="bg-white p-4 rounded-2xl border-2 border-brand-blue/30 shadow-xs space-y-1.5">
              <label className="block text-[10px] font-black uppercase tracking-wider text-brand-blue">
                Collectivité 1
              </label>
              <select
                value={communeAId}
                onChange={(e) => setCommuneAId(e.target.value)}
                className="w-full font-bold text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:bg-white"
              >
                {mairies.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.region})</option>
                ))}
              </select>
            </div>

            {/* Commune B Select */}
            <div className="bg-white p-4 rounded-2xl border-2 border-brand-orange/30 shadow-xs space-y-1.5">
              <label className="block text-[10px] font-black uppercase tracking-wider text-brand-orange">
                Collectivité 2
              </label>
              <select
                value={communeBId}
                onChange={(e) => setCommuneBId(e.target.value)}
                className="w-full font-bold text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:bg-white"
              >
                {mairies.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.region})</option>
                ))}
              </select>
            </div>

          </div>

          {/* Comparison Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Commune A Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-xs">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-blue">Région {communeA.region}</span>
                  <h3 className="text-xl font-black text-slate-900">{communeA.name}</h3>
                  {communeA.district && <p className="text-xs text-slate-500">{communeA.district}</p>}
                </div>
                <div className="w-10 h-10 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5 text-brand-blue" />
                </div>
              </div>

              {/* Budget Total */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase">Dotation Budgétaire de l'État</span>
                {communeA.is_tax_quota_commune ? (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs font-bold text-amber-900">
                    Autonomie Fiscale (Quote-part d'impôts DGI)
                  </div>
                ) : (
                  <div>
                    <div className="text-2xl font-black text-slate-900">{formatFCFA(communeA.total_budget_fcfa)}</div>
                    <div className="text-xs font-bold text-brand-blue">({formatAmountInWords(communeA.total_budget_fcfa)})</div>
                  </div>
                )}
              </div>

              {/* Ratios Breakdown */}
              {!communeA.is_tax_quota_commune && (
                <div className="space-y-2">
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                    <div className="bg-brand-blue h-full" style={{ width: `${functioningPctA}%` }}></div>
                    <div className="bg-emerald-500 h-full" style={{ width: `${investmentPctA}%` }}></div>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-brand-blue">Fonctionnement : {functioningPctA}%</span>
                    <span className="text-emerald-700">Investissement : {investmentPctA}%</span>
                  </div>
                </div>
              )}

              {/* Chantiers liés */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">{projectsA} chantiers répertoriés</span>
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToProjects(getCleanName(communeA.name));
                  }}
                  className="px-3.5 py-1.5 bg-brand-blue text-white text-xs font-bold rounded-full hover:bg-brand-blue-dark transition-colors"
                >
                  Voir les projets
                </button>
              </div>

              {/* RI Contact */}
              <div className="p-3 bg-slate-900 text-white rounded-2xl text-xs space-y-1">
                <span className="text-brand-orange font-bold block text-[10px] uppercase">Responsable Information (RI) :</span>
                <div className="font-bold">{communeA.info_officer_name}</div>
                <div className="text-slate-300 text-[11px]">{communeA.info_officer_email}</div>
              </div>
            </div>

            {/* Commune B Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-xs">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-orange">Région {communeB.region}</span>
                  <h3 className="text-xl font-black text-slate-900">{communeB.name}</h3>
                  {communeB.district && <p className="text-xs text-slate-500">{communeB.district}</p>}
                </div>
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-brand-orange flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5 text-brand-orange" />
                </div>
              </div>

              {/* Budget Total */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase">Dotation Budgétaire de l'État</span>
                {communeB.is_tax_quota_commune ? (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs font-bold text-amber-900">
                    Autonomie Fiscale (Quote-part d'impôts DGI)
                  </div>
                ) : (
                  <div>
                    <div className="text-2xl font-black text-slate-900">{formatFCFA(communeB.total_budget_fcfa)}</div>
                    <div className="text-xs font-bold text-brand-orange">({formatAmountInWords(communeB.total_budget_fcfa)})</div>
                  </div>
                )}
              </div>

              {/* Ratios Breakdown */}
              {!communeB.is_tax_quota_commune && (
                <div className="space-y-2">
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                    <div className="bg-brand-blue h-full" style={{ width: `${functioningPctB}%` }}></div>
                    <div className="bg-emerald-500 h-full" style={{ width: `${investmentPctB}%` }}></div>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-brand-blue">Fonctionnement : {functioningPctB}%</span>
                    <span className="text-emerald-700">Investissement : {investmentPctB}%</span>
                  </div>
                </div>
              )}

              {/* Chantiers liés */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">{projectsB} chantiers répertoriés</span>
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToProjects(getCleanName(communeB.name));
                  }}
                  className="px-3.5 py-1.5 bg-brand-orange text-white text-xs font-bold rounded-full hover:bg-orange-600 transition-colors"
                >
                  Voir les projets
                </button>
              </div>

              {/* RI Contact */}
              <div className="p-3 bg-slate-900 text-white rounded-2xl text-xs space-y-1">
                <span className="text-brand-orange font-bold block text-[10px] uppercase">Responsable Information (RI) :</span>
                <div className="font-bold">{communeB.info_officer_name}</div>
                <div className="text-slate-300 text-[11px]">{communeB.info_officer_email}</div>
              </div>
            </div>

          </div>

          {/* Key Insight Difference */}
          {!communeA.is_tax_quota_commune && !communeB.is_tax_quota_commune && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span className="font-semibold">Écart de dotation de l'État :</span>
              <strong className="text-slate-900 font-black text-sm">{formatFCFA(budgetDiff)} <span className="text-brand-blue text-xs font-bold">({formatAmountInWords(budgetDiff)})</span></strong>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all"
          >
            Fermer le Comparateur
          </button>
        </div>

      </div>
    </div>
  );
};
