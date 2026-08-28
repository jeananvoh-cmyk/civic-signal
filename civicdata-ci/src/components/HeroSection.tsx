import React from 'react';
import { CATEGORIES } from '../data/categories';
import { Search, MapPin, Sparkles, CheckCircle2 } from 'lucide-react';

interface HeroSectionProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  onExploreClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  onExploreClick,
}) => {
  return (
    <div className="relative bg-gradient-to-b from-navy-900 via-navy-900 to-navy-950 text-white pt-8 pb-14 px-4 sm:px-6 lg:px-8 overflow-hidden">
      
      {/* Background Decorative Accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-terracotta-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

      <div className="max-w-5xl mx-auto text-center relative z-10">
        
        {/* Civic Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-navy-800/90 border border-terracotta-500/30 text-terracotta-400 text-xs sm:text-sm font-semibold mb-5 shadow-sm backdrop-blur-sm">
          <Sparkles className="w-4 h-4 text-terracotta-400" />
          <span>Plateforme Citoyenne Indépendante • Côte d'Ivoire 2026</span>
        </div>

        {/* Main Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight font-sans">
          Suivez l'argent public.<br />
          <span className="bg-gradient-to-r from-terracotta-400 to-amber-400 bg-clip-text text-transparent">
            Vérifiez les chantiers chez vous.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-4 sm:mt-5 text-sm sm:text-base md:text-lg text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
          De la <strong>Loi de Finances</strong> aux réalités du terrain : découvrez les dotations, montants votés en FCFA et l'avancement concret des infrastructures de votre commune et région.
        </p>

        {/* Search & Fast Filtering Input */}
        <div className="mt-7 max-w-2xl mx-auto">
          <div className="bg-white/10 p-1.5 sm:p-2 rounded-2xl backdrop-blur-md border border-white/15 shadow-2xl flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 flex items-center">
              <MapPin className="absolute left-3.5 w-5 h-5 text-terracotta-400" />
              <input
                type="text"
                placeholder="Ex: Aboisso, Goulia, Korhogo, Bouaké, Maternité..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-navy-950/80 rounded-xl text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta-500"
              />
            </div>
            <button
              onClick={onExploreClick}
              className="px-6 py-3 bg-terracotta-500 hover:bg-terracotta-600 active:scale-95 text-white text-sm font-bold rounded-xl shadow-lg shadow-terracotta-500/30 transition-all flex items-center justify-center gap-2 flex-shrink-0"
            >
              <Search className="w-4 h-4" />
              <span>Explorer</span>
            </button>
          </div>
        </div>

        {/* Sector Categories Pills */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto">
          {CATEGORIES.slice(0, 7).map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(isSelected && cat.id !== 'ALL' ? 'ALL' : cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-terracotta-500 text-white border-terracotta-400 shadow-md shadow-terracotta-500/20'
                    : 'bg-navy-800/80 text-slate-300 border-navy-700 hover:bg-navy-700 hover:text-white'
                }`}
              >
                {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
};
