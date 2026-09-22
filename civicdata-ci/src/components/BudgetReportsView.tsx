import React, { useState, useMemo } from 'react';
import { dataStore } from '../services/dataStore';
import { formatFCFA, formatAmountInWords, formatDateFR } from '../utils/formatters';
import { 
  FileText, 
  Printer, 
  TrendingUp, 
  Building, 
  ShieldCheck, 
  CheckCircle2, 
  PieChart, 
  Layers, 
  MapPin, 
  AlertCircle,
  BarChart3,
  Calendar,
  Share2
} from 'lucide-react';

type ReportType = 'GLOBAL' | 'INFRASTRUCTURE' | 'SANTE' | 'EDUCATION' | 'EAU_POTABLE' | 'LOCAL';

export const BudgetReportsView: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('GLOBAL');
  const allProjects = dataStore.getProjects();
  const approvedProofs = dataStore.getApprovedProofs();

  // Statistics calculation for the report
  const stats = useMemo(() => {
    let filteredProjects = allProjects;
    if (selectedReport === 'INFRASTRUCTURE') {
      filteredProjects = allProjects.filter(p => p.category === 'INFRASTRUCTURE');
    } else if (selectedReport === 'SANTE') {
      filteredProjects = allProjects.filter(p => p.category === 'SANTE');
    } else if (selectedReport === 'EDUCATION') {
      filteredProjects = allProjects.filter(p => p.category === 'EDUCATION');
    } else if (selectedReport === 'EAU_POTABLE') {
      filteredProjects = allProjects.filter(p => p.category === 'EAU_POTABLE');
    } else if (selectedReport === 'LOCAL') {
      filteredProjects = allProjects.filter(p => p.scope_level === 'LOCAL');
    }

    const totalAmount = filteredProjects.reduce((sum, p) => sum + p.budget_amount_fcfa, 0);
    const nationalCount = filteredProjects.filter(p => p.scope_level === 'NATIONAL').length;
    const localCount = filteredProjects.filter(p => p.scope_level === 'LOCAL').length;
    const nationalAmount = filteredProjects.filter(p => p.scope_level === 'NATIONAL').reduce((sum, p) => sum + p.budget_amount_fcfa, 0);
    const localAmount = filteredProjects.filter(p => p.scope_level === 'LOCAL').reduce((sum, p) => sum + p.budget_amount_fcfa, 0);

    // Top entities in this report
    const entityMap = new Map<string, { name: string; amount: number; count: number }>();
    filteredProjects.forEach(p => {
      const name = p.ministry_name || p.institution_name || p.commune_name || p.region_name || 'Collectivité';
      const existing = entityMap.get(name) || { name, amount: 0, count: 0 };
      existing.amount += p.budget_amount_fcfa;
      existing.count += 1;
      entityMap.set(name, existing);
    });

    const topEntities = Array.from(entityMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    // Categories breakdown
    const catMap = new Map<string, number>();
    filteredProjects.forEach(p => {
      const cat = p.category || 'Autres';
      catMap.set(cat, (catMap.get(cat) || 0) + p.budget_amount_fcfa);
    });

    const categoryBreakdown = Array.from(catMap.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalProjects: filteredProjects.length,
      totalAmount,
      nationalCount,
      localCount,
      nationalAmount,
      localAmount,
      topEntities,
      categoryBreakdown,
      totalProofs: approvedProofs.length,
    };
  }, [allProjects, approvedProofs, selectedReport]);

  const handlePrint = () => {
    window.print();
  };

  const getReportTitle = () => {
    switch (selectedReport) {
      case 'INFRASTRUCTURE': return 'Rapport Thématique : Infrastructures, Routes & Transports 2026';
      case 'SANTE': return 'Rapport Thématique : Santé Publique & Équipements Médicaux 2026';
      case 'EDUCATION': return 'Rapport Thématique : Éducation Nationale & Universités 2026';
      case 'EAU_POTABLE': return 'Rapport Thématique : Hydraulique, Eau Potable & Assainissement 2026';
      case 'LOCAL': return 'Rapport de Décentralisation : Investissements des 201 Mairies & 33 Régions 2026';
      default: return 'Bilan Annuel Global de l\'Observatoire Budgétaire & Citoyen 2026';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header & Controls (Hidden in Print Mode) */}
      <div className="print:hidden bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-brand-blue text-xs font-black uppercase tracking-wider mb-2 border border-blue-200">
              <FileText className="w-3.5 h-3.5" />
              <span>Générateur Officiel de Rapports d'Étape</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Rapports Budgétaires & Bilans Citoyens 2026
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
              Consultez, imprimez et partagez les bilans consolidés des investissements publics votés dans la Loi de Finances 2026 et vérifiés sur le terrain par les citoyens.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="py-3 px-5 bg-brand-blue hover:bg-navy-900 active:scale-95 text-white rounded-2xl text-xs font-black shadow-md flex items-center gap-2 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer / Télécharger PDF</span>
            </button>
          </div>
        </div>

        {/* Report Category Switcher */}
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
            Sélectionnez le Type de Rapport à Générer :
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {[
              { id: 'GLOBAL', label: 'Bilan Global 2026' },
              { id: 'LOCAL', label: 'Mairies & Régions' },
              { id: 'INFRASTRUCTURE', label: 'Infrastructures' },
              { id: 'SANTE', label: 'Santé Publique' },
              { id: 'EDUCATION', label: 'Éducation' },
              { id: 'EAU_POTABLE', label: 'Eau Potable' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedReport(tab.id as ReportType)}
                className={`p-3 rounded-2xl text-xs font-black border transition-all text-center flex items-center justify-center ${
                  selectedReport === tab.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/20'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* OFFICIAL REPORT DOCUMENT (PRINTABLE A4 FRIENDLY) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-12 border border-slate-200 shadow-lg space-y-10 print:border-none print:shadow-none print:p-0">
        
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
              RÉPUBLIQUE DE CÔTE D'IVOIRE • OBSERVATOIRE CITOYEN DES PROJETS PUBLICS
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {getReportTitle()}
            </h1>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-500 pt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Exercice Budgétaire : 2026</span>
              </span>
              <span>•</span>
              <span>Source : Loi de Finances 2026 (DGBF) & Suivi Terrain Citoyen</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-right flex-shrink-0">
            <div className="text-[10px] font-black text-slate-400 uppercase">Édition du Rapport</div>
            <div className="text-xs font-black text-slate-800">{formatDateFR(new Date().toISOString())}</div>
            <div className="text-[10px] font-bold text-emerald-700"> Données Officielles Vérifiées</div>
          </div>
        </div>

        {/* 1. SYNTHÈSE EXÉCUTIVE DES CHIFFRES CLÉS */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-orange"></span>
            <span>1. Synthèse Exécutive & Volumes Budgétaires</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-500 block">Volume Budgétaire Total</span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
                {formatFCFA(stats.totalAmount)}
              </span>
              <span className="text-[11px] font-bold text-brand-blue">
                {formatAmountInWords(stats.totalAmount)} FCFA
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-500 block">Nombre de Projets Votés</span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
                {stats.totalProjects.toLocaleString('fr-FR')}
              </span>
              <span className="text-[11px] text-slate-500">
                {stats.nationalCount} Nationaux • {stats.localCount} Locaux
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-500 block">Couverture Territoriale</span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
                234 Collectivités
              </span>
              <span className="text-[11px] text-slate-500">
                201 Mairies & 33 Conseils Régionaux
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-500 block">Contrôle & Preuves Citoyennes</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 block">
                {stats.totalProofs} Constats
              </span>
              <span className="text-[11px] text-emerald-800 font-bold">
                Transmis par les citoyens
              </span>
            </div>
          </div>
        </div>

        {/* 2. VENTILATION PAR NIVEAU D'INTERVENTION */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-blue"></span>
            <span>2. Double Échelle d'Investissement Public</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-brand-blue uppercase flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-brand-blue" />
                  <span>Grands Chantiers de l'État</span>
                </span>
                <span className="text-xs font-black text-slate-800">
                  {stats.totalAmount > 0 ? ((stats.nationalAmount / stats.totalAmount) * 100).toFixed(1) : '0'} %
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {formatFCFA(stats.nationalAmount)}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Pilotés par les Ministères sectoriels pour les grandes liaisons routières, hôpitaux régionaux, universités et centrales électriques.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-800 uppercase flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Investissements Locaux & Communaux</span>
                </span>
                <span className="text-xs font-black text-slate-800">
                  {stats.totalAmount > 0 ? ((stats.localAmount / stats.totalAmount) * 100).toFixed(1) : '0'} %
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {formatFCFA(stats.localAmount)}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Gérés directement par les Mairies et Conseils Régionaux pour les écoles primaires, centres de santé de proximité et hydraulique villageoise.
              </p>
            </div>
          </div>
        </div>

        {/* 3. TOP DES MAÎTRES D'OUVRAGE & ENTITÉS LES PLUS DOTÉES */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-900"></span>
            <span>3. Principaux Maîtres d'Ouvrage & Entités Publiques</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-2xl overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 uppercase font-black">
                <tr>
                  <th className="p-3.5">Rang</th>
                  <th className="p-3.5">Autorité / Ministère / Collectivité</th>
                  <th className="p-3.5 text-center">Nombre de Chantiers</th>
                  <th className="p-3.5 text-right">Budget Alloué (FCFA)</th>
                  <th className="p-3.5 text-right">Poids Budgétaire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {stats.topEntities.map((ent, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-bold text-slate-500">#{idx + 1}</td>
                    <td className="p-3.5 font-black text-slate-900">{ent.name}</td>
                    <td className="p-3.5 text-center font-bold text-slate-700">{ent.count}</td>
                    <td className="p-3.5 text-right font-black text-slate-900">{formatFCFA(ent.amount)}</td>
                    <td className="p-3.5 text-right font-bold text-brand-blue">
                      {stats.totalAmount > 0 ? ((ent.amount / stats.totalAmount) * 100).toFixed(1) : '0'} %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. CONSTATS & RECOMMANDATIONS DE L'OBSERVATOIRE */}
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <span>4. Recommandations Citoyennes pour l'Exécution Budgétaire</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-black text-slate-900 block">1. Transparence des Marchés</span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Publier systématiquement le nom des entreprises adjudicataires et les délais contractuels de livraison pour chaque ligne budgétaire.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-black text-slate-900 block">2. Affichage des Panneaux</span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Imposer l'installation sur chaque site de projet du panneau officiel mentionnant le montant alloué et le maître d'ouvrage responsable.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-black text-slate-900 block">3. Contrôle Citoyen Permanent</span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Encourager les populations locales à transmettre des preuves photographiques régulières pour documenter l'avancement physique réel.
              </p>
            </div>
          </div>
        </div>

        {/* Document Footer */}
        <div className="pt-6 border-t-2 border-slate-900 text-center text-xs text-slate-500 space-y-1">
          <p className="font-bold text-slate-700">
            Document généré automatiquement par SuiviBudget Côte d'Ivoire — Observatoire & Plateforme Citoyenne de Transparence Budgétaire.
          </p>
          <p className="text-[11px]">
            Données 100 % issues de la Loi de Finances 2026 de la République de Côte d'Ivoire (DGBF) et des budgets primitifs communaux.
          </p>
        </div>

      </div>

    </div>
  );
};
