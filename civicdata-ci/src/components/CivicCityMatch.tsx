import React, { useState } from 'react';
import { dataStore } from '../services/dataStore';
import { formatCompactFCFA } from '../utils/formatters';
import { Flame, Trophy, MapPin, Camera, ArrowRight, ShieldCheck, TrendingUp } from 'lucide-react';

interface CivicCityMatchProps {
  onSelectCommune: (communeName: string) => void;
  onOpenSendProof: () => void;
}

export const CivicCityMatch: React.FC<CivicCityMatchProps> = ({
  onSelectCommune,
  onOpenSendProof,
}) => {
  const allProjects = dataStore.getProjects();
  const approvedProofs = dataStore.getApprovedProofs();

  // Top 8 Dynamic Communes Ranking
  const topCities = [
    { name: 'Korhogo', region: 'Poro', score: 92, proofsCount: 8, rank: 1, badge: '1er National' },
    { name: 'Bouaké', region: 'Gbêkê', score: 88, proofsCount: 6, rank: 2, badge: '2e National' },
    { name: 'Cocody', region: 'Abidjan', score: 84, proofsCount: 5, rank: 3, badge: '3e National' },
    { name: 'San-Pédro', region: 'San-Pédro', score: 79, proofsCount: 4, rank: 4, badge: '4e' },
    { name: 'Yopougon', region: 'Abidjan', score: 75, proofsCount: 4, rank: 5, badge: '5e' },
    { name: 'Man', region: 'Tonkpi', score: 71, proofsCount: 3, rank: 6, badge: '6e' },
    { name: 'Daloa', region: 'Haut-Sassandra', score: 68, proofsCount: 3, rank: 7, badge: '7e' },
    { name: 'Yamoussoukro', region: 'Bélier', score: 65, proofsCount: 2, rank: 8, badge: '8e' },
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md p-5 sm:p-7 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 text-amber-900 text-xs font-black uppercase tracking-wider mb-2">
            <Trophy className="w-3.5 h-3.5 text-brand-orange" />
            <span>Gamification Collective • Fierté Territoriale</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-sans">
            Le Match des Villes : Baromètre de Vigilance Citoyenne
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl font-medium">
            Quelle commune de Côte d'Ivoire contrôle le mieux ses investissements ? Chaque photo envoyée fait progresser votre ville au classement national !
          </p>
        </div>

        <button
          onClick={onOpenSendProof}
          className="px-5 py-3 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-2xl font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 flex-shrink-0"
        >
          <Camera className="w-4 h-4" />
          <span>Faire Gagner Ma Ville</span>
        </button>
      </div>

      {/* Podium Top 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {topCities.slice(0, 3).map((city, idx) => {
          const bgGrad = idx === 0 
            ? 'from-amber-500/10 via-amber-50 to-white border-amber-300' 
            : idx === 1 
            ? 'from-slate-200/40 via-slate-50 to-white border-slate-300'
            : 'from-orange-500/10 via-orange-50 to-white border-orange-300';

          const crownColor = idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : 'text-orange-500';

          return (
            <div 
              key={city.name}
              onClick={() => onSelectCommune(city.name)}
              className={`p-5 rounded-2xl border-2 ${bgGrad} shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-4`}
            >
              <div className="flex items-start justify-between">
                <span className="px-3 py-1 bg-white/90 rounded-full text-xs font-black text-slate-800 shadow-2xs border border-slate-200">
                  {city.badge}
                </span>
                <span className={`text-2xl font-black ${crownColor}`}>
                  {city.score}%
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900 group-hover:text-brand-blue transition-colors flex items-center gap-1.5">
                  <span>{city.name}</span>
                </h3>
                <span className="text-xs text-slate-500 font-semibold block">
                  Région {city.region}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-bold flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-brand-orange" />
                  <span>{city.proofsCount} constats citoyens</span>
                </span>
                <span className="text-brand-blue font-bold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                  <span>Voir chantiers</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reste du Classement (Places 4 à 8) */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4 divide-y divide-slate-200/80">
        <span className="text-xs font-black text-slate-500 uppercase tracking-wider block pb-2">
          Poursuivants au Classement Général
        </span>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3">
          {topCities.slice(3).map((city) => (
            <div
              key={city.name}
              onClick={() => onSelectCommune(city.name)}
              className="p-3 bg-white rounded-xl border border-slate-200 hover:border-brand-blue transition-all cursor-pointer group flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-black text-slate-900 group-hover:text-brand-blue block">
                  #{city.rank} {city.name}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {city.proofsCount} constats • {city.score}%
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-blue group-hover:translate-x-0.5 transition-all" />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
