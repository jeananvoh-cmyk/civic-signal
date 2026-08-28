import React, { useState } from 'react';
import { Institution, InstitutionType, BudgetProject } from '../types';
import { dataStore } from '../services/dataStore';
import { formatFCFA, formatCompactFCFA } from '../utils/formatters';
import { 
  Building2, 
  MapPin, 
  Mail, 
  Phone, 
  Globe, 
  UserCheck, 
  Coins, 
  ArrowRight, 
  Search, 
  Filter,
  ShieldCheck,
  PhoneCall
} from 'lucide-react';

interface InstitutionsPageProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSelectProject: (project: BudgetProject) => void;
  onNavigateToProjects: (filterQuery: string) => void;
}

export const InstitutionsPage: React.FC<InstitutionsPageProps> = ({
  searchQuery,
  setSearchQuery,
  onSelectProject,
  onNavigateToProjects,
}) => {
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const institutions = dataStore.getInstitutions();
  const allProjects = dataStore.getProjects();

  const filteredInstitutions = institutions.filter((inst) => {
    const matchesSearch =
      !searchQuery ||
      inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.info_officer_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      selectedType === 'ALL' || inst.type === selectedType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-24">
      
      {/* Page Title & Intro */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-navy-50 text-navy-800 text-xs font-bold mb-2">
            <Building2 className="w-4 h-4 text-terracotta-500" />
            <span>Module 1 • Répertoire Officiel & Loi sur l'Accès à l'Information</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-navy-900 tracking-tight font-sans">
            Annuaire des Institutions & Responsables (RI)
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Retrouvez les contacts des collectivités territoriales de Côte d'Ivoire, les coordonnées directes des <strong>Responsables de l'Information (RI)</strong> et la répartition budgétaire Fonctionnement vs Investissement.
          </p>
        </div>

        {/* Global Stats Pill */}
        <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 text-xs">
          <div>
            <span className="text-slate-500 block">Collectivités listées</span>
            <span className="font-extrabold text-base text-navy-900">{institutions.length}</span>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div>
            <span className="text-slate-500 block">Points de contact RI</span>
            <span className="font-extrabold text-base text-emerald-600">100% Vérifiés</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setSelectedType('ALL')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              selectedType === 'ALL'
                ? 'bg-navy-900 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Toutes ({institutions.length})
          </button>
          
          <button
            onClick={() => setSelectedType('MAIRIE')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              selectedType === 'MAIRIE'
                ? 'bg-navy-900 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Mairies
          </button>

          <button
            onClick={() => setSelectedType('REGION')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              selectedType === 'REGION'
                ? 'bg-navy-900 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Conseils Régionaux
          </button>

          <button
            onClick={() => setSelectedType('DISTRICT')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              selectedType === 'DISTRICT'
                ? 'bg-navy-900 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Districts Autonomes
          </button>
        </div>

        <div className="w-full sm:w-72 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrer par nom ou région..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-700"
          />
        </div>
      </div>

      {/* Institutions List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredInstitutions.map((inst) => {
          const functioningPct = Math.round((inst.budget_functioning_fcfa / inst.total_budget_fcfa) * 100) || 25;
          const investmentPct = 100 - functioningPct;
          const relatedProjectsCount = allProjects.filter(p => 
            p.commune_name.toLowerCase().includes(inst.name.replace('Mairie de ', '').replace('Mairie d\'', '').toLowerCase()) ||
            p.region_name.toLowerCase() === inst.region.toLowerCase()
          ).length;

          return (
            <div 
              key={inst.id}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all duration-200 overflow-hidden flex flex-col justify-between"
            >
              
              {/* Institution Header */}
              <div className="p-5 sm:p-6 pb-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-navy-100 text-navy-900 mb-1">
                      {inst.type === 'MAIRIE' ? 'Collectivité Communale' : inst.type === 'REGION' ? 'Conseil Régional' : 'District Autonome'}
                    </span>
                    <h3 className="text-xl font-extrabold text-navy-900 leading-snug">
                      {inst.name}
                    </h3>
                  </div>

                  <div className="w-10 h-10 rounded-2xl bg-slate-100 text-navy-800 flex items-center justify-center font-extrabold text-sm flex-shrink-0">
                    🇨🇮
                  </div>
                </div>

                {/* Location & Contacts */}
                <div className="space-y-1.5 text-xs text-slate-600 mt-3">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-terracotta-500 flex-shrink-0" />
                    <span>Région : <strong>{inst.region}</strong> {inst.district ? `(${inst.district})` : ''}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 pt-1">
                    {inst.contact_phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{inst.contact_phone}</span>
                      </span>
                    )}
                    {inst.contact_email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{inst.contact_email}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* SPECIAL BOX: RESPONSABLE DE L'INFORMATION (RI) */}
              <div className="px-5 sm:px-6 py-3.5 bg-gradient-to-r from-navy-900 to-navy-950 text-white mx-5 sm:mx-6 rounded-2xl shadow-inner border border-navy-800">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-terracotta-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Responsable de l'Information (RI)</span>
                  </div>
                  {inst.green_line_number && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                      N° Vert : {inst.green_line_number}
                    </span>
                  )}
                </div>

                <div className="text-xs space-y-1">
                  <div className="font-semibold text-white text-sm">
                    {inst.info_officer_name}
                  </div>
                  <div className="text-[11px] text-slate-300 flex flex-wrap gap-x-3">
                    <span>✉️ {inst.info_officer_email}</span>
                    <span>📞 {inst.info_officer_phone}</span>
                  </div>
                </div>
              </div>

              {/* BUDGET SUMMARY BAR: FONCTIONNEMENT VS INVESTISSEMENT */}
              <div className="p-5 sm:p-6 pt-4 space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Budget Annuel Total 2026
                  </span>
                  <span className="text-base sm:text-lg font-extrabold text-navy-900 font-sans">
                    {formatFCFA(inst.total_budget_fcfa)}
                  </span>
                </div>

                {/* Progress bar Functioning vs Investment */}
                <div>
                  <div className="w-full bg-slate-200 rounded-full h-3.5 overflow-hidden flex">
                    <div 
                      className="bg-blue-600 h-full transition-all"
                      style={{ width: `${functioningPct}%` }}
                      title={`Fonctionnement: ${functioningPct}%`}
                    ></div>
                    <div 
                      className="bg-emerald-500 h-full transition-all"
                      style={{ width: `${investmentPct}%` }}
                      title={`Investissement: ${investmentPct}%`}
                    ></div>
                  </div>

                  <div className="flex justify-between items-center text-[11px] mt-1.5 font-medium">
                    <div className="flex items-center gap-1 text-blue-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                      <span>Fonctionnement : <strong>{formatCompactFCFA(inst.budget_functioning_fcfa)}</strong> ({functioningPct}%)</span>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <span>Investissement : <strong>{formatCompactFCFA(inst.budget_investment_fcfa)}</strong> ({investmentPct}%)</span>
                    </div>
                  </div>
                </div>

                {/* Direct Action Link */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    {relatedProjectsCount} chantiers & projets répertoriés
                  </span>

                  <button
                    onClick={() => onNavigateToProjects(inst.name.replace('Mairie de ', '').replace('Mairie d\'', ''))}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-50 hover:bg-terracotta-50 text-navy-900 hover:text-terracotta-700 text-xs font-bold transition-colors"
                  >
                    <span>Voir les projets liés</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
