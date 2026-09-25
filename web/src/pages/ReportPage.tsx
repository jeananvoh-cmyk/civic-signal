import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, MapPin, Navigation, Loader2, Users, Baby, Heart, UserRound,
  ChevronDown, Plus, Minus, ArrowLeft, Camera, MessageSquare, Clock,
  LogIn, UserPlus, AlertTriangle, CheckCircle2, ShieldAlert, Layers, Link2,
  Zap, Droplets,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuartierCombobox } from "@/components/QuartierCombobox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Header from "@/components/Header";
import PhotoUpload from "@/components/PhotoUpload";
import CorroborationStatus from "@/components/CorroborationStatus";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/error-utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useIsDark } from "@/hooks/useIsDark";
import { COMMUNES, type Commune } from "@/lib/communes";
import { resolveCommune, type DetectionSource } from "@/lib/geolocation";
import { getQuartiers, normalizeQuartier } from "@/lib/quartiers";
import type { ServiceType } from "@/lib/data";
import {
  REPORT_TYPES,
  type ReportTypeId,
  type ReportTypeConfig,
} from "@/features/incidents";
import QuartierSearch from "@/components/QuartierSearch";
import OnboardingModal from "@/components/OnboardingModal";
import { reportDetailsSchema } from "@/lib/report-schema";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/constants";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { cn } from "@/lib/utils";
import { PadaAddressInput, type PadaAddressData } from "@/components/PadaAddressInput";

import { DAILY_REPORT_LIMIT as DAILY_LIMIT } from "@/lib/constants";

// ─── Composant ────────────────────────────────────────────────────────────────

const ReportPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { track } = useAnalytics();
  const isDark = useIsDark();
  const colorAlpha = isDark ? "2d" : "18";
  const hoverAlpha = isDark ? "22" : "10";
  const { isOnline } = useNetworkStatus();
  const { enqueue } = useOfflineQueue();

  // Wizard 3 Étapes — si step dans l'URL (retour depuis auth après signalement anonyme), avancer directement
  const [step, setStep] = useState<1 | 2 | 3>(() => {
    const s = searchParams.get("step");
    if (s === "2") return 2;
    if (s === "3") return 3;
    return 1;
  });

  // Filtre de catégorie (ex: venant de "Publier une panne" sur la page infrastructure)
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<"all" | "infrastructure" | "outage">(() => {
    const cat = searchParams.get("category");
    const typ = searchParams.get("type");
    if (cat === "infrastructure") return "infrastructure";
    if (cat === "outage") return "outage";
    if (typ) {
      const match = REPORT_TYPES.find((t) => t.id === typ);
      if (match) return match.reportCategory;
    }
    return "all";
  });

  // Étape 1
  const [selectedType, setSelectedType] = useState<ReportTypeConfig | null>(null);
  const [customTypeDesc, setCustomTypeDesc] = useState("");

  // Étape 2
  const [commune, setCommune] = useState("");
  const [quartier, setQuartier] = useState("");
  const [customQuartier, setCustomQuartier] = useState("");
  const [dbQuartiers, setDbQuartiers] = useState<Record<string, string[]>>({});
  const [padaAddress, setPadaAddress] = useState<PadaAddressData | null>(null);

  // Étape 3 (détails optionnels)
  const [description, setDescription] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("");
  const [impactedPeople, setImpactedPeople] = useState(1);
  const [babies, setBabies] = useState(0);
  const [pregnant, setPregnant] = useState(0);
  const [elderly, setElderly] = useState(0);
  const [showDesc, setShowDesc] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [noPhotoReason, setNoPhotoReason] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [showPeople, setShowPeople] = useState(false);
  const [gpsConsent, setGpsConsent] = useState(false);

  // CIE / SODECI — compteur & contrat
  const [meterNumber, setMeterNumber] = useState("");
  const [contractType, setContractType] = useState<"prepaid" | "postpaid">("prepaid");
  const [showMeter, setShowMeter] = useState(false);

  // GPS
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gpsFromPhoto, setGpsFromPhoto] = useState(false);
  const [detectedCommune, setDetectedCommune] = useState<Commune | null>(null);
  const [outsidePilotZone, setOutsidePilotZone] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsSource, setGpsSource] = useState<DetectionSource>(null);
  const [gpsRetrying, setGpsRetrying] = useState(false);
  const [gpsWeakSignal, setGpsWeakSignal] = useState(false);
  // Option A — position mémorisée (utilisateur ayant quitté le lieu)
  const [storedGpsAgeMin, setStoredGpsAgeMin] = useState<number | null>(null);

  // Misc
  const [submitting, setSubmitting] = useState(false);
  const [dailyCount, setDailyCount] = useState<number | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [userProfileCommune, setUserProfileCommune] = useState<string | null>(null);
  const [userProfileQuartier, setUserProfileQuartier] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTestAccount, setIsTestAccount] = useState(false);

  // Onboarding modal
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingMissingFields, setOnboardingMissingFields] = useState<string[]>([]);
  const pendingSubmitRef = useRef(false);

  // Duplicate detection
  interface SimilarReport {
    id: string;
    service_type: string;
    description: string;
    quartier: string;
    verifications: number;
    created_at: string;
    start_time: string;
    user_id: string;
  }
  const [similarReports, setSimilarReports] = useState<SimilarReport[]>([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [corroborating, setCorroborating] = useState<string | null>(null);
  const [parentIncidentId, setParentIncidentId] = useState<string | null>(null);
  const [parentIncidentDetails, setParentIncidentDetails] = useState<SimilarReport | null>(null);

  // ─── Brouillon auto ─────────────────────────────────────────────────────────
  const DRAFT_KEY = "signa_report_draft";

  // Restaurer le brouillon au montage (avant que ?type= soit appliqué)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.typeId) {
        const found = REPORT_TYPES.find((t) => t.id === draft.typeId);
        if (found) { setSelectedType(found); }
      }
      if (draft.commune) setCommune(draft.commune);
      if (draft.quartier) setQuartier(draft.quartier);
      if (draft.description) setDescription(draft.description);
    } catch { /* brouillon corrompu → ignoré */ }
  }, []);

  // Synchronisation des paramètres URL (?type=... et ?category=...)
  useEffect(() => {
    const typeParam = searchParams.get("type");
    if (typeParam) {
      const found = REPORT_TYPES.find((t) => t.id === typeParam || t.label.toLowerCase().includes(typeParam.toLowerCase()));
      if (found) {
        setSelectedType(found);
        if (found.reportCategory === "infrastructure") {
          setActiveCategoryFilter("infrastructure");
        } else if (found.reportCategory === "outage") {
          setActiveCategoryFilter("outage");
        }
      }
    }
    const catParam = searchParams.get("category");
    if (catParam === "infrastructure") {
      setActiveCategoryFilter("infrastructure");
    } else if (catParam === "outage") {
      setActiveCategoryFilter("outage");
    }
  }, [searchParams]);

  // Sauvegarder le brouillon à chaque changement pertinent
  useEffect(() => {
    if (!selectedType) return; // ne rien sauvegarder si aucun type choisi
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        typeId: selectedType.id,
        step,
        commune,
        quartier,
        description,
      }));
    } catch { /* quota dépassé → ignoré */ }
  }, [selectedType, step, commune, quartier, description]);

  // ─── Détection doublons dès le choix du quartier ─────────────────────────────
  // On pré-charge les signalements similaires au moment où quartier est sélectionné
  // (pas seulement au clic sur "Suivant") pour que l'info soit instantanée.
  useEffect(() => {
    if (!quartier || !commune || !selectedType || selectedType.reportCategory !== "outage" || !user) {
      setSimilarReports([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc("find_similar_reports", {
          p_commune: commune,
          p_quartier: quartier,
          p_service_type: selectedType.serviceType,
          p_report_category: "outage",
        });
        if (cancelled || error || !data) return;
        const others = (data as SimilarReport[]).filter((r) => r.user_id !== user.id);
        setSimilarReports(others);
      } catch { /* silencieux */ }
    }, 400); // debounce 400ms
    return () => { cancelled = true; clearTimeout(timer); };
  }, [quartier, commune, selectedType, user]);

  const captureGPS = async (showError = true) => {
    if (typeof window !== "undefined" && !window.isSecureContext && window.location.hostname !== "localhost") {
      setGpsLoading(false);
      if (showError) {
        toast.info("Connexion non sécurisée (HTTP)", {
          description: "La géolocalisation automatique nécessite HTTPS. Choisissez votre commune ci-dessous.",
        });
      }
      return;
    }

    if (!navigator.geolocation) {
      setGpsLoading(false);
      if (showError) toast.error("Géolocalisation non supportée");
      return;
    }

    setGpsLoading(true);
    setGpsRetrying(false);
    setGpsWeakSignal(false);

    const getPosition = (highAccuracy = true, timeoutMs = 6000): Promise<GeolocationPosition> =>
      new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: highAccuracy,
          timeout: timeoutMs,
          maximumAge: 30000,
        })
      );

    let bestPos: GeolocationPosition | null = null;
    let lastGpsError: GeolocationPositionError | null = null;

    try {
      // Tentative 1 : haute précision (GPS matériel)
      bestPos = await getPosition(true, 6000);
    } catch (err: any) {
      lastGpsError = err;
      // Si la permission est expressément refusée (code 1), inutile d'insister
      if (err?.code !== 1) {
        try {
          // Tentative 2 : basse précision (antennes mobiles / Wi-Fi réseau), plus rapide et fiable en intérieur
          bestPos = await getPosition(false, 4000);
        } catch (err2: any) {
          lastGpsError = err2;
        }
      }
    }

    setGpsRetrying(false);

    if (!bestPos) {
      // Option A — essayer la commune mémorisée (< 2h) comme indice UX
      try {
        const raw = localStorage.getItem("signa_last_commune");
        if (raw) {
          const stored = JSON.parse(raw) as { communeNom: string; timestamp: number };
          const ageMin = (Date.now() - stored.timestamp) / 60000;
          const found = COMMUNES.find((c) => c.nom === stored.communeNom);
          if (ageMin < 120 && found) {
            setDetectedCommune(found);
            setCommune(found.nom);
            setOutsidePilotZone(false);
            setStoredGpsAgeMin(Math.round(ageMin));
            setGpsLoading(false);
            return;
          }
        }
      } catch { /* silent */ }

      setGpsLoading(false);
      if (showError) {
        if (lastGpsError?.code === 1) {
          toast.info("Permissions GPS non accordées", {
            description: "Vous pouvez choisir simplement votre commune ci-dessous pour continuer.",
          });
        } else if (lastGpsError?.code === 2) {
          toast.info("Service de localisation désactivé", {
            description: "Activez le GPS de votre téléphone ou choisissez votre commune ci-dessous.",
          });
        } else {
          toast.info("Signal GPS non détecté", {
            description: "Choisissez directement votre commune ci-dessous pour continuer.",
          });
        }
      }
      return;
    }

    const lat = bestPos.coords.latitude;
    const lon = bestPos.coords.longitude;
    const accuracy = bestPos.coords.accuracy;

    setLatitude(lat);
    setLongitude(lon);
    setGpsAccuracy(accuracy);
    const WEAK_ACCURACY_M = 300;
    setGpsWeakSignal(accuracy > WEAK_ACCURACY_M);

    // Résolution 4 tiers (GeoJSON → Nominatim → Google → Haversine)
    const result = await resolveCommune(lat, lon, accuracy);
    setGpsSource(result.source);

    if (!result.outsidePilotZone && result.commune) {
      setDetectedCommune(result.commune);
      setCommune(result.commune.nom);
      setOutsidePilotZone(false);
      setStoredGpsAgeMin(null); // position fraîche
      // Sauvegarder uniquement le nom de commune (zéro coordonnée brute en localStorage)
      try {
        localStorage.setItem("signa_last_commune", JSON.stringify({
          communeNom: result.commune.nom, timestamp: Date.now(),
        }));
      } catch { /* silent */ }
      if (showError) {
        const sourceLabel: Record<string, string> = {
          geojson: "polygone", nominatim: "OSM", google: "Google", radius: "rayon",
        };
        toast.success(
          `Position capturée — ${result.commune.nom}`,
          { description: `Précision ± ${Math.round(accuracy)} m · source : ${sourceLabel[result.source ?? ""] ?? result.source}` }
        );
      }
    } else {
      setDetectedCommune(null);
      setCommune("");
      setOutsidePilotZone(true);
    }

    setGpsLoading(false);
  };

  const handleManualCommuneSelect = (selectedCommuneName: string) => {
    const found = COMMUNES.find((c) => c.nom === selectedCommuneName);
    if (!found) return;
    setDetectedCommune(found);
    setCommune(found.nom);
    setOutsidePilotZone(false);
    setGpsSource("manual");
    setLatitude(found.centerLat);
    setLongitude(found.centerLon);
    setGpsAccuracy(50);
    toast.success(`Commune sélectionnée : ${found.nom}`, {
      description: "Vous pouvez à présent choisir votre quartier ci-dessous.",
    });
  };

  useEffect(() => { captureGPS(false); }, []);

  // Pré-sélection via ?type=X (depuis les pills de la page d'accueil)
  useEffect(() => {
    const typeParam = searchParams.get("type");
    if (!typeParam) return;
    const found = REPORT_TYPES.find((t) => t.id === typeParam);
    if (found) {
      setSelectedType(found);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("count_user_daily_reports", { p_user_id: user.id }).then(({ data, error }) => {
      if (!error && data !== null) {
        const count = data as number;
        setDailyCount(count);
        setLimitReached(count >= DAILY_LIMIT);
      }
    });
    supabase.from("profiles").select("phone, commune, quartier").eq("user_id", user.id).single().then(({ data }) => {
      setUserPhone(data?.phone ?? null);
      setUserProfileCommune(data?.commune ?? null);
      setUserProfileQuartier(data?.quartier ?? null);
    });
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      setIsAdmin(data === true);
    });
    supabase.rpc("has_role", { _user_id: user.id, _role: "test" }).then(({ data }) => {
      setIsTestAccount(data === true);
    });
  }, [user]);

  // Auto-submit after onboarding completion
  useEffect(() => {
    if (pendingSubmitRef.current) {
      pendingSubmitRef.current = false;
      handleSubmit();
    }
  }, [userPhone, userProfileCommune, userProfileQuartier]);

  // Charger les quartiers validés depuis Supabase (enrichit la liste statique)
  useEffect(() => {
    supabase
      .from("quartiers")
      .select("nom, commune")
      .eq("validated", true)
      .eq("hidden", false)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, string[]> = {};
        for (const q of data) {
          if (!map[q.commune]) map[q.commune] = [];
          map[q.commune].push(q.nom);
        }
        setDbQuartiers(map);
      });
  }, []);

  // Liste finale : statique + DB validés, triés, sans doublons
  const getQuartiersForCommune = (c: string): string[] => {
    const staticList = getQuartiers(c);
    const dbList = dbQuartiers[c] ?? [];
    const merged = Array.from(new Set([...staticList, ...dbList]));
    return merged.sort((a, b) => a.localeCompare(b, "fr"));
  };

  const resolvedQuartier = quartier;

  const canReport = detectedCommune !== null && !outsidePilotZone && latitude !== null;

  const handleTypeSelect = (type: ReportTypeConfig) => {
    const isSame = selectedType?.id === type.id;
    setSelectedType(type);
    track("type_selected", { type_id: type.id, category: type.reportCategory, service: type.serviceType });
    if ("vibrate" in navigator) navigator.vibrate([20]);

    if (isSame) {
      handleTypeNext();
    } else {
      setTimeout(() => {
        const ctaBtn = document.getElementById("step2-cta-button");
        if (ctaBtn) {
          ctaBtn.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }, 120);
    }
  };

  const handleLocationNext = () => {
    if (!commune || !resolvedQuartier) {
      toast.error("Veuillez sélectionner la commune et le quartier");
      return;
    }
    if (latitude === null || longitude === null) {
      toast.error("Position GPS requise. Activez la géolocalisation.");
      return;
    }
    setStep(2);
  };

  const handleTypeNext = () => {
    if (!selectedType) {
      toast.error("Veuillez choisir le type d'incident");
      return;
    }
    if (selectedType.id === "other" && !customTypeDesc.trim()) {
      toast.error("Veuillez préciser la nature de l'incident");
      return;
    }

    // Vérification doublons dès le passage à l'étape 3
    if (selectedType?.reportCategory === "outage" && user && similarReports.length > 0) {
      setShowDuplicateDialog(true);
      return;
    }

    // Auto-ouvrir le panel photo pour les signalements infrastructure (photo obligatoire)
    if (selectedType?.reportCategory === "infrastructure") {
      setShowPhoto(true);
    }
    setStep(3);
  };

  const handleCorroborateExisting = async (reportId: string) => {
    if (!user) return;
    setCorroborating(reportId);
    try {
      const { error } = await supabase.rpc("corroborate_report", { p_report_id: reportId });
      if (error) throw error;
      toast.success("Corroboration ajoutée. Le signalement existant est renforcé.");
      setShowDuplicateDialog(false);
      navigate("/");
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("déjà confirmé")) {
        toast.info("Vous avez déjà confirmé ce signalement.");
        setShowDuplicateDialog(false);
      } else if (msg.includes("Impossible de confirmer")) {
        toast.error("Ce signalement n'est plus actif.");
        setShowDuplicateDialog(false);
        proceedToStep3();
      } else {
        toast.error(msg);
      }
    } finally {
      setCorroborating(null);
    }
  };

  const handleAttachToExisting = (r: SimilarReport) => {
    setParentIncidentId(r.id);
    setParentIncidentDetails(r);
    setShowDuplicateDialog(false);
    if (selectedType?.reportCategory === "infrastructure") {
      setShowPhoto(true);
    }
    setStep(3);
    toast.info("Votre signalement sera rattaché à cet incident existant (vos photos et détails compléteront le dossier).");
  };

  const proceedToStep3 = () => {
    setParentIncidentId(null);
    setParentIncidentDetails(null);
    setShowDuplicateDialog(false);
    if (selectedType?.reportCategory === "infrastructure") {
      setShowPhoto(true);
    }
    setStep(3);
  };

  const handleSubmit = async () => {
    if (limitReached) { toast.error(`Limite de ${DAILY_LIMIT} signalements / jour atteinte`); return; }
    if (latitude === null || longitude === null) { toast.error("Position GPS requise"); return; }
    if (gpsSource !== "manual" && !gpsFromPhoto && storedGpsAgeMin === null && gpsAccuracy !== null && gpsAccuracy > 300 && !isAdmin && !isTestAccount) {
      toast.error("Signal GPS trop imprécis", {
        description: `Précision actuelle : ± ${Math.round(gpsAccuracy)} m. Déplacez-vous près d'une fenêtre et relancez la localisation.`,
        action: { label: "Relocaliser", onClick: () => captureGPS(true) },
        duration: 8000,
      });
      return;
    }
    if (!selectedType || !commune || !resolvedQuartier) { toast.error("Informations incomplètes"); return; }
    if (!user) { toast.error("Vous devez être connecté"); return; }
    if (!isAdmin && !isTestAccount) {
      const missing = [
        !userPhone?.trim() && "phone",
        !userProfileCommune?.trim() && "commune",
        !userProfileQuartier?.trim() && "quartier",
      ].filter(Boolean) as string[];
      if (missing.length > 0) {
        setOnboardingMissingFields(missing);
        setShowOnboarding(true);
        return;
      }
    }
    if (selectedType.reportCategory === "infrastructure" && photoUrls.length === 0 && !noPhotoReason) {
      toast.error("Une photo est requise (ou cochez l'option photo impossible)");
      setShowPhoto(true);
      return;
    }
    if (noPhotoReason && (description || "").trim().length < 30) {
      toast.error("Description détaillée d'au moins 30 caractères requise sans photo", {
        description: "Veuillez préciser l'emplacement exact et l'état du problème.",
      });
      setShowDesc(true);
      return;
    }

    // ─── Validation Zod (valeurs numériques + description) ────────────────────
    const effectiveDescription = description || selectedType.defaultDesc(commune);
    const validation = reportDetailsSchema.safeParse({
      impactedPeople,
      babies,
      pregnant,
      elderly,
      description: effectiveDescription,
    });
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    setSubmitting(true);
    try {
      let reportStartTime = new Date().toISOString();
      if (startTime) {
        const [h, m] = startTime.split(":").map(Number);
        const st = new Date();
        st.setHours(h, m, 0, 0);
        reportStartTime = st.toISOString();
      }

      const typeLabel =
        selectedType.id === "other" && customTypeDesc ? customTypeDesc : selectedType.label;
      const baseDesc = description || selectedType.defaultDesc(commune);
      const fullBaseDesc = `[${typeLabel}] ${baseDesc}`;
      const isInfra = selectedType.reportCategory === "infrastructure";
      const vulnParts: string[] = [];
      if (!isInfra) {
        if (babies > 0) vulnParts.push(`${babies} bébé(s)`);
        if (pregnant > 0) vulnParts.push(`${pregnant} femme(s) enceinte(s) ou nourrice(s)`);
        if (elderly > 0) vulnParts.push(`${elderly} personne(s) âgée(s)`);
      }
      const impactInfo = !isInfra
        ? ` [${impactedPeople} personne(s)${vulnParts.length ? ` dont ${vulnParts.join(", ")}` : ""}]`
        : "";
      const fullDesc = `${fullBaseDesc}${impactInfo}`.slice(0, 600);
      const hasVulnerable = !isInfra && (babies > 0 || pregnant > 0 || elderly > 0);

      const canonicalQuartier = normalizeQuartier(resolvedQuartier, commune);
      const effectiveQuartierName =
        quartier === "__other" && customQuartier && customQuartier.trim() !== ""
          ? customQuartier.trim()
          : canonicalQuartier;

      // PADA public info : uniquement pour la voirie/infrastructure publique, pas dans la description textuelle des coupures privées
      const padaInfo = isInfra && padaAddress?.formattedAddress ? ` [PADA : ${padaAddress.formattedAddress}]` : "";
      const fullFinalDesc = `${fullDesc}${padaInfo}`.slice(0, 600);

      const client_submission_id = crypto.randomUUID();

      const reportPayload = {
        client_submission_id,
        user_id: user.id,
        service_type: selectedType.serviceType,
        report_category: selectedType.reportCategory,
        description: fullFinalDesc,
        location: (isInfra && padaAddress?.formattedAddress
          ? `${commune} - ${padaAddress.formattedAddress}`
          : effectiveQuartierName
          ? `${commune} - ${effectiveQuartierName}`
          : commune).slice(0, 450),
        commune,
        quartier: effectiveQuartierName,
        latitude,
        longitude,
        urgency: hasVulnerable ? "high" : "medium",
        start_time: reportStartTime,
        photo_url: photoUrls[0] || null,
        photo_urls: photoUrls.length > 0 ? photoUrls : null,
        impacted_people: isInfra ? null : impactedPeople,
        babies: isInfra ? 0 : babies,
        pregnant: isInfra ? 0 : pregnant,
        elderly: isInfra ? 0 : elderly,
        meter_number: meterNumber || null,
        parent_incident_id: parentIncidentId || null,
        ...(selectedType.id === "electricity_outage" || selectedType.id === "water_outage"
          ? { contract_type: contractType || null }
          : {}),
      };

      // -- Offline: save to queue and exit ----------------------------------
      if (!isOnline) {
        localStorage.removeItem(DRAFT_KEY);
        await enqueue(reportPayload);
        toast.success("Signalement enregistré hors-ligne. Il sera envoyé automatiquement dès le retour du réseau.", {
          duration: 6000,
        });
        setSubmitting(false);
        navigate("/");
        return;
      }

      const { data: insertData, error } = await supabase.from("reports").insert(reportPayload as any).select("id").single();

      if (error) throw error;

      // Si l'utilisateur a saisi un quartier qui n'existe pas dans la liste statique,
      // le soumettre comme proposition en attente de validation admin.
      const isCustomQuartier = quartier && !getQuartiersForCommune(commune).includes(quartier);
      if (isCustomQuartier) {
        await supabase.from("quartiers").insert({
          nom: quartier,
          commune,
          source: "user",
          validated: false,
          submitted_by: user.id,
          aliases: [],
        } as any).then(() => {}); // erreur silencieuse (doublon déjà existant → ignoré)
      }

      localStorage.removeItem(DRAFT_KEY);
      track("report_submitted", {
        type_id: selectedType!.id,
        category: selectedType!.reportCategory,
        service: selectedType!.serviceType,
        commune,
        has_photo: photoUrls.length > 0,
        impacted_people: impactedPeople,
        has_vulnerable: babies > 0 || pregnant > 0 || elderly > 0,
      });
      // Retour haptique sur mobile
      if ("vibrate" in navigator) navigator.vibrate(200);
      toast.success("Signalement envoyé");
      const reportId = (insertData as any)?.id;
      const params = new URLSearchParams({
        commune,
        type: selectedType.label,
        emoji: selectedType.emoji,
        quartier: resolvedQuartier,
        service: selectedType.serviceType,
        category: selectedType.reportCategory,
        ...(reportId ? { id: reportId } : {}),
        ...(meterNumber ? { meter: meterNumber } : {}),
        ...(contractType ? { contract: contractType } : {}),
      });
      navigate(`/confirmation?${params.toString()}`);
    } catch (error: any) {
      const msg = error?.message || "";
      if (msg.includes("daily_limit_exceeded")) {
        toast.error(`Limite de ${DAILY_LIMIT} signalements / jour atteinte`);
      } else if (msg.includes("Rate limit exceeded")) {
        toast.error("Trop de signalements. Attendez 1 minute.");
      } else {
        const detail = error?.message || error?.details;
        toast.error(getUserFriendlyError(error, "Erreur lors de l'envoi"), {
          description: detail ? String(detail) : undefined,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCommuneData = COMMUNES.find((c) => c.nom === commune);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="w-full max-w-2xl mx-auto py-5 px-3.5 sm:px-6 pb-28 sm:pb-36 overflow-x-hidden">
        <div className="space-y-4">

          {/* Stepper 3 Étapes — Centré, Ergonomique & 100% Responsive */}
          <div className="mb-5 space-y-2.5">
            <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
              {[
                { s: 1, label: "Lieu", fullLabel: "1. Localisation" },
                { s: 2, label: "Incident", fullLabel: "2. Incident" },
                { s: 3, label: "Preuves", fullLabel: "3. Preuves & Envoi" },
              ].map(({ s, label, fullLabel }) => {
                const isCompleted =
                  (s === 1 && Boolean(commune && resolvedQuartier && latitude)) ||
                  (s === 2 && Boolean(selectedType));
                const isCurrent = step === s;
                const canClick =
                  s === 1 ||
                  (s === 2 && Boolean(commune && resolvedQuartier)) ||
                  (s === 3 && Boolean(commune && resolvedQuartier && selectedType));

                return (
                  <button
                    key={s}
                    type="button"
                    disabled={!canClick}
                    onClick={() => { if (canClick) setStep(s as 1 | 2 | 3); }}
                    className={cn(
                      "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 px-1 rounded-xl transition-all select-none text-center",
                      isCurrent
                        ? "bg-primary/10 text-primary font-bold shadow-xs border border-primary/25"
                        : isCompleted
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/20"
                        : "bg-muted/40 text-muted-foreground border border-transparent",
                      !canClick && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full text-[11px] sm:text-xs font-bold transition-all",
                        isCurrent
                          ? "bg-primary text-primary-foreground shadow-xs scale-105"
                          : isCompleted
                          ? "bg-emerald-600 text-white"
                          : "bg-muted text-muted-foreground border"
                      )}
                    >
                      {isCompleted && !isCurrent ? <CheckCircle2 className="h-3.5 w-3.5" /> : s}
                    </div>
                    <span className="text-[11px] sm:text-xs font-bold truncate">
                      <span className="sm:hidden">{label}</span>
                      <span className="hidden sm:inline">{fullLabel}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary"
                animate={{
                  width: step === 1 ? "33.33%" : step === 2 ? "66.66%" : "100%",
                }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Compteur journalier */}
          {dailyCount !== null && (
            <div className={`mb-4 rounded-xl border p-2.5 text-center text-xs font-medium ${
              limitReached
                ? "border-destructive/30 bg-destructive/5 text-destructive"
                : "border-border bg-card text-muted-foreground"
            }`}>
              {limitReached
                ? `Limite atteinte : ${dailyCount}/${DAILY_LIMIT} signalements aujourd'hui`
                : `${dailyCount}/${DAILY_LIMIT} signalements utilisés aujourd'hui`}
            </div>
          )}

        <AnimatePresence mode="wait">

          {/* ═══════════════════════════════════════════════
              ÉTAPE 1 — Localisation & Adressage PADA
          ═══════════════════════════════════════════════ */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="text-center">
                <h1 className="text-2xl font-bold">1. Où se situe l'incident ?</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Position GPS précise et adressage officiel PADA pour guider les équipes d'intervention
                </p>
              </div>

              {/* 1. En cours de géolocalisation */}
              {gpsLoading && (
                <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground leading-tight">
                        Détection automatique
                      </p>
                      <h4 className="text-sm sm:text-base font-bold text-foreground leading-snug break-words mt-0.5">
                        Localisation de votre commune en cours…
                      </h4>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Commune détectée automatiquement OU sélectionnée manuellement */}
              {!gpsLoading && detectedCommune && !outsidePilotZone && (
                <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/8 p-3.5 sm:p-4 flex items-center justify-between gap-2.5 sm:gap-3 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] sm:text-xs font-semibold text-emerald-800 dark:text-emerald-300 leading-tight">
                        {gpsSource === "manual" ? "Commune sélectionnée" : "Localisation automatique détectée"}
                      </p>
                      <h4 className="text-sm sm:text-base font-black text-foreground leading-snug break-words mt-0.5">
                        Vous êtes à <span className="text-emerald-600 dark:text-emerald-400 font-black">{detectedCommune.nom}</span>
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDetectedCommune(null);
                        setCommune("");
                      }}
                      className="text-xs h-8 px-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted font-medium"
                      title="Changer de commune"
                    >
                      Modifier
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => captureGPS(true)}
                      disabled={gpsLoading}
                      className="text-xs h-8 px-2 sm:px-2.5 rounded-lg text-emerald-700 hover:bg-emerald-500/15 gap-1 font-semibold"
                      title="Réactualiser votre position"
                    >
                      <Navigation className={`h-3.5 w-3.5 ${gpsLoading ? "animate-spin" : ""}`} />
                      <span className="hidden xs:inline sm:inline">Actualiser</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* 3. Fallback si GPS indisponible, refusé ou hors zone (Uniquement si aucune commune n'est détectée) */}
              {!gpsLoading && (!detectedCommune || outsidePilotZone) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 p-5 space-y-4 text-center"
                >
                  <div className="flex justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15">
                      <MapPin className="h-6 w-6 text-amber-500" />
                    </div>
                  </div>
                  <h3 className="font-bold text-foreground text-sm">
                    {outsidePilotZone
                      ? "Position hors des 14 communes du Grand Abidjan"
                      : "Position GPS non détectée"}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
                    {outsidePilotZone
                      ? "SIGNA·CI couvre les 14 communes du Grand Abidjan. Choisissez directement votre commune ci-dessous :"
                      : "La géolocalisation automatique n'a pas pu déterminer votre position. Choisissez simplement votre commune ci-dessous pour continuer :"}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => captureGPS(true)}
                      disabled={gpsLoading}
                      className="text-xs font-semibold gap-1.5"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      Réessayer la géolocalisation
                    </Button>
                  </div>

                  {/* Choix manuel direct de secours */}
                  <div className="pt-3 border-t border-amber-500/20 text-left space-y-3">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" /> Choisir ma commune :
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {COMMUNES.map((c) => (
                        <button
                          key={c.nom}
                          type="button"
                          onClick={() => handleManualCommuneSelect(c.nom)}
                          className={`flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 sm:py-2.5 text-[11px] sm:text-xs font-semibold rounded-xl border transition-all text-center leading-tight ${
                            commune === c.nom
                              ? "border-primary bg-primary text-primary-foreground shadow-sm"
                              : "border-border bg-card hover:bg-muted text-foreground"
                          }`}
                        >
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: c.couleur }} />
                          <span className="break-words">{c.nom}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Formulaire Quartier + PADA */}
              {canReport && (
                <div className="space-y-4 pt-1">
                  {/* Sélecteur & Recherche de Quartier avec autocomplétion par frappe */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-foreground">Quartier *</label>
                      <span className="text-xs text-muted-foreground">Sélectionnez ou tapez les premières lettres</span>
                    </div>
                    <QuartierSearch
                      quartiers={getQuartiersForCommune(commune)}
                      value={quartier}
                      onChange={(q) => {
                        setQuartier(q);
                        setPadaAddress(null);
                      }}
                    />
                    {quartier === "__other" && (
                      <div className="pt-1.5 space-y-1">
                        <label htmlFor="custom-quartier" className="text-xs font-medium text-muted-foreground">
                          Précisez le nom de votre quartier *
                        </label>
                        <Input
                          id="custom-quartier"
                          placeholder="Ex: Williamsville plateau, Attoban sud..."
                          value={customQuartier}
                          onChange={(e) => setCustomQuartier(e.target.value)}
                          maxLength={100}
                          className="h-11 rounded-xl"
                          autoFocus
                        />
                      </div>
                    )}
                  </div>

                  {/* Voie / Rue Officielle PADA */}
                  {resolvedQuartier && (
                    <PadaAddressInput
                      commune={commune}
                      quartier={resolvedQuartier}
                      value={padaAddress || undefined}
                      onChange={setPadaAddress}
                      accentColor={selectedType?.color || "#10B981"}
                    />
                  )}

                  {/* Bouton de progression vers Étape 2 */}
                  <Button
                    type="button"
                    className="w-full py-5 text-base font-bold rounded-xl shadow-md transition-all hover:opacity-90 mt-2 bg-primary text-primary-foreground"
                    onClick={handleLocationNext}
                    disabled={!commune || !resolvedQuartier || !latitude}
                  >
                    Choisir le problème →
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════
              ÉTAPE 2 — Choix de l'incident & Opérateur
          ═══════════════════════════════════════════════ */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* En-tête avec bouton retour vers étape 1 */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Modifier le lieu
                </button>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-700 dark:text-emerald-300 truncate max-w-[240px]">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{commune}, {resolvedQuartier}</span>
                </div>
              </div>

              <div className="text-center">
                <h1 className="text-2xl font-bold">2. Quel est l'incident ?</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Touchez l'incident correspondant à votre constat sur le terrain
                </p>
              </div>

              {/* Filtres par catégorie */}
              <div className="flex items-center justify-center gap-1.5 flex-wrap pt-1">
                {[
                  { id: "all", label: "Tous" },
                  { id: "outage", label: "Coupures domestiques" },
                  { id: "infrastructure", label: "Infrastructures & Équipements" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setActiveCategoryFilter(f.id as any)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                      activeCategoryFilter === f.id
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Grille des types — coupures réseau */}
              {activeCategoryFilter !== "infrastructure" && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Coupures à domicile</p>
                  <div className="grid grid-cols-2 gap-3">
                    {REPORT_TYPES.filter((t) => t.reportCategory === "outage").map((type) => {
                      const isSelected = selectedType?.id === type.id;
                      return (
                        <motion.button
                          key={type.id}
                          type="button"
                          whileTap={{ scale: 0.96 }}
                          onClick={() => handleTypeSelect(type)}
                          className={cn(
                            "group relative flex flex-col items-center gap-2.5 rounded-2xl border-2 p-4 text-center transition-all duration-150 hover:shadow-md focus:outline-none bg-card",
                            isSelected
                              ? "ring-2 ring-offset-1 shadow-md"
                              : "border-border hover:border-primary/40"
                          )}
                          style={{
                            borderColor: isSelected ? type.color : undefined,
                            backgroundColor: isSelected ? type.color + "15" : undefined,
                          }}
                        >
                          {isSelected && (
                            <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </span>
                          )}
                          {type.image
                            ? <img src={type.image} alt={type.label} className="h-10 w-10 object-contain rounded-lg" />
                            : <span className="text-4xl leading-none">{type.emoji}</span>
                          }
                          <span className="text-xs font-bold leading-tight text-foreground">{type.label}</span>
                          {type.description && (
                            <span className="text-[11px] leading-tight text-muted-foreground line-clamp-2">{type.description}</span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section Problème d'infrastructure par Opérateur */}
              {activeCategoryFilter !== "outage" && (
                <div className="space-y-4 pt-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Signalements d'infrastructures publiques</p>

                  {/* --- CIE --- */}
                  <div className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-black tracking-wider bg-amber-500 text-white shadow-xs">CIE</span>
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-200">Électricité & Éclairage Public</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {REPORT_TYPES.filter((t) => t.operator === "CIE").map((type) => {
                        const isSelected = selectedType?.id === type.id;
                        return (
                          <motion.button
                            key={type.id}
                            type="button"
                            whileTap={{ scale: 0.96 }}
                            onClick={() => handleTypeSelect(type)}
                            className={cn(
                              "group relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition-all duration-150 hover:shadow-md focus:outline-none bg-card",
                              isSelected ? "ring-2 ring-offset-1 shadow-md" : "border-border"
                            )}
                            style={{
                              borderColor: isSelected ? type.color : undefined,
                              backgroundColor: isSelected ? type.color + "15" : undefined,
                            }}
                          >
                            {isSelected && (
                              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
                                <CheckCircle2 className="h-3 w-3" />
                              </span>
                            )}
                            {type.image
                              ? <img src={type.image} alt={type.label} className="h-8 w-8 object-contain rounded-md" />
                              : <span className="text-2xl leading-none">{type.emoji}</span>
                            }
                            <span className="text-xs font-bold leading-tight text-foreground">{type.label}</span>
                            {type.description && (
                              <span className="text-[11px] leading-tight text-muted-foreground line-clamp-2">{type.description}</span>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* --- SODECI --- */}
                  <div className="space-y-2 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-black tracking-wider bg-sky-600 text-white shadow-xs">SODECI</span>
                      <span className="text-xs font-bold text-sky-900 dark:text-sky-200">Eau Potable & Assainissement</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {REPORT_TYPES.filter((t) => t.operator === "SODECI").map((type) => {
                        const isSelected = selectedType?.id === type.id;
                        return (
                          <motion.button
                            key={type.id}
                            type="button"
                            whileTap={{ scale: 0.96 }}
                            onClick={() => handleTypeSelect(type)}
                            className={cn(
                              "group relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition-all duration-150 hover:shadow-md focus:outline-none bg-card",
                              isSelected ? "ring-2 ring-offset-1 shadow-md" : "border-border"
                            )}
                            style={{
                              borderColor: isSelected ? type.color : undefined,
                              backgroundColor: isSelected ? type.color + "15" : undefined,
                            }}
                          >
                            {isSelected && (
                              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
                                <CheckCircle2 className="h-3 w-3" />
                              </span>
                            )}
                            {type.image
                              ? <img src={type.image} alt={type.label} className="h-8 w-8 object-contain rounded-md" />
                              : <span className="text-2xl leading-none">{type.emoji}</span>
                            }
                            <span className="text-xs font-bold leading-tight text-foreground">{type.label}</span>
                            {type.description && (
                              <span className="text-[11px] leading-tight text-muted-foreground line-clamp-2">{type.description}</span>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* --- MAIRIE --- */}
                  <div className="space-y-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-black tracking-wider bg-emerald-600 text-white shadow-xs">MAIRIE</span>
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">Voirie & Salubrité Municipale</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {REPORT_TYPES.filter((t) => t.operator === "MAIRIE").map((type) => {
                        const isSelected = selectedType?.id === type.id;
                        return (
                          <motion.button
                            key={type.id}
                            type="button"
                            whileTap={{ scale: 0.96 }}
                            onClick={() => handleTypeSelect(type)}
                            className={cn(
                              "group relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition-all duration-150 hover:shadow-md focus:outline-none bg-card",
                              isSelected ? "ring-2 ring-offset-1 shadow-md" : "border-border"
                            )}
                            style={{
                              borderColor: isSelected ? type.color : undefined,
                              backgroundColor: isSelected ? type.color + "15" : undefined,
                            }}
                          >
                            {isSelected && (
                              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
                                <CheckCircle2 className="h-3 w-3" />
                              </span>
                            )}
                            {type.image
                              ? <img src={type.image} alt={type.label} className="h-8 w-8 object-contain rounded-md" />
                              : <span className="text-2xl leading-none">{type.emoji}</span>
                            }
                            <span className="text-xs font-bold leading-tight text-foreground">{type.label}</span>
                            {type.description && (
                              <span className="text-[11px] leading-tight text-muted-foreground line-clamp-2">{type.description}</span>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Champ libre si "Autre" */}
              {selectedType?.id === "other" && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <label htmlFor="custom-type-desc" className="text-sm font-semibold block">Précisez le problème *</label>
                  <Input
                    id="custom-type-desc"
                    placeholder="Ex: Arbre tombé, route inondée..."
                    value={customTypeDesc}
                    onChange={(e) => setCustomTypeDesc(e.target.value)}
                    maxLength={80}
                    autoFocus
                  />
                </div>
              )}

              {/* Bouton de progression vers Étape 3 */}
              <div className="pt-2 flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="py-5 px-4 font-semibold rounded-xl"
                  onClick={() => setStep(1)}
                >
                  ← Précédent
                </Button>
                <Button
                  id="step2-cta-button"
                  type="button"
                  className="flex-1 py-5 text-base font-bold rounded-xl shadow-md transition-all hover:opacity-90"
                  style={{
                    backgroundColor: selectedType ? selectedType.color : undefined,
                    color: "white",
                  }}
                  onClick={handleTypeNext}
                  disabled={!selectedType}
                >
                  Continuer vers les preuves →
                </Button>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════
              ÉTAPE 3 — Preuves & Finalisation
          ═══════════════════════════════════════════════ */}
          {step === 3 && selectedType && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 pb-10"
            >
              {/* En-tête */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  aria-label="Retour au choix de l'incident"
                  className="rounded-full p-2 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <h1 className="font-bold text-xl">3. Preuves & Finalisation</h1>
              </div>

              {/* Carte récapitulative */}
              <div
                className="rounded-2xl border-2 p-4"
                style={{
                  borderColor: selectedType.color + "60",
                  backgroundColor: selectedType.color + "0D",
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: selectedType.color + "20" }}
                  >
                    {selectedType.image
                      ? <img src={selectedType.image} alt={selectedType.label} className="h-8 w-8 object-contain" />
                      : <span className="text-3xl leading-none">{selectedType.emoji}</span>}
                  </span>
                  <div>
                    <p className="font-bold text-base">{selectedType.label}</p>
                    {selectedType.id === "other" && customTypeDesc && (
                      <p className="text-xs text-muted-foreground">"{customTypeDesc}"</p>
                    )}
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {commune}, {resolvedQuartier}
                    </p>
                    {padaAddress?.formattedAddress && (
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mt-1 flex items-center gap-1">
                        <span>{padaAddress.formattedAddress}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bannière de rattachement à un incident existant */}
              {parentIncidentId && parentIncidentDetails && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-start justify-between gap-3 text-sm">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                      <Link2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-xs sm:text-sm">
                        Rattaché à l'incident #{parentIncidentDetails.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Vos photos et votre témoignage viendront enrichir cet incident public sans créer de carte en doublon.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground shrink-0"
                    onClick={() => {
                      setParentIncidentId(null);
                      setParentIncidentDetails(null);
                      toast.info("Signalement détaché (il sera publié comme un incident indépendant)");
                    }}
                  >
                    Détacher
                  </Button>
                </div>
              )}

              {/* ── 1. Pour les Coupures : Heure de Début Immédiate ── */}
              {selectedType.reportCategory === "outage" && (
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">Début de la coupure</p>
                        <p className="text-xs text-muted-foreground truncate">Depuis quand n'avez-vous plus de service ?</p>
                      </div>
                    </div>
                    <Input
                      id="start-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-24 text-center text-xs font-bold h-9 bg-background shrink-0"
                    />
                  </div>

                  {/* Raccourcis tactiles rapides */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {[
                      { label: "À l'instant", mins: 0 },
                      { label: "Il y a 30 min", mins: 30 },
                      { label: "Il y a 1h", mins: 60 },
                      { label: "Ce matin (08:00)", custom: "08:00" },
                    ].map((pill) => {
                      const isCurrent = pill.custom
                        ? startTime === pill.custom
                        : pill.mins === 0
                        ? !startTime
                        : false;
                      return (
                        <button
                          key={pill.label}
                          type="button"
                          onClick={() => {
                            if (pill.custom) {
                              setStartTime(pill.custom);
                            } else if (pill.mins === 0) {
                              setStartTime("");
                            } else {
                              const d = new Date(Date.now() - pill.mins * 60 * 1000);
                              const hh = String(d.getHours()).padStart(2, "0");
                              const mm = String(d.getMinutes()).padStart(2, "0");
                              setStartTime(`${hh}:${mm}`);
                            }
                          }}
                          className={cn(
                            "px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer",
                            isCurrent
                              ? "border-primary bg-primary/15 text-primary font-bold shadow-xs"
                              : "border-border bg-muted/40 hover:bg-muted text-foreground"
                          )}
                        >
                          {pill.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── 2. Pour les Coupures : Foyer & Personnes Vulnérables ── */}
              {selectedType.reportCategory === "outage" && (
                <div className="rounded-2xl border border-border bg-card p-4 space-y-4 shadow-xs">
                  {/* Ligne 1 : Taille globale du foyer */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary shrink-0" />
                        <p className="text-sm font-bold text-foreground">Personnes dans votre foyer</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Nombre total d'habitants impactés
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 bg-muted/50 rounded-xl p-1 border border-border/50">
                      <button
                        type="button"
                        onClick={() => setImpactedPeople(Math.max(1, impactedPeople - 1))}
                        aria-label="Diminuer le nombre d'habitants"
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-card text-foreground hover:bg-muted border border-border/60 transition-colors shadow-xs"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-black tabular-nums">{impactedPeople}</span>
                      <button
                        type="button"
                        onClick={() => setImpactedPeople(Math.min(50, impactedPeople + 1))}
                        aria-label="Augmenter le nombre d'habitants"
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-card text-foreground hover:bg-muted border border-border/60 transition-colors shadow-xs"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Ligne 2 : Encart Personnes Vulnérables */}
                  <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold text-foreground">Personnes vulnérables ?</span>
                          {(babies + pregnant + elderly > 0) && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                              <Zap className="h-3 w-3" /> Priorité haute
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Bébés, femmes enceintes/allaitantes, aînés
                        </p>
                      </div>
                      {/* Toggle Oui / Non robuste et ergonomique */}
                      <div className="flex items-center rounded-xl bg-background border border-border p-1 shrink-0 shadow-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setShowPeople(false);
                            setBabies(0);
                            setPregnant(0);
                            setElderly(0);
                          }}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                            !showPeople
                              ? "bg-muted text-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Non
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPeople(true)}
                          className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                            showPeople
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Oui
                        </button>
                      </div>
                    </div>

                    {/* Accordéon sous-compteurs */}
                    <AnimatePresence>
                      {showPeople && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden pt-2 space-y-2 border-t border-border/60"
                        >
                          <p className="text-[11px] text-muted-foreground italic">
                            Précisez pour prioriser l'envoi des équipes d'astreinte :
                          </p>
                          {[
                            {
                              label: "Bébés / Nourrissons (0-2 ans)",
                              sub: "Biberons, chaleur, soins",
                              icon: Baby,
                              val: babies,
                              set: setBabies,
                              min: 0,
                              max: 20
                            },
                            {
                              label: "Femmes enceintes ou allaitantes (nourrices)",
                              sub: "Grossesse ou allaitement en cours",
                              icon: Heart,
                              val: pregnant,
                              set: setPregnant,
                              min: 0,
                              max: 20
                            },
                            {
                              label: "Personnes âgées (65+ ans)",
                              sub: "Santé fragile, autonomie",
                              icon: UserRound,
                              val: elderly,
                              set: setElderly,
                              min: 0,
                              max: 20
                            },
                          ].map(({ label, sub, icon: IconComponent, val, set, min, max }) => (
                            <div
                              key={label}
                              className="flex items-center justify-between py-2 border-b border-border/40 last:border-0 gap-2"
                            >
                              <div className="min-w-0 flex items-center gap-2.5">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card border border-border/60 text-primary shadow-xs">
                                  <IconComponent className="h-4 w-4" />
                                </span>
                                <div className="min-w-0">
                                  <p className="text-xs sm:text-sm font-semibold text-foreground truncate">{label}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{sub}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => set(Math.max(min, val - 1))}
                                  aria-label={`Diminuer ${label}`}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors shadow-xs"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-5 text-center text-sm font-black tabular-nums">{val}</span>
                                <button
                                  type="button"
                                  onClick={() => set(Math.min(max, val + 1))}
                                  aria-label={`Augmenter ${label}`}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors shadow-xs"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))}

                          {(babies + pregnant + elderly > 0) && (
                            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                              <Zap className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                              <span>Priorité d'intervention maximale transmise à la CIE / SODECI</span>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* ── 3. Preuve Visuelle & Précisions (Photo / Note) ── */}
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-foreground">Photos & Précisions</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedType.reportCategory === "infrastructure"
                        ? "Une photo est requise pour documenter la dégradation"
                        : "Ajoutez une photo ou une note descriptive (optionnel)"}
                    </p>
                  </div>
                </div>

                {/* Boutons d'action Photo / Note */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPhoto(!showPhoto)}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-xs sm:text-sm font-bold transition-all",
                      showPhoto || selectedType.reportCategory === "infrastructure"
                        ? "border-primary bg-primary/10 text-primary"
                        : selectedType.reportCategory === "infrastructure" && photoUrls.length === 0
                        ? "border-amber-400 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    <Camera className="h-4 w-4 shrink-0" />
                    <span>Photo{selectedType.reportCategory === "infrastructure" ? " *" : ""}</span>
                    {photoUrls.length > 0 && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDesc(!showDesc)}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-xs sm:text-sm font-bold transition-all",
                      showDesc
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <span>Note</span>
                    {description && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </button>
                </div>

                {/* Tiroir Photo DIRECTEMENT sous les boutons */}
                <AnimatePresence>
                  {(showPhoto || selectedType.reportCategory === "infrastructure") && (
                    <motion.div
                      key="photo-upload"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden pt-2"
                    >
                      <PhotoUpload
                        onPhotosChanged={setPhotoUrls}
                        onGpsFromPhoto={async (lat, lng) => {
                          setLatitude(lat);
                          setLongitude(lng);
                          setGpsFromPhoto(true);
                          setGpsAccuracy(10);
                          setStoredGpsAgeMin(null);
                          try {
                            const result = await resolveCommune(lat, lng, 10);
                            setGpsSource(result.source);
                            if (!result.outsidePilotZone && result.commune) {
                              setDetectedCommune(result.commune);
                              setCommune(result.commune.nom);
                              setOutsidePilotZone(false);
                            }
                          } catch { /* silent */ }
                        }}
                        photoUrls={photoUrls}
                        isInfrastructure={selectedType.reportCategory === "infrastructure"}
                        allowNoPhotoToggle={true}
                        noPhotoChecked={noPhotoReason}
                        onNoPhotoToggle={(checked) => {
                          setNoPhotoReason(checked);
                          if (checked) setShowDesc(true);
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Tiroir Note DIRECTEMENT sous les boutons */}
                <AnimatePresence>
                  {showDesc && (
                    <motion.div
                      key="desc-input"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden pt-2 space-y-1.5"
                    >
                      <label htmlFor="description" className="text-xs font-semibold text-foreground">
                        Note complémentaire pour vos voisins & l'équipe d'intervention
                      </label>
                      <Textarea
                        id="description"
                        placeholder="Ex: Disjoncteur général qui a sauté, étincelles sur le poteau, robinet complètement à sec..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
                        rows={3}
                        className="bg-background text-sm"
                      />
                      <p className={`text-xs text-right ${description.length >= MAX_DESCRIPTION_LENGTH ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                        {description.length}/{MAX_DESCRIPTION_LENGTH}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── 4. Compteur CIE / SODECI (Optionnel et Repliable) ── */}
              {(selectedType.id === "electricity_outage" || selectedType.id === "water_outage") && (
                <div className="rounded-2xl border border-amber-400/40 bg-amber-500/5 overflow-hidden transition-all shadow-xs">
                  <button
                    type="button"
                    onClick={() => setShowMeter(!showMeter)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-amber-500/10 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {selectedType.id === "electricity_outage" ? (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                          <Zap className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/20 text-sky-600 dark:text-sky-400">
                          <Droplets className="h-4 w-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                          Compteur ou contrat {selectedType.id === "electricity_outage" ? "CIE" : "SODECI"}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {meterNumber ? `Compteur : ${meterNumber}` : "Facultatif — accélère le rétablissement ciblé"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {meterNumber ? (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                          Renseigné
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          Optionnel
                        </span>
                      )}
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", showMeter && "rotate-180")} />
                    </div>
                  </button>

                  <AnimatePresence>
                    {showMeter && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-amber-400/30 px-4 pb-3 pt-3 space-y-3 overflow-hidden"
                      >
                        {/* Type de contrat */}
                        <div>
                          <p className="text-xs font-semibold text-foreground mb-1.5">Type de contrat</p>
                          <div className="flex gap-2">
                            {(["prepaid", "postpaid"] as const).map((ct) => (
                              <button
                                key={ct}
                                type="button"
                                onClick={() => setContractType(ct)}
                                className={`flex-1 rounded-xl border-2 py-2 text-xs font-bold transition-all ${
                                  contractType === ct
                                    ? "border-amber-500 bg-amber-500/20 text-amber-800 dark:text-amber-200"
                                    : "border-border bg-card text-muted-foreground hover:border-amber-400/60"
                                }`}
                              >
                                {ct === "prepaid" ? "Prépayé (Carte)" : "Postpayé (Facture)"}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Numéro de compteur */}
                        <div>
                          <label htmlFor="meter-number" className="text-xs font-semibold text-foreground block mb-1.5">
                            Numéro de compteur
                          </label>
                          <Input
                            id="meter-number"
                            placeholder="Ex: 1234567890"
                            value={meterNumber}
                            onChange={(e) => setMeterNumber(e.target.value.trim())}
                            maxLength={20}
                            inputMode="numeric"
                            className="bg-background text-sm"
                          />
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Permet à l'opérateur d'identifier précisément votre raccordement
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* ── 5. Visiteur non connecté → Aha moment ── */}
              {!user ? (
                <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 text-center space-y-3">
                  <div className="flex justify-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <CheckCircle2 className="h-7 w-7" />
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-base text-foreground">Votre signalement est prêt !</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Créez un compte gratuit pour l'envoyer — vos voisins seront alertés immédiatement.
                    </p>
                  </div>
                  <div className="rounded-lg bg-background/60 border border-border p-3 text-xs text-left space-y-1">
                    <p className="text-muted-foreground font-medium">Votre signalement sera conservé :</p>
                    <p className="text-foreground">• Type : <strong>{selectedType.label}</strong></p>
                    {commune && <p className="text-foreground">• Commune : <strong>{commune}</strong></p>}
                    {resolvedQuartier && <p className="text-foreground">• Quartier : <strong>{resolvedQuartier}</strong></p>}
                  </div>
                  <div className="flex flex-col gap-2 pt-1">
                    <Button
                      asChild
                      className="w-full py-5 text-base font-bold"
                      style={{ backgroundColor: selectedCommuneData?.couleur || selectedType.color, color: "white" }}
                    >
                      <Link to={`/auth?tab=signup&redirect=${encodeURIComponent(`/signaler?type=${selectedType.id}&step=3`)}`}>
                        <UserPlus className="mr-2 h-5 w-5" /> Créer mon compte gratuitement
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full py-5 text-base font-bold">
                      <Link to={`/auth?tab=login&redirect=${encodeURIComponent(`/signaler?type=${selectedType.id}&step=3`)}`}>
                        <LogIn className="mr-2 h-5 w-5" /> J'ai déjà un compte
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {/* Avertissement GPS manquant */}
                  {!gpsLoading && latitude === null && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-warning/40 bg-warning/8 px-3 py-2.5">
                      <Navigation className="h-4 w-4 text-warning shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-warning">Position GPS requise</p>
                        <p className="text-xs text-muted-foreground">Activez la géolocalisation ou ajoutez une photo avec GPS intégré</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => captureGPS(true)}
                        className="shrink-0 rounded-lg bg-warning/15 px-2.5 py-1.5 text-xs font-semibold text-warning hover:bg-warning/25 transition-colors"
                      >
                        Localiser
                      </button>
                    </div>
                  )}

                  {/* Consentement GPS */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="gps-consent"
                        checked={gpsConsent}
                        onCheckedChange={(c) => setGpsConsent(c === true)}
                        className="mt-0.5"
                      />
                      <label htmlFor="gps-consent" className="text-xs sm:text-sm leading-relaxed cursor-pointer">
                        J'accepte que ma position GPS soit utilisée <strong>uniquement</strong> pour géolocaliser ce signalement.{" "}
                        <Link to="/confidentialite" className="text-primary underline text-xs">Politique de confidentialité</Link>
                      </label>
                    </div>
                  </div>

                  {/* Bouton envoyer */}
                  <Button
                    type="button"
                    size="lg"
                    className="w-full py-6 text-base font-bold rounded-2xl shadow-lg hover:opacity-95 transition-all"
                    style={{
                      backgroundColor: selectedCommuneData?.couleur || selectedType.color,
                      color: "white",
                    }}
                    disabled={submitting || limitReached || !gpsConsent || latitude === null}
                    onClick={handleSubmit}
                  >
                    {submitting ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Envoi en cours...</>
                    ) : gpsLoading ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Localisation...</>
                    ) : (
                      <><Send className="mr-2 h-5 w-5" /> Alerter mes voisins</>
                    )}
                  </Button>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>

        {/* ═══════════════════════════════════════════════
            BARRE D'ACTION FLOTTANTE STICKY (Fixe en bas de l'écran)
        ═══════════════════════════════════════════════ */}
        <AnimatePresence>
          {/* Étape 1 : Barre d'action sticky dès que le lieu est choisi */}
          {step === 1 && canReport && commune && resolvedQuartier && (
            <motion.div
              key="sticky-step1"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border shadow-[0_-8px_30px_rgb(0,0,0,0.15)] p-3 sm:p-4"
            >
              <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lieu validé</p>
                  <p className="text-xs sm:text-sm font-bold text-foreground truncate flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                    {commune}, {resolvedQuartier}
                  </p>
                </div>
                <Button
                  type="button"
                  size="lg"
                  onClick={handleLocationNext}
                  className="py-3 px-4 sm:px-6 text-xs sm:text-base font-bold rounded-xl shadow-lg bg-primary text-primary-foreground hover:opacity-90 transition-all shrink-0"
                >
                  Choisir le problème →
                </Button>
              </div>
            </motion.div>
          )}

          {/* Étape 2 : Barre d'action sticky dès qu'un incident est sélectionné */}
          {step === 2 && selectedType && (
            <motion.div
              key="sticky-step2"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border shadow-[0_-8px_30px_rgb(0,0,0,0.15)] p-3 sm:p-4"
            >
              <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1 flex items-center gap-2.5">
                  <span
                    className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl text-base sm:text-lg font-bold shadow-xs border"
                    style={{ backgroundColor: selectedType.color + "20", borderColor: selectedType.color + "40" }}
                  >
                    {selectedType.image ? (
                      <img src={selectedType.image} alt={selectedType.label} className="h-6 w-6 object-contain" />
                    ) : (
                      selectedType.emoji
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Incident choisi</p>
                    <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                      {selectedType.label}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="lg"
                  onClick={handleTypeNext}
                  style={{ backgroundColor: selectedType.color, color: "white" }}
                  className="py-2.5 px-3 sm:py-3 sm:px-6 text-xs sm:text-base font-bold rounded-xl shadow-lg hover:opacity-95 transition-all shrink-0 gap-1.5"
                >
                  <span className="sm:hidden">Preuves →</span>
                  <span className="hidden sm:inline">Continuer vers les preuves →</span>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════════════
            Dialog — Signalements similaires détectés
        ═══════════════════════════════════════════════ */}
        <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Coupure déjà signalée
              </DialogTitle>
              <DialogDescription>
                Des voisins ont déjà signalé cette coupure dans votre quartier. Vous pouvez confirmer leur signalement pour le renforcer, ou créer un nouveau.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {similarReports.map((r) => {
                const isElec = r.service_type === "electricity";
                const timeAgo = (() => {
                  const mins = (Date.now() - new Date(r.created_at).getTime()) / 60000;
                  if (mins < 60) return `il y a ${Math.round(mins)} min`;
                  const h = Math.floor(mins / 60);
                  if (h < 24) return `il y a ${h}h`;
                  return `il y a ${Math.floor(h / 24)}j`;
                })();

                return (
                  <div key={r.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {isElec ? (
                          <Zap className="h-5 w-5 text-amber-500 shrink-0" />
                        ) : (
                          <Droplets className="h-5 w-5 text-blue-500 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">
                            {isElec ? "Électricité" : "Eau"}
                            {r.quartier ? <span className="font-normal text-muted-foreground"> · {r.quartier}</span> : null}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{r.description}</p>
                          <p className="text-xs text-muted-foreground">{timeAgo}</p>
                        </div>
                      </div>
                    </div>
                    <CorroborationStatus verifications={r.verifications} compact />
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <Button
                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs h-9"
                        onClick={() => handleCorroborateExisting(r.id)}
                        disabled={corroborating === r.id}
                      >
                        {corroborating === r.id ? (
                          <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Confirmation…</>
                        ) : (
                          <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Confirmer en 1 clic</>
                        )}
                      </Button>
                      <Button
                        variant="secondary"
                        className="flex-1 border border-primary/20 bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs h-9"
                        onClick={() => handleAttachToExisting(r)}
                      >
                        <Layers className="mr-1.5 h-3.5 w-3.5" /> Rattacher mes photos & précisions
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-border">
              <Button
                variant="outline"
                className="w-full"
                onClick={proceedToStep3}
              >
                Non, c'est un problème distinct — créer un incident séparé
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ═══════════════════════════════════════════════
            Onboarding modal — complétion profil guidée
        ═══════════════════════════════════════════════ */}
        <OnboardingModal
          open={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          missingFields={onboardingMissingFields}
          initialCommune={userProfileCommune}
          initialQuartier={userProfileQuartier}
          initialPhone={userPhone}
          onComplete={({ commune: c, quartier: q, phone: p }) => {
            pendingSubmitRef.current = true;
            if (onboardingMissingFields.includes("commune")) setUserProfileCommune(c);
            if (onboardingMissingFields.includes("quartier")) setUserProfileQuartier(q);
            if (onboardingMissingFields.includes("phone")) setUserPhone(p);
            setShowOnboarding(false);
          }}
        />
        </div>
      </main>
    </div>
  );
};

export default ReportPage;
