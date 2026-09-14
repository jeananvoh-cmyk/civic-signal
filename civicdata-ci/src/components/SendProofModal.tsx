import React, { useState, useRef, useMemo, useEffect } from 'react';
import { BudgetProject, ProjectStatus } from '../types';
import { validateImageBinary, validateVideoBinary, compressAndSanitizeImage, sanitizeCoordinates } from '../utils/security';
import { dataStore } from '../services/dataStore';
import { formatFCFA, formatAmountInWords } from '../utils/formatters';
import { matchesSmartSearch } from '../utils/searchHelpers';
import { 
  X, 
  Camera, 
  Video, 
  Upload, 
  CheckCircle2, 
  MapPin, 
  AlertTriangle,
  ShieldCheck,
  Scale,
  Calendar,
  User,
  Phone,
  FileCheck2,
  Info,
  Search,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Navigation,
  Trash2,
  Check,
  Image as ImageIcon,
  Building2,
  Landmark,
  HardHat,
  Play,
  MessageCircle,
  Copy
} from 'lucide-react';

const FREQUENT_CITIES = [
  'Abidjan',
  'Bouaké',
  'Yamoussoukro',
  'Korhogo',
  'Daloa',
  'San-Pédro',
  'Man',
  'Gagnoa',
  'Grand-Bassam'
];

const QUICK_OBSERVATIONS = [
  "Ouvriers actifs sur le site et travaux en progression constante",
  "Gros œuvre terminé, travaux de second œuvre en cours",
  "Chantier temporairement à l'arrêt, aucun ouvrier visible",
  "Ouvrage entièrement achevé, peint et prêt à être inauguré",
  "Panneau officiel de chantier présent avec le budget mentionné"
];

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
  
  // Wizard Step: 1 = Chantier & Statut, 2 = Photo/Vidéo & Lieu, 3 = Témoignage & Envoi
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Selected project state
  const [selectedProject, setSelectedProject] = useState<BudgetProject | null>(
    targetProject || null
  );
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [isChangingProject, setIsChangingProject] = useState(false);

  // Form Fields
  const [citizenStatus, setCitizenStatus] = useState<ProjectStatus>('IN_PROGRESS');
  const [comment, setComment] = useState('');
  const [locality, setLocality] = useState(targetProject?.locality_village_neighborhood || '');
  const [citizenName, setCitizenName] = useState('');
  const [citizenContact, setCitizenContact] = useState('');
  const [observationDate, setObservationDate] = useState(new Date().toISOString().slice(0, 10));
  const [isSwornCertified, setIsSwornCertified] = useState(true);
  
  // Media Type: IMAGE or VIDEO
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [signboardStatus, setSignboardStatus] = useState<'PRESENT' | 'ABSENT' | 'UNSPECIFIED'>('PRESENT');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewSecondaryImage, setPreviewSecondaryImage] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const [citizenWhatsApp, setCitizenWhatsApp] = useState('');
  const [createdTrackingCode, setCreatedTrackingCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  
  // Anti-bot & Security
  const [honeypotValue, setHoneypotValue] = useState('');
  const formOpenedAtRef = useRef<number>(Date.now());
  
  // UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsSuccess, setGpsSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const secondaryFileInputRef = useRef<HTMLInputElement>(null);
  const secondaryCameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoRecordRef = useRef<HTMLInputElement>(null);

  const DRAFT_KEY = 'suivibudget_proof_draft';
  const [hasDraftRestored, setHasDraftRestored] = useState(false);

  // Reset when modal opens with targetProject
  useEffect(() => {
    if (targetProject) {
      setSelectedProject(targetProject);
      setLocality(targetProject.locality_village_neighborhood || `${targetProject.commune_name}, Région ${targetProject.region_name}`);
      setIsChangingProject(false);
    }
  }, [targetProject]);

  // Restore draft when modal opens without a specific targetProject
  useEffect(() => {
    if (targetProject) return;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.projectId) {
          const found = projects.find((p) => p.id === draft.projectId);
          if (found) setSelectedProject(found);
        }
        if (draft.citizenStatus) setCitizenStatus(draft.citizenStatus);
        if (draft.comment) setComment(draft.comment);
        if (draft.locality) setLocality(draft.locality);
        if (draft.observationDate) setObservationDate(draft.observationDate);
        if (draft.citizenName) setCitizenName(draft.citizenName);
        if (draft.citizenContact) setCitizenContact(draft.citizenContact);
        setHasDraftRestored(true);
      }
    } catch (e) {
      console.warn('Erreur lecture brouillon:', e);
    }
  }, [targetProject, projects]);

  // Auto-save draft on changes to survive network loss or accidental closure
  useEffect(() => {
    if (targetProject) return;
    if (!comment && !locality && !citizenName && !selectedProject) return;

    try {
      const draft = {
        projectId: selectedProject?.id,
        citizenStatus,
        comment,
        locality,
        observationDate,
        citizenName,
        citizenContact,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Ignore localStorage quotas
    }
  }, [targetProject, selectedProject, citizenStatus, comment, locality, observationDate, citizenName, citizenContact]);

  const handleClearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    setHasDraftRestored(false);
    setSelectedProject(null);
    setComment('');
    setLocality('');
    setCitizenName('');
    setCitizenContact('');
    setCitizenStatus('IN_PROGRESS');
  };

  // Filter projects for search in step 1
  const searchResults = useMemo(() => {
    if (!projectSearchQuery.trim()) {
      return projects.slice(0, 8);
    }
    return projects
      .filter((p) =>
        matchesSmartSearch(
          [p.title, p.commune_name, p.region_name, p.category, p.locality_village_neighborhood, p.ministry_name],
          projectSearchQuery
        )
      )
      .slice(0, 12);
  }, [projects, projectSearchQuery]);

  // Handle Photo Selection
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setErrorMessage(null);
      setIsProcessingMedia(true);

      // 1. Validate binary signature
      const validation = await validateImageBinary(file);
      if (!validation.isValid) {
        setErrorMessage(validation.error || "Fichier d'image non valide.");
        setIsProcessingMedia(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
        return;
      }

      try {
        // 2. Compress and sanitize via Canvas
        const sanitizedDataUrl = await compressAndSanitizeImage(file);
        setPreviewImage(sanitizedDataUrl);
        setPreviewVideo(null);
        setMediaType('IMAGE');
      } catch (err: any) {
        setErrorMessage("Erreur lors du traitement de l'image : " + (err.message || ''));
      } finally {
        setIsProcessingMedia(false);
      }
    }
  };

  // Handle Secondary Photo Selection (Signboard or Landmark)
  const handleSecondaryPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setErrorMessage(null);
      setIsProcessingMedia(true);

      const validation = await validateImageBinary(file);
      if (!validation.isValid) {
        setErrorMessage(validation.error || "Fichier d'image secondaire non valide.");
        setIsProcessingMedia(false);
        if (secondaryFileInputRef.current) secondaryFileInputRef.current.value = '';
        if (secondaryCameraInputRef.current) secondaryCameraInputRef.current.value = '';
        return;
      }

      try {
        const sanitizedDataUrl = await compressAndSanitizeImage(file);
        setPreviewSecondaryImage(sanitizedDataUrl);
      } catch (err: any) {
        setErrorMessage("Erreur lors du traitement de l'image secondaire : " + (err.message || ''));
      } finally {
        setIsProcessingMedia(false);
      }
    }
  };

  // Handle Video Selection (15-30s direct short video)
  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setErrorMessage(null);
      setIsProcessingMedia(true);
      
      // 1. Binary validation
      const validation = await validateVideoBinary(file);
      if (!validation.isValid) {
        setErrorMessage(validation.error || "Fichier vidéo non valide.");
        setIsProcessingMedia(false);
        if (videoInputRef.current) videoInputRef.current.value = '';
        if (videoRecordRef.current) videoRecordRef.current.value = '';
        return;
      }

      try {
        const videoUrl = URL.createObjectURL(file);
        setPreviewVideo(videoUrl);
        setPreviewImage('https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80'); // Thumbnail fallback
        setMediaType('VIDEO');
      } catch (err: any) {
        setErrorMessage("Erreur lors de la lecture de la vidéo : " + (err.message || ''));
      } finally {
        setIsProcessingMedia(false);
      }
    }
  };

  // Geolocation helper with Privacy by Design (Truncated to ~100m radius)
  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setErrorMessage("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    setIsLocating(true);
    setErrorMessage(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const { lat, lng } = sanitizeCoordinates(latitude, longitude);
        const coordsStr = `Position GPS : ${lat.toFixed(3)}°N, ${Math.abs(lng).toFixed(3)}°O`;
        setLocality((prev) => (prev ? `${prev} • ${coordsStr}` : coordsStr));
        setIsLocating(false);
        setGpsSuccess(true);
        setTimeout(() => setGpsSuccess(false), 3000);
      },
      () => {
        setIsLocating(false);
        setErrorMessage("Impossible d'obtenir la position GPS actuelle. Vous pouvez saisir le repère manuellement.");
      },
      { timeout: 8000 }
    );
  };

  // Step 1 Validation
  const handleStep1Next = () => {
    setErrorMessage(null);
    if (!selectedProject) {
      setErrorMessage("Veuillez sélectionner le chantier ou investissement concerné.");
      return;
    }
    if (!locality) {
      setLocality(selectedProject.locality_village_neighborhood || `${selectedProject.commune_name}, Région ${selectedProject.region_name}`);
    }
    setCurrentStep(2);
  };

  // Step 2 Validation
  const handleStep2Next = () => {
    setErrorMessage(null);
    if (mediaType === 'IMAGE' && !previewImage) {
      setErrorMessage("Veuillez prendre ou téléverser une photo du chantier pour documenter votre constat.");
      return;
    }
    if (mediaType === 'VIDEO' && !previewVideo) {
      setErrorMessage("Veuillez filmer ou téléverser une courte vidéo (15-30s) du chantier.");
      return;
    }
    if (!locality.trim()) {
      setErrorMessage("Veuillez préciser le quartier, la rue ou le repère géographique du chantier.");
      return;
    }
    setCurrentStep(3);
  };

  // Final Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Anti-bot check: Honeypot
    if (honeypotValue.trim()) {
      console.warn("Automated bot submission prevented via honeypot.");
      setShowSuccess(true);
      return;
    }

    // Anti-bot check: Submissions under 1.2 seconds
    if (Date.now() - formOpenedAtRef.current < 1200) {
      console.warn("Automated bot submission prevented via time-to-submit check.");
      setShowSuccess(true);
      return;
    }

    if (!selectedProject) {
      setErrorMessage("Aucun chantier sélectionné.");
      setCurrentStep(1);
      return;
    }

    if (!previewImage && !previewVideo) {
      setErrorMessage("Veuillez joindre une photographie ou une vidéo du chantier.");
      setCurrentStep(2);
      return;
    }

    if (!isSwornCertified) {
      setErrorMessage("Vous devez certifier sur l'honneur l'authenticité de votre constat.");
      return;
    }

    if (!comment.trim() || comment.trim().length < 8) {
      setErrorMessage("Veuillez rédiger une brève description de votre observation (au moins 8 caractères).");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const newProof = dataStore.submitProof({
        project_id: selectedProject.id,
        image_url: previewImage || 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80',
        secondary_image_url: previewSecondaryImage || undefined,
        video_url: previewVideo || undefined,
        media_type: mediaType,
        citizen_status_claim: citizenStatus,
        comment: comment.trim(),
        locality_details: locality.trim(),
        citizen_name: citizenName.trim() || 'Citoyen Observateur',
        citizen_whatsapp: citizenWhatsApp.trim() || citizenContact.trim() || undefined,
        signboard_status: signboardStatus,
      });

      setCreatedTrackingCode(newProof.tracking_code || 'CST-CI-2026');

      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
      setHasDraftRestored(false);

      setIsSubmitting(false);
      setShowSuccess(true);

      if (onSuccessToast) {
        onSuccessToast(mediaType === 'VIDEO' ? 'Votre vidéo de constat a été transmise aux modérateurs pour certification terrain.' : 'Votre constat citoyen a été transmis aux modérateurs pour certification terrain.');
      }
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200/90 overflow-hidden my-auto max-h-[94vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* ========================================================= */}
        {/* 1. HEADER ÉPURÉ & BARRE DE PROGRESSION EN 3 ÉTAPES       */}
        {/* ========================================================= */}
        <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-orange/10 text-brand-orange flex items-center justify-center flex-shrink-0">
                {mediaType === 'VIDEO' ? <Video className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Déposer un Constat Terrain
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Contrôle citoyen des chantiers & investissements publics (Photo & Vidéo 15-30s)
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Wizard Bar */}
          {!showSuccess && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span className={currentStep === 1 ? 'text-brand-orange font-black' : currentStep > 1 ? 'text-emerald-700' : ''}>
                  1. Le Chantier & Statut
                </span>
                <span className={currentStep === 2 ? 'text-brand-orange font-black' : currentStep > 2 ? 'text-emerald-700' : ''}>
                  2. Photo / Vidéo & Lieu
                </span>
                <span className={currentStep === 3 ? 'text-brand-orange font-black' : ''}>
                  3. Observations & Envoi
                </span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-brand-orange h-full rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / 3) * 100}%` }}
                />
              </div>

              {hasDraftRestored && !targetProject && (
                <div className="mt-2.5 px-3 py-1.5 bg-amber-50 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs text-amber-800">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    Brouillon non envoyé restauré
                  </span>
                  <button
                    type="button"
                    onClick={handleClearDraft}
                    className="font-bold text-amber-700 hover:text-amber-900 underline ml-2"
                  >
                    Effacer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 2. BODY DU FORMULAIRE SELON L'ÉTAPE ACTUELLE            */}
        {/* ========================================================= */}
        {showSuccess ? (
          /* SUCCESS STATE */
          <div className="p-8 sm:p-12 text-center space-y-5 my-auto">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            
            <div>
              <h4 className="text-2xl font-black text-slate-900 tracking-tight">
                Constat Transmis avec Succès !
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
                Votre contribution citoyenne a été transmise aux modérateurs pour vérification terrain avant publication.
              </p>
            </div>

            {/* Tracking Code Card */}
            {createdTrackingCode && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl max-w-md mx-auto space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  Votre Identifiant Unique de Suivi
                </span>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg sm:text-xl font-mono font-black text-brand-blue tracking-wide bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                    {createdTrackingCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (createdTrackingCode) {
                        navigator.clipboard.writeText(createdTrackingCode);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }
                    }}
                    className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                    title="Copier le code"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10.5px] text-slate-500">
                  Conservez cet identifiant pour tout échange ou réclamation auprès de l'Observatoire.
                </p>
              </div>
            )}

            {citizenWhatsApp && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-center gap-2 max-w-md mx-auto">
                <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Notification WhatsApp activée pour le <strong>{citizenWhatsApp}</strong> dès validation.
                </span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-8 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold shadow-md transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
            
            {/* Error Message Box */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2.5 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* ÉTAPE 1 : CHOIX DU CHANTIER & ÉTAT RÉEL CONSTATÉ             */}
            {/* ------------------------------------------------------------- */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                
                {/* 1. Project Selection */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                      Chantier ou Investissement Public *
                    </label>
                    {selectedProject && !isChangingProject && (
                      <button
                        type="button"
                        onClick={() => setIsChangingProject(true)}
                        className="text-xs font-bold text-brand-blue hover:underline"
                      >
                        Changer de chantier
                      </button>
                    )}
                  </div>

                  {selectedProject && !isChangingProject ? (
                    /* Selected Project Card */
                    <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-brand-blue text-white text-[10px] font-black uppercase tracking-wider">
                          {selectedProject.category}
                        </span>
                        <span className="text-xs font-black text-slate-900">
                          {formatFCFA(selectedProject.budget_amount_fcfa)}
                        </span>
                      </div>
                      <h4 className="font-black text-slate-900 text-sm leading-snug">
                        {selectedProject.title}
                      </h4>
                      <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-brand-orange" />
                          {selectedProject.commune_name || selectedProject.region_name} (Région {selectedProject.region_name})
                        </span>
                        <span>•</span>
                        <span className="text-slate-500 font-semibold">
                          {selectedProject.ministry_name || 'Collectivité Territoriale'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Instant Search Engine for 7,162 projects */
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          type="text"
                          autoFocus
                          placeholder="Rechercher par commune, mot-clé (ex: Bouaké route, Abobo lycée, forage...)"
                          value={projectSearchQuery}
                          onChange={(e) => setProjectSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-blue/30 font-medium"
                        />
                      </div>

                      {/* Frequent City Filters */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                        <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Villes :</span>
                        {FREQUENT_CITIES.map((city) => (
                          <button
                            key={city}
                            type="button"
                            onClick={() => setProjectSearchQuery(city)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold whitespace-nowrap transition-colors"
                          >
                            {city}
                          </button>
                        ))}
                      </div>

                      {/* Search Results List */}
                      <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 bg-white shadow-2xs">
                        {searchResults.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-500">
                            Aucun chantier trouvé pour cette recherche. Essayez un autre nom de ville ou de commune.
                          </div>
                        ) : (
                          searchResults.map((p) => (
                            <div
                              key={p.id}
                              onClick={() => {
                                setSelectedProject(p);
                                setLocality(p.locality_village_neighborhood || `${p.commune_name}, Région ${p.region_name}`);
                                setIsChangingProject(false);
                              }}
                              className="p-3 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                            >
                              <div className="space-y-1">
                                <div className="text-xs font-bold text-slate-900 group-hover:text-brand-blue line-clamp-1">
                                  {p.title}
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                  <span className="font-semibold text-slate-700">{p.commune_name || p.region_name}</span>
                                  <span>•</span>
                                  <span>{p.category}</span>
                                  <span>•</span>
                                  <span className="font-bold text-brand-blue">{formatFCFA(p.budget_amount_fcfa)}</span>
                                </div>
                              </div>
                              <span className="px-2.5 py-1 bg-slate-100 group-hover:bg-brand-blue group-hover:text-white rounded-lg text-[11px] font-bold text-slate-600 transition-colors flex-shrink-0">
                                Choisir
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Real Status Selection on Ground */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                    État d'avancement réel constaté sur le terrain *
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    
                    {/* Status 1: Not Started */}
                    <button
                      type="button"
                      onClick={() => setCitizenStatus('NOT_STARTED')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-2 ${
                        citizenStatus === 'NOT_STARTED'
                          ? 'bg-rose-50/70 border-rose-500 text-rose-900 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                        {citizenStatus === 'NOT_STARTED' && <Check className="w-4 h-4 text-rose-600" />}
                      </div>
                      <div>
                        <div className="text-xs font-black">Non démarré</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Terrain vierge / Aucun ouvrier</div>
                      </div>
                    </button>

                    {/* Status 2: In Progress */}
                    <button
                      type="button"
                      onClick={() => setCitizenStatus('IN_PROGRESS')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-2 ${
                        citizenStatus === 'IN_PROGRESS'
                          ? 'bg-amber-50/70 border-amber-500 text-amber-900 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                        {citizenStatus === 'IN_PROGRESS' && <Check className="w-4 h-4 text-amber-600" />}
                      </div>
                      <div>
                        <div className="text-xs font-black">En cours d'exécution</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Travaux actifs / Chantier en cours</div>
                      </div>
                    </button>

                    {/* Status 3: Completed */}
                    <button
                      type="button"
                      onClick={() => setCitizenStatus('COMPLETED')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-2 ${
                        citizenStatus === 'COMPLETED'
                          ? 'bg-emerald-50/70 border-emerald-500 text-emerald-900 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                        {citizenStatus === 'COMPLETED' && <Check className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <div>
                        <div className="text-xs font-black">Terminé & Livré</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Ouvrage achevé / Opérationnel</div>
                      </div>
                    </button>

                  </div>
                </div>

                {/* Step 1 Actions */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleStep1Next}
                    disabled={!selectedProject}
                    className="px-6 py-2.5 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-full text-xs font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Continuer : Ajouter photo / vidéo</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* ÉTAPE 2 : PHOTO OU VIDÉO RÉELLE & LOCALISATION               */}
            {/* ------------------------------------------------------------- */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                
                {/* Media Type Switcher: Photo vs Short Video */}
                <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 max-w-sm">
                  <button
                    type="button"
                    onClick={() => setMediaType('IMAGE')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      mediaType === 'IMAGE'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5 text-brand-orange" />
                    <span>Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMediaType('VIDEO')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      mediaType === 'VIDEO'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5 text-brand-blue" />
                    <span>Vidéo (15-30s)</span>
                  </button>
                </div>

                {/* Signboard Status Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                    Affichage légal & Panneau de chantier *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSignboardStatus('PRESENT')}
                      className={`p-3 rounded-2xl border-2 text-left transition-all flex items-center gap-3 cursor-pointer ${
                        signboardStatus === 'PRESENT'
                          ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        signboardStatus === 'PRESENT' ? 'bg-emerald-500 text-white' : 'border border-slate-300'
                      }`}>
                        {signboardStatus === 'PRESENT' && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold">Panneau officiel visible</div>
                        <div className="text-[10.5px] text-slate-500">Panneau d'information présent sur le site</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSignboardStatus('ABSENT')}
                      className={`p-3 rounded-2xl border-2 text-left transition-all flex items-center gap-3 cursor-pointer ${
                        signboardStatus === 'ABSENT'
                          ? 'bg-amber-50/70 border-amber-500 text-amber-950 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        signboardStatus === 'ABSENT' ? 'bg-amber-500 text-white' : 'border border-slate-300'
                      }`}>
                        {signboardStatus === 'ABSENT' && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold">Aucun panneau officiel</div>
                        <div className="text-[10.5px] text-slate-500">Photographiez un repère fixe ou un engin</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Pedagogical Hint */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 flex items-start gap-3 shadow-2xs">
                  <div className="w-7 h-7 rounded-xl bg-blue-100 text-brand-blue flex items-center justify-center flex-shrink-0 mt-0.5 text-sm font-bold">
                    ℹ️
                  </div>
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900">
                      {signboardStatus === 'PRESENT'
                        ? "Photographiez le panneau officiel si possible"
                        : "Absence de panneau d'information (Défaut d'affichage légal)"}
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11.5px]">
                      {signboardStatus === 'PRESENT'
                        ? "Le panneau mentionne obligatoirement l'entreprise, le budget et le délai contractuel d'exécution."
                        : "Votre constat permettra de documenter l'absence de panneau obligatoire. Photographiez l'ouvrage, un engin identifiable ou un bâtiment voisin."}
                    </p>
                  </div>
                </div>

                {/* Hidden File Inputs */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoChange}
                  accept="image/*"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={cameraInputRef}
                  onChange={handlePhotoChange}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={secondaryFileInputRef}
                  onChange={handleSecondaryPhotoChange}
                  accept="image/*"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={secondaryCameraInputRef}
                  onChange={handleSecondaryPhotoChange}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={videoInputRef}
                  onChange={handleVideoChange}
                  accept="video/mp4,video/webm,video/quicktime,video/*"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={videoRecordRef}
                  onChange={handleVideoChange}
                  accept="video/*"
                  capture="environment"
                  className="hidden"
                />

                {/* 1. PHOTO MODE */}
                {mediaType === 'IMAGE' && (
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                      Photographie authentique du chantier *
                    </label>

                    {previewImage && !previewVideo ? (
                      /* Image Preview */
                      <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group">
                        <img
                          src={previewImage}
                          alt="Aperçu de la photo de chantier"
                          className="w-full h-56 object-cover"
                        />
                        <div className="absolute top-3 left-3 px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-black flex items-center gap-1.5 shadow-md">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Photo validée & compressée</span>
                        </div>
                        
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            className="px-4 py-2 bg-white text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-100 flex items-center gap-1.5 shadow-md"
                          >
                            <Camera className="w-4 h-4 text-brand-orange" />
                            <span>Reprendre une photo</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewImage(null)}
                            className="p-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 shadow-md"
                            title="Supprimer la photo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Empty Image Dropzone */
                      <div className="border-2 border-dashed border-slate-200 hover:border-brand-orange/60 rounded-3xl p-6 sm:p-8 text-center bg-slate-50/60 hover:bg-slate-50 transition-all space-y-4">
                        <div className="w-14 h-14 rounded-2xl bg-orange-100 text-brand-orange flex items-center justify-center mx-auto shadow-2xs">
                          <Camera className="w-7 h-7" />
                        </div>
                        
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-slate-900">
                            Prenez ou ajoutez une photo du chantier
                          </h4>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            Prenez en photo le chantier en cours, le bâtiment ou le panneau officiel des travaux.
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                          <button
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            disabled={isProcessingMedia}
                            className="w-full sm:w-auto px-5 py-2.5 bg-brand-orange hover:bg-brand-orange-dark active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2"
                          >
                            <Camera className="w-4 h-4" />
                            <span>{isProcessingMedia ? 'Traitement...' : 'Prendre avec la caméra'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isProcessingMedia}
                            className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-2"
                          >
                            <Upload className="w-4 h-4 text-brand-blue" />
                            <span>Choisir depuis la galerie</span>
                          </button>
                        </div>

                        <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1.5 pt-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Anonymisation automatique & suppression des métadonnées privées</span>
                        </div>
                      </div>
                    )}

                    {/* 1.B SECONDARY PHOTO (SIGNBOARD OR LANDMARK) */}
                    <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-700">
                          {signboardStatus === 'PRESENT'
                            ? 'Photo 2 (Optionnelle) : Panneau officiel de chantier'
                            : 'Photo 2 (Optionnelle) : Repère géographique, bâtiment ou engin'}
                        </label>
                        <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                          Recommandé
                        </span>
                      </div>

                      {previewSecondaryImage ? (
                        <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group h-36">
                          <img
                            src={previewSecondaryImage}
                            alt="Photo complémentaire"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 left-2 px-2.5 py-0.5 bg-brand-blue text-white rounded-md text-[10px] font-bold shadow-xs">
                            {signboardStatus === 'PRESENT' ? 'Panneau officiel' : 'Repère fixe'}
                          </div>
                          <button
                            type="button"
                            onClick={() => setPreviewSecondaryImage(null)}
                            className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow"
                            title="Supprimer la photo secondaire"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => secondaryCameraInputRef.current?.click()}
                            disabled={isProcessingMedia}
                            className="flex-1 py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5 text-slate-500" />
                            <span>Ajouter via caméra</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => secondaryFileInputRef.current?.click()}
                            disabled={isProcessingMedia}
                            className="flex-1 py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5 text-slate-500" />
                            <span>Galerie</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. VIDEO MODE */}
                {mediaType === 'VIDEO' && (
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                      Séquence vidéo authentique du chantier (15 à 30 secondes) *
                    </label>

                    {previewVideo ? (
                      /* Video Preview Player */
                      <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group">
                        <video
                          src={previewVideo}
                          controls
                          className="w-full h-56 object-cover bg-black"
                        />
                        <div className="p-3 bg-slate-900 text-white flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Vidéo de terrain prête</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setPreviewVideo(null)}
                            className="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Changer la vidéo</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Empty Video Dropzone */
                      <div className="border-2 border-dashed border-slate-200 hover:border-brand-blue/60 rounded-3xl p-6 sm:p-8 text-center bg-blue-50/30 hover:bg-blue-50/50 transition-all space-y-4">
                        <div className="w-14 h-14 rounded-2xl bg-blue-100 text-brand-blue flex items-center justify-center mx-auto shadow-2xs">
                          <Video className="w-7 h-7" />
                        </div>
                        
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-slate-900">
                            Filmez ou chargez une courte vidéo de terrain
                          </h4>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            Filmez les ouvriers en activité, les engins en action ou l'état physique du chantier (15 à 30s).
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                          <button
                            type="button"
                            onClick={() => videoRecordRef.current?.click()}
                            className="w-full sm:w-auto px-5 py-2.5 bg-brand-blue hover:bg-navy-900 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2"
                          >
                            <Video className="w-4 h-4" />
                            <span>Filmer avec la caméra (15-30s)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => videoInputRef.current?.click()}
                            className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-2"
                          >
                            <Upload className="w-4 h-4 text-slate-700" />
                            <span>Choisir un fichier vidéo (MP4/WebM)</span>
                          </button>
                        </div>

                        <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1.5 pt-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Lecture directe intégrée à l'Observatoire Citoyen</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Geolocation & Date Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-8 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                        Localisation précise (Quartier, Rue, Repère) *
                      </label>
                      <button
                        type="button"
                        onClick={handleUseGps}
                        disabled={isLocating}
                        className="text-[11px] font-bold text-brand-blue hover:underline flex items-center gap-1"
                      >
                        <Navigation className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                        <span>{isLocating ? 'Géolocalisation...' : gpsSuccess ? '✓ Position ajoutée' : 'Ma position GPS'}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="Ex: Quartier Commerce, face au marché central..."
                        value={locality}
                        onChange={(e) => setLocality(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-blue/30 font-medium"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-4 space-y-1.5">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                      Date de prise de vue *
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                      <input
                        type="date"
                        required
                        value={observationDate}
                        onChange={(e) => setObservationDate(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-blue/30 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Step 2 Actions */}
                <div className="pt-4 flex items-center justify-between gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-full transition-colors flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Retour</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleStep2Next}
                    disabled={mediaType === 'IMAGE' ? !previewImage : !previewVideo}
                    className="px-6 py-2.5 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-full text-xs font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Continuer : Vos observations</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* ÉTAPE 3 : TÉMOIGNAGE, IDENTITÉ & VALIDATION RÉPUBLICAINE     */}
            {/* ------------------------------------------------------------- */}
            {currentStep === 3 && (
              <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in duration-200">
                
                {/* 1. Observation Description */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Description de votre constat sur place *
                  </label>
                  
                  {/* Quick Suggestion Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Suggestions :</span>
                    {QUICK_OBSERVATIONS.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setComment((prev) => prev ? `${prev}. ${suggestion}` : suggestion)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-medium transition-colors text-left"
                      >
                        + {suggestion}
                      </button>
                    ))}
                  </div>

                  <textarea
                    required
                    rows={3}
                    placeholder="Décrivez ce que vous avez observé sur le site (présence d'ouvriers, pose de toiture, peinture, engins sur place, ou arrêt des travaux)..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-blue/30 leading-relaxed font-medium"
                  />
                </div>

                {/* 2. Optional Citizen Identification */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                      Votre Nom ou Pseudo (Facultatif)
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Ex: Observateur Citoyen / Kouassi K."
                        value={citizenName}
                        onChange={(e) => setCitizenName(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-blue/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
                      <span>Numéro WhatsApp (Suivi)</span>
                      <span className="text-[10.5px] text-emerald-600 font-bold flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5" />
                        Alerte gratuite
                      </span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                      <input
                        type="tel"
                        placeholder="Ex: 07 01 02 03 04"
                        value={citizenWhatsApp}
                        onChange={(e) => setCitizenWhatsApp(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/30 font-medium"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Recevez la validation ou les observations des modérateurs directement sur WhatsApp.
                    </span>
                  </div>
                </div>

                {/* Invisible Anti-Bot Honeypot Field */}
                <div className="opacity-0 absolute -left-[9999px] h-0 w-0 pointer-events-none" aria-hidden="true">
                  <input
                    type="text"
                    name="form_antispam_honeypot"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypotValue}
                    onChange={(e) => setHoneypotValue(e.target.value)}
                  />
                </div>

                {/* 3. Sworn Engagement & Friendly Legal Context */}
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isSwornCertified}
                      onChange={(e) => setIsSwornCertified(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 flex-shrink-0"
                    />
                    <span className="text-xs text-emerald-950 font-semibold leading-relaxed">
                      <strong>Engagement d'Authenticité :</strong> Je certifie que cette {mediaType === 'VIDEO' ? 'vidéo' : 'photographie'} reflète fidèlement l'état réel des lieux et contribue en toute bonne foi à la transparence républicaine.
                    </span>
                  </label>
                </div>

                {/* Step 3 Actions */}
                <div className="pt-4 flex items-center justify-between gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-full transition-colors flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Retour</span>
                  </button>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting || !isSwornCertified || !comment.trim()}
                    className="px-7 py-2.5 bg-brand-orange hover:bg-brand-orange-dark active:scale-95 text-white rounded-full text-xs font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>{isSubmitting ? 'Transmission en cours...' : 'Valider & Transmettre le Constat'}</span>
                  </button>
                </div>

              </form>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
