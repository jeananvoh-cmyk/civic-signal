import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Search, 
  Building2, 
  ShieldCheck, 
  ArrowRight,
  Scale,
  RotateCcw
} from 'lucide-react';
import { dataStore } from '../services/dataStore';
import { PublicDocument, DocumentCategory } from '../types';
import { matchesSmartSearch } from '../utils/searchHelpers';

interface DocumentsPageProps {
  onNavigateToCaidp?: () => void;
}

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  RAPPORT_AUDIT: "Rapports d'Audit",
  MARCHE_PUBLIC: "Marchés Publics",
  BUDGET_OFFICIEL: "Budgets de l'État",
  LOI_CAIDP: "Textes CAIDP & Lois",
  ETUDE_TECHNIQUE: "Études Techniques",
  GUIDE_CITOYEN: "Guides Citoyens",
};

export const DocumentsPage: React.FC<DocumentsPageProps> = ({ onNavigateToCaidp }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');

  const [documents, setDocuments] = useState<PublicDocument[]>(() => dataStore.getDocuments());

  useEffect(() => {
    return dataStore.subscribe(() => {
      setDocuments(dataStore.getDocuments());
    });
  }, []);

  // Extract unique years
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(documents.map(d => d.year))).sort((a, b) => b - a);
    return years;
  }, [documents]);

  // Categories with counts
  const categoriesList = useMemo(() => {
    const cats: { key: string; label: string; count: number }[] = [
      { key: 'ALL', label: 'Tous', count: documents.length },
    ];

    Object.entries(CATEGORY_LABELS).forEach(([key, label]) => {
      const count = documents.filter(d => d.category === key).length;
      if (count > 0) {
        cats.push({ key, label, count });
      }
    });

    return cats;
  }, [documents]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Category filter
      if (selectedCategory !== 'ALL' && doc.category !== selectedCategory) {
        return false;
      }

      // Year filter
      if (selectedYear !== 'ALL' && doc.year.toString() !== selectedYear) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        return matchesSmartSearch([doc.title, doc.institution_name, doc.description, ...(doc.tags || [])], searchQuery);
      }

      return true;
    });
  }, [documents, selectedCategory, selectedYear, searchQuery]);

  const handleDownload = (doc: PublicDocument) => {
    dataStore.incrementDocumentDownloads(doc.id);
    window.open(doc.file_url, '_blank', 'noopener,noreferrer');
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedYear('ALL');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      
      {/* ========================================================================= */}
      {/* 1. REPUBLICAN HERO BANNER (Aligned with Projects & Institutions pages)     */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-brand-blue to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-brand-orange text-white text-xs font-black uppercase tracking-wider mb-2 shadow-2xs">
              <Scale className="w-3.5 h-3.5 mr-1.5" />
              <span>Transparence & Accès aux Documents (CAIDP)</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white">
              Bibliothèque Publique & Documents Administratifs
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 mt-1.5 max-w-2xl leading-relaxed">
              Consultez et téléchargez librement les rapports officiels, budgets, audits et textes de lois de la République de Côte d'Ivoire (Loi n° 2013-867).
            </p>
          </div>

          {/* Quick Metrics (Glass pill aligned with ProjectsPage) */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-white/20 flex-shrink-0">
            <div>
              <span className="text-[10px] text-slate-300 block font-bold uppercase tracking-wider">Documents</span>
              <span className="text-lg sm:text-2xl font-black text-white">{documents.length}</span>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div>
              <span className="text-[10px] text-slate-300 block font-bold uppercase tracking-wider">Téléchargements</span>
              <span className="text-lg sm:text-2xl font-black text-brand-orange">
                {documents.reduce((sum, d) => sum + (d.downloads_count || 0), 0)}
              </span>
            </div>
            <div className="w-px h-8 bg-white/20 hidden sm:block"></div>
            <div className="hidden sm:block">
              <span className="text-[10px] text-slate-300 block font-bold uppercase tracking-wider">Accès Libre</span>
              <span className="text-xs font-black text-white flex items-center gap-1 mt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> 100% Public
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SEARCH & MINIMAL UNIFIED FILTER BAR (No Rainbow colors)                */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par titre, institution, mot-clé (ex: Cour des Comptes, Budget 2026)..."
              className="w-full pl-10 pr-16 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-slate-600 px-2 py-0.5 rounded bg-slate-200/80 font-bold cursor-pointer"
              >
                Effacer
              </button>
            )}
          </div>

          {/* Year Filter */}
          <div className="flex items-center gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 cursor-pointer"
            >
              <option value="ALL">Toutes les années</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr.toString()}>Année {yr}</option>
              ))}
            </select>

            {(searchQuery || selectedCategory !== 'ALL' || selectedYear !== 'ALL') && (
              <button
                onClick={handleResetFilters}
                className="p-2.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                title="Réinitialiser les filtres"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Clean Monochrome Category Pills (Aligned with Institutions & Projects page) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
          {categoriesList.map(cat => {
            const isActive = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm border border-slate-900'
                    : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. DOCUMENTS GRID (Harmonized card architecture)                         */}
      {/* ========================================================================= */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Aucun document ne correspond à vos filtres</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Modifiez vos mots-clés ou réinitialisez les filtres pour afficher l'ensemble de la bibliothèque publique.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-brand-blue transition-colors cursor-pointer"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocuments.map((doc) => {
            return (
              <div 
                key={doc.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-xl hover:border-brand-blue/50 transition-all duration-300 flex flex-col justify-between overflow-hidden group"
              >
                {/* Top Content */}
                <div className="p-5 pb-3 space-y-3">
                  {/* Category Badge & Year */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-slate-100 text-slate-700 border border-slate-200/80">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>{CATEGORY_LABELS[doc.category] || doc.category}</span>
                    </span>
                    <span className="text-xs font-black text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                      {doc.year}
                    </span>
                  </div>

                  {/* Institution Source */}
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{doc.institution_name}</span>
                  </div>

                  {/* Document Title */}
                  <h3 
                    className="text-sm sm:text-base font-black text-slate-900 line-clamp-2 group-hover:text-brand-blue transition-colors leading-snug min-h-[44px]"
                    title={doc.title}
                  >
                    {doc.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed font-normal">
                    {doc.description}
                  </p>

                  {/* Tags (Subtle neutral pills) */}
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {doc.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="text-[10px] font-semibold bg-slate-50 text-slate-500 border border-slate-200/60 px-2 py-0.5 rounded-lg">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Section: Format, Size & Download */}
                <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-500">
                    <span className="font-bold text-slate-800">{doc.file_format}</span>
                    <span className="mx-1">•</span>
                    <span>{doc.file_size || 'PDF'}</span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {doc.downloads_count && doc.downloads_count > 1 
                        ? `${doc.downloads_count} téléchargements` 
                        : `${doc.downloads_count || 0} téléchargement`}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(doc)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-blue hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CAIDP CITIZEN CALL TO ACTION (Clean Light Banner)                     */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-50 text-brand-orange text-xs font-bold uppercase tracking-wider border border-orange-200/60">
            <Scale className="w-3.5 h-3.5" />
            <span>Document Introuvable ou Non Publié ?</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-slate-900">
            Exercez votre droit légal d'accès à l'information (Loi n° 2013-867)
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Tout citoyen, journaliste ou organisation peut demander la communication d'un rapport officiel, 
            d'un contrat ou d'une délibération auprès du Responsable de l'Information (RI) de l'organisme public concerné.
          </p>
        </div>

        <button
          onClick={onNavigateToCaidp}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-brand-blue text-white font-bold text-xs shadow-sm transition-all flex-shrink-0 cursor-pointer"
        >
          <span>Générer une demande officielle</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
