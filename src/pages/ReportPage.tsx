import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, MapPin, Navigation, Loader2, Users, Baby, Heart, UserRound,
  ChevronDown, Plus, Minus, ArrowLeft, Camera, MessageSquare, Clock,
  LogIn, UserPlus, AlertTriangle, CheckCircle2,
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
import SOSButtons from "@/components/SOSButtons";
import { fuiteEauIcon, caniveauIcon, voirieIcon, lampadaireIcon } from "@/lib/infra-icons";
import QuartierSearch from "@/components/QuartierSearch";
import OnboardingModal from "@/components/OnboardingModal";
import { reportDetailsSchema } from "@/lib/report-schema";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/constants";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { cn } from "@/lib/utils";

// ─── Types de signalement ────────────────────────────────────────────────────

type ReportTypeId =
  | "electricity_outage"
  | "water_outage"
  | "street_light"
  | "water_leak"
  | "drain_blocked"
  | "pothole"
  | "road_damage"
  | "open_sewer"
  | "market_waste"
  | "illegal_dump"
  | "other";

interface ReportTypeConfig {
  id: ReportTypeId;
  emoji: string;
  label: string;
  description?: string;
  image?: string;
  color: string;
  serviceType: ServiceType;
  reportCategory: "outage" | "infrastructure";
  defaultDesc: (commune: string) => string;
}

const REPORT_TYPES: ReportTypeConfig[] = [
  {
    id: "electricity_outage",
    emoji: "⚡",
    label: "Coupure d'électricité",
    color: "#F59E0B",
    serviceType: "electricity",
    reportCategory: "outage",
    defaultDesc: (c) => `Coupure d'électricité à ${c}`,
  },
  {
    id: "water_outage",
    emoji: "💧",
    label: "Coupure d'eau",
    color: "#3B82F6",
    serviceType: "water",
    reportCategory: "outage",
    defaultDesc: (c) => `Coupure d'eau à ${c}`,
  },
  {
    id: "street_light",
    emoji: "💡",
    label: "Lampadaire cassé",
    color: "#EAB308",
    serviceType: "electricity",
    reportCategory: "infrastructure",
    defaultDesc: (c) => `Lampadaire cassé / éteint à ${c}`,
  },
  {
    id: "water_leak",
    emoji: "🚿",
    label: "Fuite d'eau",
    description: "À l'extérieur de votre maison",
    image: fuiteEauIcon,
    color: "#06B6D4",
    serviceType: "water",
    reportCategory: "infrastructure",
    defaultDesc: (c) => `Fuite d'eau à l'extérieur d'une maison à ${c}`,
  },
  {
    id: "drain_blocked",
    emoji: "🚧",
    label: "Caniveau bouché",
    color: "#10B981",
    serviceType: "mairie" as any,
    reportCategory: "infrastructure",
    defaultDesc: (c) => `Caniveau bouché / débordement à ${c}`,
  },
  {
    id: "pothole",
    emoji: "🛣️",
    label: "Nid de poule",
    color: "#10B981",
    serviceType: "mairie" as any,
    reportCategory: "infrastructure",
    defaultDesc: (c) => `Nid de poule / route dégradée à ${c}`,
  },
  {
    id: "road_damage",
    emoji: "🛤️",
    label: "Voirie dégradée",
    description: "Trottoir cassé, pavé, glissière...",
    color: "#8B5CF6",
    serviceType: "mairie" as any,
    reportCategory: "infrastructure",
    defaultDesc: (c) => `Voirie / trottoir dégradé à ${c}`,
  },
  {
    id: "open_sewer",
    emoji: "🕳️",
    label: "Égout à ciel ouvert",
    description: "Bouche d'égout ouverte / dangereuse",
    color: "#6B7280",
    serviceType: "mairie" as any,
    reportCategory: "infrastructure",
    defaultDesc: (c) => `Égout ou bouche d'égout ouvert à ${c}`,
  },
  {
    id: "market_waste",
    emoji: "🏪",
    label: "Déchets de marché",
    description: "Ordures non ramassées autour du marché",
    color: "#F97316",
    serviceType: "mairie" as any,
    reportCategory: "infrastructure",
    defaultDesc: (c) => `Déchets non ramassés autour du marché à ${c}`,
  },
  {
    id: "illegal_dump",
    emoji: "🗑️",
    label: "Dépôt sauvage",
    color: "#10B981",
    serviceType: "mairie" as any,
    reportCategory: "infrastructure",
    defaultDesc: (c) => `Dépôt sauvage d'ordures à ${c}`,
  },
  {
    id: "other",
    emoji: "➕",
    label: "Autre",
    color: "#10B981",
    serviceType: "mairie" as any,
    reportCategory: "infrastructure",
    defaultDesc: (c) => `Signalement à ${c}`,
  },
];

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

  // Wizard — si step=2 dans l'URL (retour depuis auth après signalement anonyme), avancer directement
  const [step, setStep] = useState<1 | 2>(() => searchParams.get("step") === "2" ? 2 : 1);

  // Étape 1
  const [selectedType, setSelectedType] = useState<ReportTypeConfig | null>(null);
  const [customTypeDesc, setCustomTypeDesc] = useState("");

  // Étape 2
  const [commune, setCommune] = useState("");
  const [quartier, setQuartier] = useState("");
  const [customQuartier, setCustomQuartier] = useState("");
  const [dbQuartiers, setDbQuartiers] = useState<Record<string, string[]>>({});

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
  const [showTime, setShowTime] = useState(false);
  const [showPeople, setShowPeople] = useState(false);
  const [gpsConsent, setGpsConsent] = useState(false);

  // CIE / SODECI — compteur & contrat
  const [meterNumber, setMeterNumber] = useState("");
  const [contractType, setContractType] = useState<"prepaid" | "postpaid">("prepaid");

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
    if (!navigator.geolocation) {
      setGpsLoading(false);
      if (showError) toast.error("Géolocalisation non supportée");
      return;
    }

    setGpsLoading(true);
    setGpsRetrying(false);
    setGpsWeakSignal(false);

    const getPosition = (): Promise<GeolocationPosition> =>
      new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000,
        })
      );

    // Jusqu'à 3 tentatives — on garde la lecture avec la meilleure précision
    let bestPos: GeolocationPosition | null = null;
    const MAX_ATTEMPTS = 3;
    const GOOD_ACCURACY_M = 80;
    const WEAK_ACCURACY_M = 300;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        if (attempt > 1) {
          setGpsRetrying(true);
          await new Promise((r) => setTimeout(r, 3000));
        }
        const pos = await getPosition();
        if (!bestPos || pos.coords.accuracy < bestPos.coords.accuracy) {
          bestPos = pos;
        }
        if (bestPos.coords.accuracy <= GOOD_ACCURACY_M) break; // assez précis
      } catch {
        break;
      }
    }

    setGpsRetrying(false);

    if (!bestPos) {
      // Option A — essayer la position mémorisée (< 2h)
      try {
        const raw = localStorage.getItem("signa_last_gps_v2");
        if (raw) {
          const stored = JSON.parse(raw) as { lat: number; lng: number; accuracy: number; commune: Commune; timestamp: number };
          const ageMin = (Date.now() - stored.timestamp) / 60000;
          if (ageMin < 120 && stored.lat && stored.lng && stored.commune) {
            setLatitude(stored.lat);
            setLongitude(stored.lng);
            setGpsAccuracy(stored.accuracy);
            setGpsWeakSignal(stored.accuracy > 300);
            setDetectedCommune(stored.commune);
            setCommune(stored.commune.nom);
            setOutsidePilotZone(false);
            setStoredGpsAgeMin(Math.round(ageMin));
            setGpsLoading(false);
            return;
          }
        }
      } catch { /* silent */ }
      setGpsLoading(false);
      if (showError) toast.error("Impossible d'obtenir votre position. Vérifiez les permissions GPS.");
      return;
    }

    const lat = bestPos.coords.latitude;
    const lon = bestPos.coords.longitude;
    const accuracy = bestPos.coords.accuracy;

    setLatitude(lat);
    setLongitude(lon);
    setGpsAccuracy(accuracy);
    setGpsWeakSignal(accuracy > WEAK_ACCURACY_M);

    // Résolution 4 tiers (GeoJSON → Nominatim → Google → Haversine)
    const result = await resolveCommune(lat, lon, accuracy);
    setGpsSource(result.source);

    if (!result.outsidePilotZone && result.commune) {
      setDetectedCommune(result.commune);
      setCommune(result.commune.nom);
      setOutsidePilotZone(false);
      setStoredGpsAgeMin(null); // position fraîche
      // Sauvegarder pour le fallback "position mémorisée"
      try {
        localStorage.setItem("signa_last_gps_v2", JSON.stringify({
          lat, lng: lon, accuracy, commune: result.commune, timestamp: Date.now(),
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
    setSelectedType(type);
    track("type_selected", { type_id: type.id, category: type.reportCategory, service: type.serviceType });
    if ("vibrate" in navigator) navigator.vibrate([20]);
  };

  const handleLocationNext = async () => {
    if (!commune || !resolvedQuartier) {
      toast.error("Sélectionnez la commune et le quartier");
      return;
    }
    if (latitude === null || longitude === null) {
      toast.error("Position GPS requise. Activez la géolocalisation.");
      return;
    }

    // Vérification doublons — similarReports est déjà pré-chargé par le useEffect
    // (dès que quartier est sélectionné). On affiche le dialog si des résultats existent.
    if (selectedType?.reportCategory === "outage" && user && similarReports.length > 0) {
      setShowDuplicateDialog(true);
      return;
    }

    // Auto-ouvrir le panel photo pour les signalements infrastructure (photo obligatoire)
    if (selectedType?.reportCategory === "infrastructure") {
      setShowPhoto(true);
    }
    setStep(2);
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
        proceedToStep2();
      } else {
        toast.error(msg);
      }
    } finally {
      setCorroborating(null);
    }
  };

  const proceedToStep2 = () => {
    setShowDuplicateDialog(false);
    if (selectedType?.reportCategory === "infrastructure") {
      setShowPhoto(true);
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (limitReached) { toast.error(`Limite de ${DAILY_LIMIT} signalements / jour atteinte`); return; }
    if (latitude === null || longitude === null) { toast.error("Position GPS requise"); return; }
    if (!gpsFromPhoto && storedGpsAgeMin === null && gpsAccuracy !== null && gpsAccuracy > 300 && !isAdmin && !isTestAccount) {
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
    if (!gpsConsent) { toast.error("Acceptez l'utilisation de votre position GPS"); return; }
    if (selectedType.reportCategory === "infrastructure" && photoUrls.length === 0) {
      toast.error("Une photo est obligatoire pour ce type de signalement");
      setShowPhoto(true);
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
      const vulnParts: string[] = [];
      if (babies > 0) vulnParts.push(`${babies} bébé(s)`);
      if (pregnant > 0) vulnParts.push(`${pregnant} femme(s) enceinte(s)`);
      if (elderly > 0) vulnParts.push(`${elderly} personne(s) âgée(s)`);
      const impactInfo = `[${impactedPeople} personne(s)${vulnParts.length ? ` dont ${vulnParts.join(", ")}` : ""}]`;
      const fullDesc = `${fullBaseDesc} ${impactInfo}`.slice(0, 600);
      const hasVulnerable = babies > 0 || pregnant > 0 || elderly > 0;

      const canonicalQuartier = normalizeQuartier(resolvedQuartier, commune);
      const effectiveQuartierName =
        quartier === "__other" && customQuartier && customQuartier.trim() !== ""
          ? customQuartier.trim()
          : canonicalQuartier;

      const reportPayload = {
        user_id: user.id,
        service_type: selectedType.serviceType,
        report_category: selectedType.reportCategory,
        description: fullDesc,
        location: commune,
        commune,
        quartier: effectiveQuartierName,
        custom_quartier: quartier === "__other" ? customQuartier?.trim() || null : null,
        latitude,
        longitude,
        urgency: hasVulnerable ? "high" : "medium",
        start_time: reportStartTime,
        photo_url: photoUrls[0] || null,
        photo_urls: photoUrls.length > 0 ? photoUrls : null,
        impacted_people: impactedPeople,
        babies,
        pregnant,
        elderly,
        meter_number: meterNumber || null,
        ...(selectedType.id === "electricity_outage" || selectedType.id === "water_outage"
          ? { contract_type: contractType || null }
          : {}),
      };

      // -- Offline: save to queue and exit ----------------------------------
      if (!isOnline) {
        localStorage.removeItem(DRAFT_KEY);
        enqueue(reportPayload);
        toast.success("Sauvegardé. Sera envoyé à la reconnexion.", {
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
      <main className="container max-w-md py-6 px-4">

        {/* Indicateur de progression */}
        <div className="mb-6 space-y-2.5">
          <div className="flex items-center gap-2">
            {([1, 2] as const).map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  step === s
                    ? "bg-primary text-primary-foreground shadow-md"
                    : step > s
                    ? "bg-success text-success-foreground"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {step > s ? "✓" : s}
                </div>
                <span className={`text-xs hidden sm:block ${step === s ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                  {s === 1 ? "Type & Lieu" : "Finaliser"}
                </span>
                {s < 2 && <div className={`flex-1 h-0.5 ${step > s ? "bg-success" : "bg-muted"}`} />}
              </div>
            ))}
          </div>
          <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              animate={{ width: step === 1 ? "50%" : "100%" }}
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
              ÉTAPE 1 — Type + Localisation
          ═══════════════════════════════════════════════ */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="text-center">
                <h1 className="text-2xl font-bold">Que se passe-t-il ?</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedType ? "Confirmez ensuite votre localisation" : "Touchez un type pour continuer"}
                </p>
              </div>

              {/* Grille des types — coupures réseau */}
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Coupure de réseau</p>
              <div className="grid grid-cols-2 gap-3">
                {REPORT_TYPES.filter((t) => t.reportCategory === "outage").map((type) => {
                  const isSelected = selectedType?.id === type.id;
                  return (
                    <motion.button
                      key={type.id}
                      type="button"
                      whileTap={{ scale: 0.94 }}
                      onClick={() => handleTypeSelect(type)}
                      className="group flex flex-col items-center gap-2.5 rounded-2xl border-2 p-5 text-center transition-all duration-150 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      style={{
                        borderColor: isSelected ? type.color : undefined,
                        backgroundColor: isSelected ? type.color + colorAlpha : undefined,
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = type.color;
                          e.currentTarget.style.backgroundColor = type.color + hoverAlpha;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = "";
                          e.currentTarget.style.backgroundColor = "";
                        }
                      }}
                    >
                      {type.image
                        ? <img src={type.image} alt={type.label} className="h-10 w-10 object-contain rounded-lg" />
                        : <span className="text-4xl leading-none">{type.emoji}</span>
                      }
                      <span className="text-xs font-semibold leading-tight text-foreground">{type.label}</span>
                      {type.description && (
                        <span className="text-xs leading-tight text-muted-foreground">{type.description}</span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Grille des types — infrastructure */}
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Problème d'infrastructure</p>
              <div className="grid grid-cols-2 gap-2">
                {REPORT_TYPES.filter((t) => t.reportCategory === "infrastructure").map((type) => {
                  const isSelected = selectedType?.id === type.id;
                  return (
                    <motion.button
                      key={type.id}
                      type="button"
                      whileTap={{ scale: 0.94 }}
                      onClick={() => handleTypeSelect(type)}
                      className="group flex flex-col items-center gap-2 rounded-xl border-2 p-3.5 text-center transition-all duration-150 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      style={{
                        borderColor: isSelected ? type.color : undefined,
                        backgroundColor: isSelected ? type.color + colorAlpha : undefined,
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = type.color;
                          e.currentTarget.style.backgroundColor = type.color + hoverAlpha;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = "";
                          e.currentTarget.style.backgroundColor = "";
                        }
                      }}
                    >
                      {type.image
                        ? <img src={type.image} alt={type.label} className="h-8 w-8 object-contain rounded-md" />
                        : <span className="text-3xl leading-none">{type.emoji}</span>
                      }
                      <span className="text-xs font-semibold leading-tight text-foreground">{type.label}</span>
                      {type.description && (
                        <span className="text-xs leading-tight text-muted-foreground">{type.description}</span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Section localisation — visible après sélection du type */}
              <AnimatePresence>
                {selectedType && (
                  <motion.div
                    key="location-section"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4 pt-2"
                  >
                    {/* Séparateur + label */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-border" />
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: selectedType.color + "20" }}
                        >
                          {selectedType.image
                            ? <img src={selectedType.image} alt="" className="h-4 w-4 object-contain" />
                            : <span className="text-base leading-none">{selectedType.emoji}</span>}
                        </span>
                        <span>{selectedType.label} — où ?</span>
                      </div>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    {/* Champ libre si "Autre" */}
                    {selectedType.id === "other" && (
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

                    {/* Hint GPS */}
                    <p className="flex items-start gap-1.5 text-xs text-muted-foreground px-1">
                      <Navigation className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary/60" aria-hidden="true" />
                      <span>Soyez <strong>proche du problème</strong> pour une meilleure localisation.</span>
                    </p>

                    {/* Bannière GPS */}
                    <div
                      className="rounded-xl border-2 p-4 transition-colors"
                      style={{ borderColor: detectedCommune?.couleur || "var(--border)" }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPin className="h-4 w-4 shrink-0" style={{ color: detectedCommune?.couleur }} />
                          {gpsLoading ? (
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              {gpsRetrying ? "Amélioration du signal…" : "Détection GPS..."}
                            </span>
                          ) : detectedCommune ? (
                            <span className="font-bold text-sm truncate" style={{ color: detectedCommune.couleur }}>
                              {detectedCommune.nom} ✓
                            </span>
                          ) : outsidePilotZone ? (
                            <span className="text-sm text-destructive font-medium">⚠️ Hors zone pilote</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">GPS non disponible</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => captureGPS(true)}
                          disabled={gpsLoading}
                          className="flex shrink-0 items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium hover:bg-muted/70 transition-colors disabled:opacity-50"
                        >
                          <Navigation className="h-3 w-3" />
                          {latitude ? "Relocaliser" : "Localiser"}
                        </button>
                      </div>
                      {latitude && longitude && (
                        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                          <p className="text-xs text-muted-foreground font-mono">
                            {latitude.toFixed(5)}, {longitude.toFixed(5)}
                          </p>
                          {gpsAccuracy !== null && (
                            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium border ${
                              gpsAccuracy <= 80
                                ? "bg-success/10 text-success border-success/25"
                                : gpsAccuracy <= 200
                                ? "bg-warning/10 text-warning border-warning/25"
                                : "bg-destructive/10 text-destructive border-destructive/25"
                            }`}>
                              ± {Math.round(gpsAccuracy)} m
                            </span>
                          )}
                          {gpsSource && (
                            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium border bg-muted text-muted-foreground border-border">
                              {gpsSource === "geojson" ? "polygone" : gpsSource}
                            </span>
                          )}
                        </div>
                      )}
                      {gpsWeakSignal && !outsidePilotZone && detectedCommune && storedGpsAgeMin === null && (
                        <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          Signal GPS faible — déplacez-vous près d'une fenêtre pour améliorer la précision
                        </p>
                      )}
                      {storedGpsAgeMin !== null && latitude !== null && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/8 px-3 py-2.5"
                        >
                          <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                              📍 Position mémorisée il y a {storedGpsAgeMin < 60 ? `${storedGpsAgeMin} min` : `${Math.round(storedGpsAgeMin / 60)}h`}
                            </p>
                            <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                              Vous avez peut-être quitté le lieu — vous pouvez quand même finaliser votre signalement.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs shrink-0 text-amber-700"
                            onClick={() => captureGPS(true)}
                            disabled={gpsLoading}
                          >
                            <Navigation className="h-3 w-3 mr-1" />
                            Relocaliser
                          </Button>
                        </motion.div>
                      )}
                    </div>

                    {/* Blocage hors zone pilote */}
                    {!gpsLoading && (outsidePilotZone || (!detectedCommune && !gpsLoading)) && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 p-5 text-center space-y-3"
                      >
                        <div className="flex justify-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15">
                            <MapPin className="h-6 w-6 text-amber-500" />
                          </div>
                        </div>
                        <h3 className="font-bold text-foreground text-sm">
                          {outsidePilotZone
                            ? "Vous êtes en dehors de nos communes pilotes"
                            : "Position GPS non disponible"}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {outsidePilotZone
                            ? "SIGNA·CI est actuellement disponible dans 7 communes d'Abidjan : Abobo, Adjamé, Bingerville, Cocody, Koumassi, Port-Bouët et Yopougon. Nous travaillons à étendre notre couverture très bientôt."
                            : "Pour signaler un problème, nous avons besoin de votre position GPS afin de vérifier que vous êtes dans une commune pilote. Veuillez autoriser la géolocalisation dans les paramètres de votre navigateur."}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => captureGPS(true)}
                          disabled={gpsLoading}
                          className="mx-auto"
                        >
                          <Navigation className="h-3.5 w-3.5 mr-1.5" />
                          Réessayer la localisation
                        </Button>
                      </motion.div>
                    )}

                    {/* Commune & Quartier */}
                    {canReport && (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold">Commune *</label>
                          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-4 py-3">
                            <span className="h-3 w-3 rounded-full inline-block" style={{ backgroundColor: detectedCommune?.couleur }} />
                            <span className="font-semibold text-sm text-foreground">{commune}</span>
                            <span className="text-xs text-muted-foreground ml-auto">détectée par GPS</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-semibold">Quartier *</label>
                          <QuartierSearch
                            quartiers={getQuartiersForCommune(commune)}
                            value={quartier}
                            onChange={setQuartier}
                          />
                          {quartier === "__other" && (
                            <>
                              <label htmlFor="custom-quartier" className="text-xs font-medium text-muted-foreground">Nom du quartier *</label>
                              <Input
                                id="custom-quartier"
                                placeholder="Ex: Williamsville plateau"
                                value={customQuartier}
                                onChange={(e) => setCustomQuartier(e.target.value)}
                                maxLength={100}
                                autoFocus
                              />
                            </>
                          )}
                        </div>

                        <Button
                          type="button"
                          className="w-full py-5 text-base font-bold"
                          style={{ backgroundColor: selectedType.color, color: "white" }}
                          onClick={handleLocationNext}
                          disabled={!commune || !resolvedQuartier || !latitude}
                        >
                          Continuer →
                        </Button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-2">
                <SOSButtons />
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════
              ÉTAPE 2 — Confirmation + envoi
          ═══════════════════════════════════════════════ */}
          {step === 2 && selectedType && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 pb-32 md:pb-0"
            >
              {/* En-tête */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  aria-label="Retour à l'étape précédente"
                  className="rounded-full p-2 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <h1 className="font-bold text-xl">Finaliser l'alerte</h1>
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
                  </div>
                </div>
              </div>

              {/* ── Détails ── */}
              <div className="space-y-3">
                <p className="text-xs text-center text-muted-foreground">
                  {selectedType.reportCategory === "infrastructure"
                    ? "Une photo est obligatoire pour ce type de signalement"
                    : "Ajoutez des détails pour aider vos voisins (optionnel)"}
                </p>

                {/* Grille de boutons */}
                <div className={`grid gap-2 ${selectedType.reportCategory === "outage" ? "grid-cols-2" : "grid-cols-2"}`}>
                  {/* Note */}
                  <button
                    type="button"
                    onClick={() => setShowDesc(!showDesc)}
                    aria-expanded={showDesc}
                    aria-controls="panel-note"
                    className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-all ${
                      showDesc
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Note
                    {description && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </button>

                  {/* Photo */}
                  <button
                    type="button"
                    onClick={() => setShowPhoto(!showPhoto)}
                    aria-expanded={showPhoto}
                    aria-controls="panel-photo"
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-all",
                      showPhoto
                        ? "border-primary bg-primary/10 text-primary"
                        : selectedType.reportCategory === "infrastructure" && photoUrls.length === 0
                        ? "border-amber-400 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    <Camera className="h-4 w-4" />
                    Photo{selectedType.reportCategory === "infrastructure" ? " *" : ""}
                    {photoUrls.length > 0 && <span className="h-2 w-2 rounded-full bg-primary" />}
                    {selectedType.reportCategory === "infrastructure" && photoUrls.length === 0 && !showPhoto && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                      </span>
                    )}
                  </button>

                  {/* Heure — coupures uniquement */}
                  {selectedType.reportCategory === "outage" && (
                    <button
                      type="button"
                      onClick={() => setShowTime(!showTime)}
                      aria-expanded={showTime}
                      aria-controls="panel-time"
                      className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-all ${
                        showTime
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      <Clock className="h-4 w-4" />
                      Heure début
                      {startTime && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </button>
                  )}

                </div>

                {/* ── Compteur CIE / SODECI ── optionnel, accélère la transmission SIGNA → opérateur */}
                {(selectedType.id === "electricity_outage" || selectedType.id === "water_outage") && (
                  <div className="rounded-xl border-2 border-amber-400/40 bg-amber-50/60 dark:bg-amber-900/10 overflow-hidden">
                    <div className="px-4 py-3 flex items-center gap-2">
                      <span className="text-lg">{selectedType.id === "electricity_outage" ? "⚡" : "💧"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground leading-tight">
                          Informations {selectedType.id === "electricity_outage" ? "CIE" : "SODECI"} <span className="text-muted-foreground font-normal text-xs">(optionnel)</span>
                        </p>
                        <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                          SIGNA·CI transmettra votre signalement à l'opérateur — ces infos accélèrent la prise en charge
                        </p>
                      </div>
                    </div>
                    <div className="border-t border-amber-400/30 px-4 pb-3 pt-2 space-y-3">
                      {/* Type de contrat */}
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-1.5">Type de contrat</p>
                        <div className="flex gap-2">
                          {(["prepaid", "postpaid"] as const).map((ct) => (
                            <button
                              key={ct}
                              type="button"
                              onClick={() => setContractType(ct)}
                              className={`flex-1 rounded-lg border-2 py-2 text-sm font-semibold transition-all ${
                                contractType === ct
                                  ? "border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                  : "border-border bg-card text-muted-foreground hover:border-amber-400/60"
                              }`}
                            >
                              {ct === "prepaid" ? "Prépayé" : "Postpayé"}
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
                          className="bg-background"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Permet à la {selectedType.id === "electricity_outage" ? "CIE" : "SODECI"} de vous identifier et vous contacter directement
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Personnes vulnérables — accordion visible (coupures uniquement) */}
                {selectedType.reportCategory === "outage" && (
                  <div className="rounded-xl border-2 border-border bg-card overflow-hidden transition-colors">
                    {/* Header avec toggle Oui/Non */}
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-semibold text-foreground">
                          Personnes vulnérables dans votre foyer ?
                        </span>
                        {(babies + pregnant + elderly > 0) && (
                          <span className="inline-flex items-center rounded-full bg-destructive/10 border border-destructive/20 px-1.5 py-0.5 text-xs font-bold text-destructive">
                            ⚠️ Priorité haute
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
                        <button
                          type="button"
                          onClick={() => { setShowPeople(false); setBabies(0); setPregnant(0); setElderly(0); }}
                          className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                            !showPeople ? "bg-card shadow text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          Non
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPeople(true)}
                          className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                            showPeople ? "bg-card shadow text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          Oui →
                        </button>
                      </div>
                    </div>

                    {/* Contenu accordion */}
                    <AnimatePresence>
                      {showPeople && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-border px-4 pt-3 pb-3 space-y-1">
                            <p className="text-xs text-muted-foreground mb-3">
                              Ces informations priorisent votre signalement auprès des opérateurs.
                            </p>
                            {[
                              { label: "Personnes impactées", emoji: "👥", val: impactedPeople, set: setImpactedPeople, min: 1, max: 50 },
                              { label: "Bébés / Nourrissons (0-2 ans)", emoji: "👶", val: babies, set: setBabies, min: 0, max: 20 },
                              { label: "Femmes enceintes", emoji: "🤰", val: pregnant, set: setPregnant, min: 0, max: 20 },
                              { label: "Personnes âgées (65+ ans)", emoji: "👴", val: elderly, set: setElderly, min: 0, max: 20 },
                            ].map(({ label, emoji, val, set, min, max }) => (
                              <div key={label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                                <span className="text-sm flex items-center gap-2">
                                  <span className="text-base">{emoji}</span>
                                  <span className="text-foreground">{label}</span>
                                </span>
                                <div className="flex items-center gap-2.5">
                                  <button
                                    type="button"
                                    onClick={() => set(Math.max(min, val - 1))}
                                    aria-label={`Diminuer ${label}`}
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                  >
                                    <Minus className="h-3 w-3" aria-hidden="true" />
                                  </button>
                                  <span className="w-5 text-center text-sm font-bold tabular-nums" aria-live="polite">{val}</span>
                                  <button
                                    type="button"
                                    onClick={() => set(Math.min(max, val + 1))}
                                    aria-label={`Augmenter ${label}`}
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                  >
                                    <Plus className="h-3 w-3" aria-hidden="true" />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {(babies + pregnant + elderly > 0) && (
                              <p className="text-xs text-red-600 font-medium pt-1">
                                ⚠️ Personnes vulnérables détectées — urgence élevée automatique
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Panneau Note */}
                <AnimatePresence>
                  {showDesc && (
                    <motion.div
                      key="desc"
                      id="panel-note"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                        <label htmlFor="description" className="text-xs font-medium text-muted-foreground">Note complémentaire</label>
                        <Textarea
                          id="description"
                          placeholder="Décrivez la situation en quelques mots..."
                          value={description}
                          onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
                          rows={3}
                          autoFocus
                        />
                        <p className={`text-xs text-right ${description.length >= MAX_DESCRIPTION_LENGTH ? "text-destructive font-medium" : "text-muted-foreground"}`}>{description.length}/{MAX_DESCRIPTION_LENGTH}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Panneau Photo */}
                <AnimatePresence>
                  {showPhoto && (
                    <motion.div
                      key="photo"
                      id="panel-photo"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-xl border border-border bg-card p-3">
                        <PhotoUpload
                          onPhotosChanged={setPhotoUrls}
                          onGpsFromPhoto={async (lat, lng) => {
                            setLatitude(lat);
                            setLongitude(lng);
                            setGpsFromPhoto(true);
                            setGpsAccuracy(10); // EXIF = très précis
                            setStoredGpsAgeMin(null);
                            // Option C : résoudre la commune depuis les coordonnées EXIF
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
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Panneau Heure */}
                <AnimatePresence>
                  {showTime && selectedType.reportCategory === "outage" && (
                    <motion.div
                      key="time"
                      id="panel-time"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                        <div className="flex-1">
                          <label htmlFor="start-time" className="text-sm font-medium">Début de la coupure</label>
                          <p className="text-xs text-muted-foreground">Laissez vide si ça vient de commencer</p>
                        </div>
                        <Input
                          id="start-time"
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-28 text-center"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

              {/* Visiteur non connecté → Aha moment */}
              {!user ? (
                <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 text-center space-y-3">
                  <div className="flex justify-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-2xl">✅</span>
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
                      <Link to={`/auth?tab=signup&redirect=${encodeURIComponent(`/signaler?type=${selectedType.id}&step=2`)}`}>
                        <UserPlus className="mr-2 h-5 w-5" /> Créer mon compte gratuitement
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full py-5 text-base font-bold">
                      <Link to={`/auth?tab=login&redirect=${encodeURIComponent(`/signaler?type=${selectedType.id}&step=2`)}`}>
                        <LogIn className="mr-2 h-5 w-5" /> J'ai déjà un compte
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="fixed bottom-16 left-0 right-0 z-20 border-t border-border bg-background/95 backdrop-blur-md px-4 py-3 space-y-3 md:static md:z-auto md:bg-transparent md:backdrop-blur-none md:border-0 md:px-0 md:py-0">
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
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="gps-consent"
                        checked={gpsConsent}
                        onCheckedChange={(c) => setGpsConsent(c === true)}
                        className="mt-0.5"
                      />
                      <label htmlFor="gps-consent" className="text-sm leading-relaxed cursor-pointer">
                        J'accepte que ma position GPS soit utilisée <strong>uniquement</strong> pour géolocaliser ce signalement.{" "}
                        <Link to="/confidentialite" className="text-primary underline text-xs">Politique de confidentialité</Link>
                      </label>
                    </div>
                  </div>

                  {/* Bouton envoyer */}
                  <Button
                    type="button"
                    className="w-full py-6 text-base font-bold"
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
                        <span className="text-xl">{isElec ? "⚡" : "💧"}</span>
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
                    <Button
                      className="w-full bg-warning text-warning-foreground hover:bg-warning/90 font-semibold"
                      onClick={() => handleCorroborateExisting(r.id)}
                      disabled={corroborating === r.id}
                    >
                      {corroborating === r.id ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirmation…</>
                      ) : (
                        <><CheckCircle2 className="mr-2 h-4 w-4" /> Oui, je confirme cette coupure</>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-border">
              <Button
                variant="outline"
                className="w-full"
                onClick={proceedToStep2}
              >
                Non, c'est un nouveau problème — créer un signalement
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
      </main>
    </div>
  );
};

export default ReportPage;
