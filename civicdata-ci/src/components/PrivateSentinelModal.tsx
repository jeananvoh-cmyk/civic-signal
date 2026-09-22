import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Trophy, Award, CheckCircle2, X, Trash2, Info, Eye, Camera } from 'lucide-react';
import { dataStore } from '../services/dataStore';

interface PrivateSentinelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSendProof: () => void;
}

export const PrivateSentinelModal: React.FC<PrivateSentinelModalProps> = ({
  isOpen,
  onClose,
  onOpenSendProof,
}) => {
  if (!isOpen) return null;

  // Local private stats stored ONLY in device's memory
  const [proofCount, setProofCount] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('civicdata_private_proof_count');
      return stored ? parseInt(stored, 10) : 1; // Default demo value 1
    } catch {
      return 1;
    }
  });

  const [confirmationsCount, setConfirmationsCount] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('civicdata_private_confirmations');
      return stored ? parseInt(stored, 10) : 3;
    } catch {
      return 3;
    }
  });

  const badges = [
    {
      id: 'b1',
      title: 'Sentinelle Débutante',
      icon: '',
      desc: '1ère photo constat transmise avec succès',
      unlocked: proofCount >= 1,
      required: 1,
    },
    {
      id: 'b2',
      title: 'Sentinelle Vigilante',
      icon: '',
      desc: '3 chantiers vérifiés sur le terrain',
      unlocked: proofCount >= 3,
      required: 3,
    },
    {
      id: 'b3',
      title: "Sentinelle d'Honneur",
      icon: '',
      desc: '5 chantiers vérifiés et confirmés',
      unlocked: proofCount >= 5,
      required: 5,
    },
    {
      id: 'b4',
      title: 'Gardien du Bien Public',
      icon: '',
      desc: '10+ chantiers vérifiés pour la communauté',
      unlocked: proofCount >= 10,
      required: 10,
    },
  ];

  const handleReset = () => {
    if (window.confirm("Voulez-vous effacer toutes vos données privées de cet appareil ? (Droit à l'oubli instantané)")) {
      localStorage.removeItem('civicdata_private_proof_count');
      localStorage.removeItem('civicdata_private_confirmations');
      setProofCount(0);
      setConfirmationsCount(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xl shadow-md">
              <ShieldCheck className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-extrabold text-amber-400">
                <Lock className="w-3 h-3" />
                <span>100% Confidentiel & Stocké sur votre appareil</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Mon Espace Sentinelle Privé
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
          
          {/* Strict Anonymity & Security Guarantee Banner */}
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 space-y-1">
              <p className="font-bold">Garantie d'Anonymat Total :</p>
              <p className="text-emerald-800 leading-relaxed font-medium">
                Vos accomplissements et badges sont stockés <strong>exclusivement dans la mémoire de votre téléphone</strong>. Aucun profil public n'est publié, votre nom n'est jamais divulgué et vous restez totalement protégé.
              </p>
            </div>
          </div>

          {/* User Private Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <span className="text-2xl font-black text-brand-orange block">{proofCount}</span>
              <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider">Constats Transmis</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <span className="text-2xl font-black text-brand-blue block">{confirmationsCount}</span>
              <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider">Votes Confirmés</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center col-span-2 sm:col-span-1">
              <span className="text-2xl font-black text-emerald-600 block">
                {badges.filter(b => b.unlocked).length} / {badges.length}
              </span>
              <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider">Badges Obtenus</span>
            </div>
          </div>

          {/* Badges Grid */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Vos Badges de Sentinelle Citoyenne</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {badges.map((b) => (
                <div
                  key={b.id}
                  className={`p-4 rounded-2xl border flex items-center gap-3 ${
                    b.unlocked
                      ? 'bg-gradient-to-r from-amber-50/50 to-white border-amber-300 shadow-2xs'
                      : 'bg-slate-50/60 border-slate-200 opacity-60'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    b.unlocked ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <Award className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-900">{b.title}</h4>
                      {b.unlocked ? (
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Débloqué
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                          {proofCount} / {b.required}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleReset}
            className="text-xs text-slate-500 hover:text-red-600 font-bold flex items-center gap-1.5 transition-colors"
            title="Effacer mes données privées de cet appareil"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Effacer mes données locales</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenSendProof();
            }}
            className="px-5 py-2.5 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-xl font-black text-xs sm:text-sm shadow-sm transition-all active:scale-95 flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            <span>Nouveau Constat Terrain</span>
          </button>
        </div>

      </div>
    </div>
  );
};
