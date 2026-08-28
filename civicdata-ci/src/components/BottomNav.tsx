import React from 'react';
import { ActiveTab } from '../types';
import { Home, Building2, Coins, Camera, Plus } from 'lucide-react';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenSendProof: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenSendProof,
}) => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-navy-900/95 backdrop-blur-md border-t border-navy-800 text-white shadow-2xl px-2 py-1.5">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        
        {/* Tab 1: Accueil */}
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all ${
            activeTab === 'home'
              ? 'text-terracotta-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className={`w-5 h-5 ${activeTab === 'home' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">Accueil</span>
        </button>

        {/* Tab 2: Institutions */}
        <button
          onClick={() => setActiveTab('institutions')}
          className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all ${
            activeTab === 'institutions'
              ? 'text-terracotta-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className={`w-5 h-5 ${activeTab === 'institutions' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">Annuaire</span>
        </button>

        {/* Action Button: Send proof (Floating Center Button) */}
        <div className="relative -top-3">
          <button
            onClick={onOpenSendProof}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 active:scale-95 transition-transform border-2 border-navy-900"
            title="Envoyer une photo / preuve"
          >
            <Camera className="w-6 h-6" />
          </button>
        </div>

        {/* Tab 3: Budget & Projets */}
        <button
          onClick={() => setActiveTab('projects')}
          className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all ${
            activeTab === 'projects'
              ? 'text-terracotta-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Coins className={`w-5 h-5 ${activeTab === 'projects' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">Budget</span>
        </button>

        {/* Tab 4: Observatoire */}
        <button
          onClick={() => setActiveTab('observatory')}
          className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all ${
            activeTab === 'observatory'
              ? 'text-terracotta-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Camera className={`w-5 h-5 ${activeTab === 'observatory' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">Terrain</span>
        </button>

      </div>
    </div>
  );
};
