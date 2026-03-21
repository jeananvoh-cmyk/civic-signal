import { useState, useEffect } from "react";
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
import { COMMUNES, type Commune } from "@/lib/communes";
import { resolveCommune, type DetectionSource } from "@/lib/geolocation";
import { getQuartiers } from "@/lib/quartiers";
import type { ServiceType } from "@/lib/data";
import SOSButtons from "@/components/SOSButtons";
import { fuiteEauIcon, caniveauIcon, voirieIcon, lampadaireIcon } from "@/lib/infra-icons";
import QuartierSearch from "@/components/QuartierSearch";

// ─── Types de signalement ────────────────────────────────────────────────────

type ReportTypeId =
  | "electricity_outage"
  | "water_outage"
  | "street_light"
  | "water_leak"
  | "drain_blocked"
  | "pothole"
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
    image: caniveauIcon,
    color: "#10B981",
    serviceType: "mairie" as any,
    reportCategory: "infrastructure",
    defaultDesc: (c) => `Caniveau bouché / débordement à ${c}`,
  },
  {
    id: "pothole",
    emoji: "🛣️",
    label: "Nid de poule",
    image: voirieIcon,
    color: "#10B981",
    serviceType: "mairie" as any,
    reportCategory: "infrastructure",
    defaultDesc: (c) => `Nid de poule / route dégradée à ${c}`,
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

const DAILY_LIMIT = 5;

// ─── Composant ────────────────────────────────────────────────────────────────

const ReportPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Wizard
  const [step, setStep] = useState<1 | 2 | 3>(1);

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
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
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

  // Misc
  const [submitting, setSubmitting] = useState(false);
  const [dailyCount, setDailyCount] = useState<number | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [userProfileCommune, setUserProfileCommune] = useState<string | null>(null);
  const [userProfileQuartier, setUserProfileQuartier] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTestAccount, setIsTestAccount] = useState(false);

  // Duplicate detection
  interface SimilarReport {
    id: string;
    service_type: string;
    description: string;
    verifications: number;
    created_at: string;
    start_time: string;
    user_id: string;
  }
  const [similarReports, setSimilarReports] = useState<SimilarReport[]>([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [corroborating, setCorroborating] = useState<string | null>(null);

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
      setStep(2);
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
    setStep(2);
  };

  const handleLocationNext = async () => {
    if (!commune || !resolvedQuartier) {
      toast.error("Sélectionnez la commune et le quartier");
      return;
    }
    if (!latitude || !longitude) {
      toast.error("Position GPS requise. Activez la géolocalisation.");
      return;
    }

    // Check for existing similar reports (duplicate detection) — only for outage type
    if (selectedType?.reportCategory === "outage" && user) {
      setCheckingDuplicates(true);
      try {
        const { data, error } = await supabase.rpc("find_similar_reports", {
          p_commune: commune,
          p_quartier: resolvedQuartier,
          p_service_type: selectedType.serviceType,
          p_report_category: "outage",
        });
        if (!error && data && data.length > 0) {
          // Filter out own reports
          const otherReports = (data as SimilarReport[]).filter((r) => r.user_id !== user.id);
          if (otherReports.length > 0) {
            setSimilarReports(otherReports);
            setShowDuplicateDialog(true);
            setCheckingDuplicates(false);
            return;
          }
        }
      } catch {
        // Silently continue if RPC fails
      }
      setCheckingDuplicates(false);
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
      toast.success("✅ Merci ! Votre confirmation a été enregistrée. Le signalement existant est renforcé.");
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

  const proceedToStep3 = () => {
    setShowDuplicateDialog(false);
    if (selectedType?.reportCategory === "infrastructure") {
      setShowPhoto(true);
    }
    setStep(3);
  };

  const handleSubmit = async () => {
    if (limitReached) { toast.error(`Limite de ${DAILY_LIMIT} signalements / jour atteinte`); return; }
    if (!latitude || !longitude) { toast.error("Position GPS requise"); return; }
    if (!gpsFromPhoto && gpsAccuracy !== null && gpsAccuracy > 300 && !isAdmin && !isTestAccount) {
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
      const missingFields = [
        !userPhone?.trim() && "téléphone",
        !userProfileCommune?.trim() && "commune",
        !userProfileQuartier?.trim() && "quartier",
      ].filter(Boolean) as string[];
      if (missingFields.length > 0) {
        toast.error("Profil incomplet (40%)", {
          description: `Ajoutez votre ${missingFields.join(", ")} dans votre profil pour pouvoir faire un signalement.`,
          action: { label: "Compléter mon profil", onClick: () => navigate("/profil") },
          duration: 8000,
        });
        return;
      }
    }
    if (!gpsConsent) { toast.error("Acceptez l'utilisation de votre position GPS"); return; }
    if (selectedType.reportCategory === "infrastructure" && !photoUrl) {
      toast.error("📸 Une photo est obligatoire pour ce type de signalement");
      setShowPhoto(true);
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
      const fullDesc = `${fullBaseDesc} ${impactInfo}`;
      const hasVulnerable = babies > 0 || pregnant > 0 || elderly > 0;

      const { data: insertData, error } = await supabase.from("reports").insert({
        user_id: user.id,
        service_type: selectedType.serviceType,
        report_category: selectedType.reportCategory,
        description: fullDesc,
        location: commune,
        commune,
        quartier: resolvedQuartier,
        latitude,
        longitude,
        urgency: hasVulnerable ? "high" : "medium",
        start_time: reportStartTime,
        photo_url: photoUrl || null,
        impacted_people: impactedPeople,
        babies,
        pregnant,
        elderly,
      } as any).select("id").single();

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

      toast.success("✅ Signalement envoyé !");
      const reportId = (insertData as any)?.id;
      const params = new URLSearchParams({
        commune,
        type: selectedType.label,
        emoji: selectedType.emoji,
        quartier: resolvedQuartier,
        service: selectedType.serviceType,
        ...(reportId ? { id: reportId } : {}),
      });
      navigate(`/confirmation?${params.toString()}`);
    } catch (error: any) {
      const msg = error?.message || "";
      if (msg.includes("Rate limit exceeded")) {
        toast.error("⏱️ Trop de signalements ! Attendez 1 minute.");
      } else {
        toast.error(getUserFriendlyError(error, "Erreur lors de l'envoi"));
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
        <div className="mb-6 flex items-center gap-2">
          {([1, 2, 3] as const).map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                step === s
                  ? "bg-primary text-primary-foreground shadow-md"
                  : step > s
                  ? "bg-green-500 text-white"
                  : "bg-muted text-muted-foreground"
              }`}>
                {step > s ? "✓" : s}
              </div>
              <span className={`text-xs hidden sm:block ${step === s ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                {s === 1 ? "Type" : s === 2 ? "Lieu" : "Confirmer"}
              </span>
              {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? "bg-green-500" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        {/* Compteur journalier */}
        {dailyCount !== null && (
          <div className={`mb-4 rounded-xl border p-2.5 text-center text-xs font-medium ${
            limitReached
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : "border-border bg-card text-muted-foreground"
          }`}>
            {limitReached
              ? `🚫 Limite atteinte : ${dailyCount}/${DAILY_LIMIT} signalements aujourd'hui`
              : `📊 ${dailyCount}/${DAILY_LIMIT} signalements utilisés aujourd'hui`}
          </div>
        )}

        <AnimatePresence mode="wait">

          {/* ═══════════════════════════════════════════════
              ÉTAPE 1 — Choisir le type
          ═══════════════════════════════════════════════ */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-5 text-center">
                <h1 className="text-xl font-bold">Que se passe-t-il ?</h1>
                <p className="text-sm text-muted-foreground mt-1">Touchez un type pour continuer</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {REPORT_TYPES.map((type) => (
                  <motion.button
                    key={type.id}
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => handleTypeSelect(type)}
                    className="group flex flex-col items-center gap-2.5 rounded-2xl border-2 border-border bg-card p-5 text-center transition-all duration-150 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    style={{ "--hover-color": type.color } as any}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = type.color;
                      e.currentTarget.style.backgroundColor = type.color + "10";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "";
                      e.currentTarget.style.backgroundColor = "";
                    }}
                  >
                    {type.image
                      ? <img src={type.image} alt={type.label} className="h-10 w-10 object-contain rounded-lg" />
                      : <span className="text-4xl leading-none">{type.emoji}</span>
                    }
                    <span className="text-xs font-semibold leading-tight text-foreground">{type.label}</span>
                    {type.description && (
                      <span className="text-[10px] leading-tight text-muted-foreground">{type.description}</span>
                    )}
                  </motion.button>
                ))}
              </div>

              <div className="mt-6">
                <SOSButtons />
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════
              ÉTAPE 2 — Localisation
          ═══════════════════════════════════════════════ */}
          {step === 2 && selectedType && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* En-tête */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-full p-2 hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: selectedType.color + "20" }}
                  >
                    {selectedType.image
                      ? <img src={selectedType.image} alt={selectedType.label} className="h-7 w-7 object-contain" />
                      : <span className="text-2xl leading-none">{selectedType.emoji}</span>}
                  </span>
                  <div>
                    <p className="font-bold text-sm leading-tight">{selectedType.label}</p>
                    <p className="text-xs text-muted-foreground">Confirmez votre localisation</p>
                  </div>
                </div>
              </div>

              {/* Champ libre si "Autre" */}
              {selectedType.id === "other" && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <label className="text-sm font-semibold block">Précisez le problème *</label>
                  <Input
                    placeholder="Ex: Arbre tombé, route inondée..."
                    value={customTypeDesc}
                    onChange={(e) => setCustomTypeDesc(e.target.value)}
                    maxLength={80}
                    autoFocus
                  />
                </div>
              )}

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
                      <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium border ${
                        gpsAccuracy <= 80
                          ? "bg-green-50 text-green-700 border-green-200"
                          : gpsAccuracy <= 200
                          ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}>
                        ± {Math.round(gpsAccuracy)} m
                      </span>
                    )}
                    {gpsSource && (
                      <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium border bg-muted text-muted-foreground border-border">
                        {gpsSource === "geojson" ? "polygone" : gpsSource}
                      </span>
                    )}
                  </div>
                )}
                {gpsWeakSignal && !outsidePilotZone && detectedCommune && (
                  <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    Signal GPS faible — déplacez-vous près d'une fenêtre pour améliorer la précision
                  </p>
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
                      ? "SIGNA-CI est actuellement disponible dans 7 communes d'Abidjan : Abobo, Adjamé, Bingerville, Cocody, Koumassi, Port-Bouët et Yopougon. Nous travaillons à étendre notre couverture très bientôt. Merci pour votre intérêt ! 🙏"
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

              {/* Commune & Quartier — uniquement si dans zone pilote */}
              {canReport && (
                <>
                  {/* Commune */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Commune *</label>
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-4 py-3">
                      <span className="h-3 w-3 rounded-full inline-block" style={{ backgroundColor: detectedCommune?.couleur }} />
                      <span className="font-semibold text-sm text-foreground">{commune}</span>
                      <span className="text-xs text-muted-foreground ml-auto">détectée par GPS</span>
                    </div>
                  </div>

                  {/* Quartier — searchable */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Quartier *</label>
                    <QuartierSearch
                      quartiers={getQuartiersForCommune(commune)}
                      value={quartier}
                      onChange={setQuartier}
                    />
                    {quartier === "__other" && (
                      <Input
                        placeholder="Nom du quartier"
                        value={customQuartier}
                        onChange={(e) => setCustomQuartier(e.target.value)}
                        maxLength={100}
                        autoFocus
                      />
                    )}
                  </div>
                </>
              )}

              {canReport && (
                <Button
                  type="button"
                  className="w-full py-5 text-base font-bold"
                  style={{ backgroundColor: selectedType.color, color: "white" }}
                  onClick={handleLocationNext}
                  disabled={!commune || !resolvedQuartier || !latitude || checkingDuplicates}
                >
                  {checkingDuplicates ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Vérification…
                    </>
                  ) : (
                    "Continuer →"
                  )}
                </Button>
              )}
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════
              ÉTAPE 3 — Confirmation + envoi
          ═══════════════════════════════════════════════ */}
          {step === 3 && selectedType && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* En-tête */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-full p-2 hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <h1 className="font-bold text-lg">Confirmer le signalement</h1>
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
                    ? "📸 Une photo est obligatoire pour ce type de signalement"
                    : "Enrichissez votre signalement (optionnel)"}
                </p>

                {/* Grille de boutons */}
                <div className={`grid gap-2 ${selectedType.reportCategory === "outage" ? "grid-cols-2" : "grid-cols-2"}`}>
                  {/* Note */}
                  <button
                    type="button"
                    onClick={() => setShowDesc(!showDesc)}
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
                    className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-all ${
                      showPhoto
                        ? "border-primary bg-primary/10 text-primary"
                        : selectedType.reportCategory === "infrastructure" && !photoUrl
                        ? "border-amber-400 bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    <Camera className="h-4 w-4" />
                    Photo{selectedType.reportCategory === "infrastructure" ? " *" : ""}
                    {photoUrl && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </button>

                  {/* Heure — coupures uniquement */}
                  {selectedType.reportCategory === "outage" && (
                    <button
                      type="button"
                      onClick={() => setShowTime(!showTime)}
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

                  {/* Personnes — coupures uniquement */}
                  {selectedType.reportCategory === "outage" && (
                    <button
                      type="button"
                      onClick={() => setShowPeople(!showPeople)}
                      className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-all ${
                        showPeople
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      <Users className="h-4 w-4" />
                      Ménage
                      {(impactedPeople > 1 || babies + pregnant + elderly > 0) && (
                        <span className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </button>
                  )}
                </div>

                {/* Panneau Note */}
                <AnimatePresence>
                  {showDesc && (
                    <motion.div
                      key="desc"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                        <Textarea
                          placeholder="Décrivez la situation en quelques mots..."
                          value={description}
                          onChange={(e) => setDescription(e.target.value.slice(0, 300))}
                          rows={3}
                          autoFocus
                        />
                        <p className="text-xs text-muted-foreground text-right">{description.length}/300</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Panneau Photo */}
                <AnimatePresence>
                  {showPhoto && (
                    <motion.div
                      key="photo"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-xl border border-border bg-card p-3">
                        <PhotoUpload
                          onPhotoUploaded={setPhotoUrl}
                          onGpsFromPhoto={(lat, lng) => {
                            setLatitude(lat);
                            setLongitude(lng);
                            setGpsFromPhoto(true);
                          }}
                          photoUrl={photoUrl}
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
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium">Début de la coupure</p>
                          <p className="text-xs text-muted-foreground">Laissez vide si ça vient de commencer</p>
                        </div>
                        <Input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-28 text-center"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Panneau Personnes */}
                <AnimatePresence>
                  {showPeople && selectedType.reportCategory === "outage" && (
                    <motion.div
                      key="people"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-xl border border-border bg-card p-3 space-y-1">
                        <p className="text-xs text-muted-foreground mb-2">
                          Combien de personnes dans votre ménage sont touchées par cette coupure ?
                        </p>
                        {[
                          { label: "Personnes impactées dans le ménage", emoji: "👥", val: impactedPeople, set: setImpactedPeople, min: 1, max: 50 },
                          { label: "Bébés / Nourrissons (0-2 ans)", emoji: "👶", val: babies, set: setBabies, min: 0, max: 20 },
                          { label: "Femmes enceintes", emoji: "🤰", val: pregnant, set: setPregnant, min: 0, max: 20 },
                          { label: "Personnes âgées (65+ ans)", emoji: "👴", val: elderly, set: setElderly, min: 0, max: 20 },
                        ].map(({ label, emoji, val, set, min, max }) => (
                          <div key={label} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                            <span className="text-sm flex items-center gap-2">
                              <span className="text-base">{emoji}</span>
                              {label}
                            </span>
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => set(Math.max(min, val - 1))}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-border hover:bg-muted transition-colors"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-5 text-center text-sm font-bold tabular-nums">{val}</span>
                              <button
                                type="button"
                                onClick={() => set(Math.min(max, val + 1))}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-border hover:bg-muted transition-colors"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {(babies + pregnant + elderly > 0) && (
                          <p className="text-xs text-red-600 font-medium pt-1">
                            ⚠️ Personnes vulnérables — priorité élevée automatique
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Visiteur non connecté → Aha moment */}
              {!user ? (
                <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 text-center space-y-3">
                  <p className="text-2xl">✅</p>
                  <p className="font-bold text-base text-foreground">Votre signalement est prêt !</p>
                  <p className="text-sm text-muted-foreground">
                    Créez un compte gratuit en 30 secondes pour l'envoyer et aider vos voisins.
                  </p>
                  <div className="flex flex-col gap-2 pt-1">
                    <Button
                      asChild
                      className="w-full py-5 text-base font-bold"
                      style={{ backgroundColor: selectedCommuneData?.couleur || selectedType.color, color: "white" }}
                    >
                      <Link to={`/auth?tab=signup&redirect=/signaler?type=${selectedType.id}`}>
                        <UserPlus className="mr-2 h-5 w-5" /> Créer mon compte gratuitement
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full py-5 text-base font-bold">
                      <Link to={`/auth?tab=login&redirect=/signaler?type=${selectedType.id}`}>
                        <LogIn className="mr-2 h-5 w-5" /> J'ai déjà un compte
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <>
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
                    disabled={submitting || limitReached || !gpsConsent}
                    onClick={handleSubmit}
                  >
                    {submitting ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Envoi en cours...</>
                    ) : (
                      <><Send className="mr-2 h-5 w-5" /> Envoyer le signalement</>
                    )}
                  </Button>
                </>
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
                  if (mins < 60) return `il y a ${Math.round(mins)}min`;
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
                          <p className="text-sm text-muted-foreground truncate">{r.description}</p>
                          <p className="text-xs text-muted-foreground">{timeAgo}</p>
                        </div>
                      </div>
                    </div>
                    <CorroborationStatus verifications={r.verifications} compact />
                    <Button
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold"
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
                onClick={proceedToStep3}
              >
                Non, c'est un nouveau problème — créer un signalement
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default ReportPage;
