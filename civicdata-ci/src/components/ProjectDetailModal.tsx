import React from 'react';
import { BudgetProject, CitizenProof } from '../types';
import { formatFCFA, formatDateFR, getStatusConfig } from '../utils/formatters';
import { 
  X, 
  MapPin, 
  Building, 
  Calendar, 
  Briefcase, 
  Camera, 
  Share2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ExternalLink,
  ThumbsUp
} from 'lucide-react';
import { dataStore } from '../services/dataStore';

interface ProjectDetailModalProps {
  project: BudgetProject | null;
  onClose: () => void;
  onOpenSendProof: (project: BudgetProject) => void;
  onOpenShare: (project: BudgetProject) => void;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  project,
  onClose,
  onOpenSendProof,
  onOpenShare,
}) => {
  if (!project) return null;

  const status = getStatusConfig(project.current_status);
  const proofs = dataStore.getProofsForProject(project.id);

  const handleConfirmProof = (proofId: string) => {
    dataStore.confirmProof(proofId);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
      
      {/* Modal Container */}
      <div 
        className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-navy-900 text-white flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-navy-800 text-terracotta-400 border border-navy-700">
                {project.category}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-navy-800 text-slate-300">
                Exercice Budgétaire {project.fiscal_year || 2026}
              </span>
            </div>

            <h2 className="text-lg sm:text-2xl font-extrabold tracking-tight leading-snug">
              {project.title}
            </h2>

            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-300 mt-2">
              <MapPin className="w-4 h-4 text-terracotta-400 flex-shrink-0" />
              <span className="font-semibold text-white">{project.commune_name}</span>
              <span>•</span>
              <span>{project.region_name}</span>
              {project.locality_village_neighborhood && (
                <>
                  <span>•</span>
                  <span className="text-terracotta-300 font-medium">{project.locality_village_neighborhood}</span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-navy-800 hover:bg-navy-700 text-slate-300 hover:text-white transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          
          {/* BUDGET & STATUS HIGHLIGHT BOX */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Box 1: Budget Voté (Grand Format) */}
            <div className="bg-gradient-to-br from-navy-900 to-navy-950 text-white p-5 rounded-2xl shadow-md border border-navy-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                  Budget Public Alloué
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1 font-sans">
                  {formatFCFA(project.budget_amount_fcfa)}
                </div>
              </div>
              <div className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-navy-800/80 flex items-center justify-between">
                <span>Source officielle</span>
                <span className="font-semibold text-slate-200">{project.source || 'Loi de Finances 2026'}</span>
              </div>
            </div>

            {/* Box 2: Statut Terrain & Barre d'avancement */}
            <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                    Statut Constaté
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${status.badgeClass}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${status.dotClass}`}></span>
                    <span>{status.label}</span>
                  </span>
                </div>
                
                <div className="mt-3">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                    <span>Progression physique</span>
                    <span>{project.progress_percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${status.progressColor} transition-all duration-700`}
                      style={{ width: `${Math.max(project.progress_percentage || 5, 5)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-200 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Mis à jour pour l'exercice 2026</span>
              </div>
            </div>

          </div>

          {/* PROJECT KEY METADATA */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
            <h4 className="text-sm font-bold text-navy-900 uppercase tracking-wider mb-3">
              Informations Détaillées du Projet
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2.5">
                <Building className="w-4 h-4 text-terracotta-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-xs text-slate-500 block">Autorité Responsable / Maître d'Ouvrage</span>
                  <span className="font-semibold text-slate-800">
                    {project.institution_name || `Mairie de ${project.commune_name}`}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Briefcase className="w-4 h-4 text-terracotta-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-xs text-slate-500 block">Nature de la Dépense</span>
                  <span className="font-semibold text-slate-800">
                    {project.sub_nature_expense || project.nature_expense}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Briefcase className="w-4 h-4 text-terracotta-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-xs text-slate-500 block">Prestataire / Entreprise</span>
                  <span className="font-semibold text-slate-800">
                    {project.contractor_name || 'Marché public en cours d\'exécution'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-terracotta-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-xs text-slate-500 block">Détails d'exécution</span>
                  <span className="font-semibold text-slate-800">
                    {project.details || 'Travaux d\'infrastructures publiques prioritaires'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ZONE D'ACTION CITOYENNE (CTA) */}
          <div className="bg-gradient-to-r from-terracotta-50 via-amber-50 to-orange-50 rounded-2xl border border-terracotta-200 p-4 sm:p-5">
            <h4 className="text-base font-extrabold text-navy-900 mb-1 flex items-center gap-2">
              <span>📸 Zone d'Action & de Contrôle Citoyen</span>
            </h4>
            <p className="text-xs text-slate-700 mb-4 leading-relaxed">
              Vous habitez dans cette localité ? Aidez la communauté à vérifier l'effectivité des travaux en envoyant une photo du chantier ou en partageant la fiche pour alerter vos voisins.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={() => onOpenSendProof(project)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-700/20 transition-all"
              >
                <Camera className="w-4 h-4" />
                <span>J'habite ici : Envoyer une photo / preuve</span>
              </button>

              <button
                onClick={() => onOpenShare(project)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-terracotta-500 hover:bg-terracotta-600 active:scale-98 text-white rounded-xl text-sm font-bold shadow-md shadow-terracotta-500/20 transition-all"
              >
                <Share2 className="w-4 h-4" />
                <span>Partager sur WhatsApp / Réseaux</span>
              </button>
            </div>
          </div>

          {/* HISTORIQUE DES PREUVES DU TERRAIN */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-base font-bold text-navy-900 flex items-center gap-2">
                <span>Preuves & Signalements Citoyens</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-navy-100 text-navy-900">
                  {proofs.length}
                </span>
              </h4>
            </div>

            {proofs.length === 0 ? (
              <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">Aucune photo citoyenne pour le moment</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Soyez le premier citoyen à envoyer une photo de ce chantier pour alimenter l'Observatoire !
                </p>
                <button
                  onClick={() => onOpenSendProof(project)}
                  className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Ajouter une photo maintenant</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {proofs.map((proof) => (
                  <div 
                    key={proof.id}
                    className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 sm:gap-4"
                  >
                    {/* Proof Image */}
                    <div className="w-full sm:w-36 h-36 sm:h-28 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 relative group">
                      <img 
                        src={proof.image_url} 
                        alt="Preuve chantier" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80';
                        }}
                      />
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-bold">
                        Vérifiée ✓
                      </span>
                    </div>

                    {/* Proof Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-bold text-slate-800">
                            {proof.citizen_name || 'Citoyen vérificateur'}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {formatDateFR(proof.created_at)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed italic">
                          "{proof.comment}"
                        </p>

                        {proof.locality_details && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1.5">
                            <MapPin className="w-3 h-3 text-terracotta-500" />
                            <span>{proof.locality_details}</span>
                          </div>
                        )}
                      </div>

                      {/* Confirmations & Status Badge */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${getStatusConfig(proof.citizen_status_claim).badgeClass}`}>
                          <span>Constaté :</span>
                          <span>{getStatusConfig(proof.citizen_status_claim).label}</span>
                        </span>

                        <button
                          onClick={() => handleConfirmProof(proof.id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>Confirmer ({proof.confirmations_count})</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Identifiant Projet : <code className="bg-slate-200 px-1 py-0.5 rounded">{project.id}</code>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
