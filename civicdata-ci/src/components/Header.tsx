import React from 'react';
import { ActiveTab } from '../types';
import { 
  Building2, 
  Coins, 
  Camera, 
  Home, 
  Search, 
  ShieldCheck, 
  UserCheck, 
  LogOut 
} from 'lucide-react';
import { dataStore } from '../services/dataStore';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenSendProof: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  onOpenSendProof,
}) => {
  const auth = dataStore.getAuth();
  const pendingProofsCount = dataStore.getPendingProofs().length;

  return (
    <header className="sticky top-0 z-40 bg-navy-900 border-b border-navy-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
          
          {/* LOGO & TITLE */}
          <div 
            className="flex items-center gap-3 cursor-pointer group flex-shrink-0"
            onClick={() => setActiveTab('home')}
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-terracotta-600 to-terracotta-400 flex items-center justify-center shadow-lg shadow-terracotta-500/30 group-hover:scale-105 transition-transform">
              <span className="text-xl">🇨🇮</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white font-sans">CivicData</span>
                <span className="font-extrabold text-lg sm:text-xl text-terracotta-400">CI</span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-navy-800 text-terracotta-400 rounded border border-navy-700">
                  2026
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block font-medium">
                Contrôle Citoyen du Budget & des Chantiers
              </p>
            </div>
          </div>

          {/* SEARCH BAR (Desktop & Tablet) */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher une commune, région ou projet..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-navy-950/80 border border-navy-700/80 rounded-xl text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-terracotta-500/50 focus:border-terracotta-500 transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* DESKTOP NAVIGATION TABS */}
          <nav className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'home'
                  ? 'bg-terracotta-500 text-white font-semibold shadow-md shadow-terracotta-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-navy-800'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Accueil</span>
            </button>

            <button
              onClick={() => setActiveTab('institutions')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'institutions'
                  ? 'bg-terracotta-500 text-white font-semibold shadow-md shadow-terracotta-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-navy-800'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Institutions (M1)</span>
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'projects'
                  ? 'bg-terracotta-500 text-white font-semibold shadow-md shadow-terracotta-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-navy-800'
              }`}
            >
              <Coins className="w-4 h-4" />
              <span>Budget & Projets (M2)</span>
            </button>

            <button
              onClick={() => setActiveTab('observatory')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'observatory'
                  ? 'bg-terracotta-500 text-white font-semibold shadow-md shadow-terracotta-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-navy-800'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Observatoire (M3)</span>
            </button>
          </nav>

          {/* ACTION BUTTONS & ADMIN BADGE */}
          <div className="flex items-center gap-2">
            {/* Quick Proof Submission CTA */}
            <button
              onClick={onOpenSendProof}
              className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-emerald-700/20 hover:shadow-emerald-600/30 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>Envoyer preuve</span>
            </button>

            {/* Admin Dashboard Access */}
            <button
              onClick={() => setActiveTab('admin')}
              className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium border transition-all ${
                activeTab === 'admin'
                  ? 'bg-navy-700 border-terracotta-500 text-white'
                  : 'bg-navy-800/80 border-navy-700 text-slate-300 hover:text-white hover:bg-navy-700'
              }`}
              title={auth.isAuthenticated ? `Connecté : ${auth.fullName}` : "Accès administration"}
            >
              <ShieldCheck className="w-4 h-4 text-terracotta-400" />
              <span className="hidden sm:inline">
                {auth.isAuthenticated ? 'Back-office' : 'Admin'}
              </span>
              {pendingProofsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-terracotta-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">
                  {pendingProofsCount}
                </span>
              )}
            </button>

            {auth.isAuthenticated && (
              <button
                onClick={() => dataStore.logout()}
                className="p-2 text-slate-400 hover:text-red-400 rounded-xl hover:bg-navy-800 transition-colors"
                title="Déconnexion"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>

        {/* MOBILE SEARCH BAR */}
        <div className="md:hidden pb-3 pt-1">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher commune, région, projet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 bg-navy-950/90 border border-navy-700 rounded-lg text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-terracotta-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400"
              >
                ✕
              </button>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};
