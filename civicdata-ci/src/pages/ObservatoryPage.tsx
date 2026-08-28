import React, { useState } from 'react';
import { CitizenProof, ProjectStatus, BudgetProject } from '../types';
import { dataStore } from '../services/dataStore';
import { formatFCFA, formatDateFR, getStatusConfig } from '../utils/formatters';
import { 
  Camera, 
  MapPin, 
  ThumbsUp, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Search, 
  Filter, 
  Sparkles, 
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Image as ImageIcon
} from 'lucide-react';

interface ObservatoryPageProps {
  onOpenSendProof: (project?: BudgetProject) => void;
  onSelectProjectById: (projectId: string) => void;
}

export const ObservatoryPage: React.FC<ObservatoryPageProps> = ({
  onOpenSendProof,
  onSelectProjectById,
}) => {
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const approvedProofs = dataStore.getApprovedProofs();
  const allProjects = dataStore.getProjects();

  const filteredProofs = approvedProofs.filter((proof) => {
    const matchesSearch =
      !searchQuery ||
      (proof.project_title && proof.project_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (proof.commune_name && proof.commune_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      proof.comment.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatusFilter === 'ALL' || proof.citizen_status_claim === selectedStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleConfirm = (proofId: string) => {
    dataStore.confirmProof(proofId);
  };

  // Metrics for Budget Voté vs Avancement Constaté
  const totalVerifiedProofs = approvedProofs.length;
  const inProgressProofs = approvedProofs.filter(p => p.citizen_status_claim === 'IN_PROGRESS').length;
  const completedProofs = approvedProofs.filter(p => p.citizen_status_claim === 'COMPLETED').length;
  const notStartedProofs = approvedProofs.filter(p => p.citizen_status_claim === 'NOT_STARTED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-24">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-2">
            <Camera className="w-4 h-4 text-emerald-600" />
            <span>Module 3 • Galerie Participative & Contrôle Terrain</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-navy-900 tracking-tight font-sans">
            Observatoire Citoyen du Terrain
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Photos de chantiers prises et géolocalisées par les citoyens en Côte d'Ivoire. Confrontez le <strong>budget voté</strong> à l'<strong>avancement réel constaté</strong> sur place.
          </p>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => onOpenSendProof()}
          className="py-3 px-5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all flex-shrink-0"
        >
          <Camera className="w-4 h-4" />
          <span>Envoyer une photo / preuve</span>
        </button>
      </div>

      {/* COMPARATIVE BLOCK: BUDGET VOTE VS AVANCEMENT CONSTATÉ */}
      <div className="bg-gradient-to-br from-navy-900 to-navy-950 rounded-3xl p-5 sm:p-7 text-white shadow-xl border border-navy-800 space-y-5">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-terracotta-400 uppercase tracking-wider mb-1">
              <TrendingUp className="w-4 h-4" />
              <span>Analyse Comparative d'Impact</span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white">
              Budget Voté vs Avancement Constaté sur le Terrain
            </h3>
          </div>

          <span className="px-3 py-1 rounded-full bg-navy-800 text-slate-300 text-xs font-semibold border border-navy-700 self-start sm:self-auto">
            {totalVerifiedProofs} preuves vérifiées
          </span>
        </div>

        {/* 3 Metric Progress Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          
          {/* Box 1: En chantier */}
          <div className="p-4 rounded-2xl bg-navy-800/80 border border-navy-700/80 flex items-center justify-between">
            <div>
              <span className="text-xs text-amber-400 font-bold block">🟡 En chantier effectif</span>
              <span className="text-2xl font-extrabold text-white font-sans mt-0.5 block">{inProgressProofs}</span>
              <span className="text-[11px] text-slate-400">Travaux en cours constatés</span>
            </div>
            <div className="text-xl">🏗️</div>
          </div>

          {/* Box 2: Livré */}
          <div className="p-4 rounded-2xl bg-navy-800/80 border border-navy-700/80 flex items-center justify-between">
            <div>
              <span className="text-xs text-emerald-400 font-bold block">🟢 Terminé & Équipé</span>
              <span className="text-2xl font-extrabold text-white font-sans mt-0.5 block">{completedProofs}</span>
              <span className="text-[11px] text-slate-400">Infrastructures opérationnelles</span>
            </div>
            <div className="text-xl">✅</div>
          </div>

          {/* Box 3: Non démarré */}
          <div className="p-4 rounded-2xl bg-navy-800/80 border border-navy-700/80 flex items-center justify-between">
            <div>
              <span className="text-xs text-red-400 font-bold block">🔴 Pas encore démarré</span>
              <span className="text-2xl font-extrabold text-white font-sans mt-0.5 block">{notStartedProofs}</span>
              <span className="text-[11px] text-slate-400">Chantiers en attente</span>
            </div>
            <div className="text-xl">⏳</div>
          </div>

        </div>

      </div>

      {/* FILTERS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
        
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setSelectedStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedStatusFilter === 'ALL'
                ? 'bg-navy-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Toutes les preuves ({approvedProofs.length})
          </button>

          <button
            onClick={() => setSelectedStatusFilter('IN_PROGRESS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              selectedStatusFilter === 'IN_PROGRESS'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <span>🟡 En chantier ({inProgressProofs})</span>
          </button>

          <button
            onClick={() => setSelectedStatusFilter('COMPLETED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              selectedStatusFilter === 'COMPLETED'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <span>🟢 Livré ({completedProofs})</span>
          </button>

          <button
            onClick={() => setSelectedStatusFilter('NOT_STARTED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              selectedStatusFilter === 'NOT_STARTED'
                ? 'bg-red-600 text-white'
                : 'bg-red-50 text-red-900 border border-red-200 hover:bg-red-100'
            }`}
          >
            <span>🔴 Non démarré ({notStartedProofs})</span>
          </button>
        </div>

        {/* Search */}
        <div className="w-full sm:w-64 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrer par commune, titre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-navy-700"
          />
        </div>

      </div>

      {/* OBSERVATORY FEED (MEDIA CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProofs.map((proof) => {
          const project = allProjects.find(p => p.id === proof.project_id);
          const status = getStatusConfig(proof.citizen_status_claim);

          return (
            <div 
              key={proof.id}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all duration-200 overflow-hidden flex flex-col justify-between group"
            >
              <div>
                
                {/* Photo & Image Badge */}
                <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-900">
                  <img 
                    src={proof.image_url} 
                    alt={proof.project_title || 'Photo chantier'} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30"></div>
                  
                  {/* Status Claim Pill */}
                  <span className={`absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold shadow-md border ${status.badgeClass}`}>
                    <span className={`w-2 h-2 rounded-full ${status.dotClass}`}></span>
                    <span>{status.label}</span>
                  </span>

                  {/* Verification Check Badge */}
                  <span className="absolute top-3 right-3 px-2 py-1 bg-emerald-500 text-white rounded-lg text-[10px] font-extrabold shadow flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Vérifiée</span>
                  </span>

                  {/* Location Overlay */}
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-xs">
                    <span className="flex items-center gap-1 font-semibold truncate">
                      <MapPin className="w-3.5 h-3.5 text-terracotta-400 flex-shrink-0" />
                      <span>{proof.commune_name || 'Côte d\'Ivoire'}</span>
                      {proof.locality_details && <span className="text-slate-300 font-normal truncate">• {proof.locality_details}</span>}
                    </span>
                    <span className="text-[10px] text-slate-300 flex-shrink-0">
                      {formatDateFR(proof.created_at)}
                    </span>
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-4 sm:p-5 space-y-3">
                  
                  {/* Project Linked Title */}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">
                      Projet rattaché
                    </span>
                    <h4 
                      onClick={() => onSelectProjectById(proof.project_id)}
                      className="text-sm sm:text-base font-bold text-navy-900 line-clamp-2 cursor-pointer hover:text-terracotta-600 transition-colors"
                    >
                      {proof.project_title || project?.title || 'Projet d\'infrastructure locale'}
                    </h4>
                  </div>

                  {/* Budget comparison if linked */}
                  {project && (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Budget Voté :</span>
                      <span className="font-extrabold text-navy-900 font-sans">
                        {formatFCFA(project.budget_amount_fcfa)}
                      </span>
                    </div>
                  )}

                  {/* Citizen Testimonial Quote */}
                  <div className="text-xs text-slate-700 bg-slate-50/50 p-3 rounded-xl border border-slate-100 italic leading-relaxed">
                    "{proof.comment}"
                  </div>

                  {/* Moderator note */}
                  {proof.moderator_notes && (
                    <div className="flex items-start gap-1.5 text-[11px] text-emerald-800 bg-emerald-50/70 p-2 rounded-lg border border-emerald-200/60">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>{proof.moderator_notes}</span>
                    </div>
                  )}

                </div>

              </div>

              {/* Card Footer: Confirmations & Link */}
              <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 font-medium">
                  Par <strong>{proof.citizen_name || 'Citoyen vérificateur'}</strong>
                </span>

                <button
                  onClick={() => handleConfirm(proof.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 border border-slate-200 hover:border-emerald-300 text-xs font-bold shadow-sm transition-all"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Confirmer ({proof.confirmations_count})</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
