import React, { useState, useRef } from 'react';
import { BudgetProject, ProjectStatus } from '../types';
import { dataStore } from '../services/dataStore';
import { 
  X, 
  Camera, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  MapPin, 
  Sparkles, 
  Image as ImageIcon 
} from 'lucide-react';

interface SendProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetProject?: BudgetProject | null;
  onSuccessToast?: (msg: string) => void;
}

export const SendProofModal: React.FC<SendProofModalProps> = ({
  isOpen,
  onClose,
  targetProject,
  onSuccessToast,
}) => {
  if (!isOpen) return null;

  const projects = dataStore.getProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    targetProject ? targetProject.id : (projects[0]?.id || '')
  );
  const [citizenStatus, setCitizenStatus] = useState<ProjectStatus>('IN_PROGRESS');
  const [comment, setComment] = useState('');
  const [locality, setLocality] = useState(targetProject?.locality_village_neighborhood || '');
  const [citizenName, setCitizenName] = useState('');
  const [previewImage, setPreviewImage] = useState<string>(
    'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sample photo choices for rapid testing
  const samplePhotos = [
    {
      label: 'Chantier en cours',
      url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80',
    },
    {
      label: 'Forage / Hydraulique',
      url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
    },
    {
      label: 'Bâtiment neuf livré',
      url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=800&q=80',
    },
    {
      label: 'Terrain vierge',
      url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
    },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !comment.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      dataStore.submitProof({
        project_id: selectedProjectId,
        image_url: previewImage,
        citizen_status_claim: citizenStatus,
        comment: comment.trim(),
        locality_details: locality.trim(),
        citizen_name: citizenName.trim() || 'Citoyen vérificateur',
      });

      setIsSubmitting(false);
      setShowSuccess(true);

      if (onSuccessToast) {
        onSuccessToast('Votre preuve citoyenne a été transmise avec succès !');
      }

      setTimeout(() => {
        setShowSuccess(false);
        onClose();
        setComment('');
      }, 1500);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
      
      <div 
        className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-navy-900 to-navy-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                Envoyer une preuve citoyenne
              </h3>
              <p className="text-xs text-slate-400">
                Formulaire en 3 champs pour vérifier un chantier
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-navy-800 hover:bg-navy-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Confirmation State */}
        {showSuccess ? (
          <div className="p-8 text-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-extrabold text-navy-900">
              Signalement publié avec succès !
            </h4>
            <p className="text-sm text-slate-600 max-w-sm mx-auto">
              Merci pour votre engagement citoyen. Votre photo est enregistrée et sera soumise à vérification pour l'Observatoire Terrain.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5">
            
            {/* Field 0: Project Target Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                1. Projet d'infrastructure concerné
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  const p = projects.find(proj => proj.id === e.target.value);
                  if (p?.locality_village_neighborhood) {
                    setLocality(p.locality_village_neighborhood);
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              >
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    [{proj.commune_name}] {proj.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Field 1: Photo / Media Upload & Live Preview */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  2. Photo du chantier (Caméra ou Galerie)
                </label>
                <span className="text-[11px] text-emerald-600 font-medium">Prévisualisation en direct</span>
              </div>

              {/* Image Preview Box */}
              <div className="relative w-full h-44 sm:h-48 rounded-2xl overflow-hidden bg-slate-900 border-2 border-dashed border-slate-300 group">
                <img 
                  src={previewImage} 
                  alt="Aperçu photo" 
                  className="w-full h-full object-cover"
                />
                
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-white text-navy-900 rounded-xl text-xs font-bold shadow-md hover:bg-slate-100 flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Changer photo</span>
                  </button>
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  capture="environment"
                  onChange={handleFileChange} 
                  className="hidden" 
                />

                <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center px-2 py-1 bg-black/60 rounded-lg backdrop-blur-sm text-white text-[10px]">
                  <span>Preuve géolocalisée</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="underline text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    Sélectionner un fichier
                  </button>
                </div>
              </div>

              {/* Sample Photo Presets for Easy Demo */}
              <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                <span className="text-slate-400 text-[10px] uppercase font-bold flex-shrink-0">Exemples rapides :</span>
                {samplePhotos.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPreviewImage(s.url)}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg whitespace-nowrap text-[11px] font-medium border border-slate-200"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Field 2: Status Observed by Citizen */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                3. Statut constaté sur le terrain
              </label>

              <div className="grid grid-cols-3 gap-2">
                {/* Status 1: Not started */}
                <button
                  type="button"
                  onClick={() => setCitizenStatus('NOT_STARTED')}
                  className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                    citizenStatus === 'NOT_STARTED'
                      ? 'bg-red-50 border-red-500 text-red-800 ring-2 ring-red-400/30 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-base">🔴</span>
                  <span className="text-[11px] leading-tight">Pas encore démarré</span>
                </button>

                {/* Status 2: In progress */}
                <button
                  type="button"
                  onClick={() => setCitizenStatus('IN_PROGRESS')}
                  className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                    citizenStatus === 'IN_PROGRESS'
                      ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-400/30 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-base">🟡</span>
                  <span className="text-[11px] leading-tight">En chantier</span>
                </button>

                {/* Status 3: Completed */}
                <button
                  type="button"
                  onClick={() => setCitizenStatus('COMPLETED')}
                  className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                    citizenStatus === 'COMPLETED'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-400/30 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-base">🟢</span>
                  <span className="text-[11px] leading-tight">Livré & Équipé</span>
                </button>
              </div>
            </div>

            {/* Field 3: Short Comment */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                4. Commentaire de constatation (Court et précis)
              </label>
              <textarea
                rows={3}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ex: Les fondations et les murs sont sortis de terre, mais pas encore de charpente..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white resize-none"
              />
            </div>

            {/* Optional Citizen Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Précision de lieu / Village
                </label>
                <input
                  type="text"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  placeholder="Ex: Bakro, à côté de l'école"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Votre nom / pseudo (facultatif)
                </label>
                <input
                  type="text"
                  value={citizenName}
                  onChange={(e) => setCitizenName(e.target.value)}
                  placeholder="Ex: Kouamé N."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !comment.trim()}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed active:scale-98 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>{isSubmitting ? 'Envoi en cours...' : 'Publier le signalement citoyen'}</span>
              </button>
              <p className="text-[11px] text-center text-slate-500 mt-2">
                Votre signalement sera visible par la communauté et vérifié par les modérateurs.
              </p>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
