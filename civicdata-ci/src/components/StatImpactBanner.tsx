import React from 'react';
import { ImpactStats } from '../types';
import { Building2, FileSpreadsheet, CheckCircle2, TrendingUp } from 'lucide-react';
import { formatCompactFCFA } from '../utils/formatters';

interface StatImpactBannerProps {
  stats: ImpactStats;
}

export const StatImpactBanner: React.FC<StatImpactBannerProps> = ({ stats }) => {
  return (
    <div className="relative -mt-7 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-20">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Card 1: Communes & Régions */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-card hover:shadow-card-hover border border-slate-100 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Territoire</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-navy-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-navy-900 font-sans tracking-tight">
              {stats.totalCommunes}
            </div>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Communes & {stats.totalRegions} Régions
            </p>
          </div>
        </div>

        {/* Card 2: Lignes Budgétaires */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-card hover:shadow-card-hover border border-slate-100 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Lignes 2026</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-navy-900 font-sans tracking-tight">
              {stats.totalBudgetLines.toLocaleString('fr-FR')}
            </div>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Lignes de dotations analysées
            </p>
          </div>
        </div>

        {/* Card 3: Montant Investissements */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-card hover:shadow-card-hover border border-slate-100 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Investissements</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 font-sans tracking-tight">
              {formatCompactFCFA(stats.totalInvestmentsFcfa || 185000000000)}
            </div>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Budget voté Loi de Finances
            </p>
          </div>
        </div>

        {/* Card 4: Preuves Vérifiées */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-card hover:shadow-card-hover border border-slate-100 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contrôle Citoyen</span>
            <div className="w-8 h-8 rounded-lg bg-terracotta-50 text-terracotta-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-terracotta-600 font-sans tracking-tight">
              {stats.proofsVerificationRate}%
            </div>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Taux de preuves vérifiées
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
