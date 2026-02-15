import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Droplets, Send, MapPin, Clock, Navigation, Loader2, Users, Baby, Heart, UserRound, ChevronDown, Plus, Minus, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import Header from "@/components/Header";
import PhotoUpload from "@/components/PhotoUpload";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/error-utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { COMMUNES, findNearestCommune, type Commune, type CommuneResult } from "@/lib/communes";
import { getQuartiers } from "@/lib/quartiers";
import type { ServiceType, UrgencyLevel } from "@/lib/data";

const DAILY_LIMIT = 5;

const ReportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [serviceType, setServiceType] = useState<ServiceType | "">("");
  const [commune, setCommune] = useState("");
  const [quartier, setQuartier] = useState("");
  const [customQuartier, setCustomQuartier] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("");
  const [impactedPeople, setImpactedPeople] = useState(1);
  const [babies, setBabies] = useState(0);
  const [pregnant, setPregnant] = useState(0);
  const [elderly, setElderly] = useState(0);
  const [showVulnerable, setShowVulnerable] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [detectedCommune, setDetectedCommune] = useState<Commune | null>(null);
  const [outsidePilotZone, setOutsidePilotZone] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dailyCount, setDailyCount] = useState<number | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  const captureGPS = (showError = true) => {
    if (!navigator.geolocation) {
      setGpsLoading(false);
      if (showError) toast.error("La géolocalisation n'est pas supportée par votre appareil");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lon);
        const result = findNearestCommune(lat, lon);
        if (result.isInPilotZone && result.commune) {
          setDetectedCommune(result.commune);
          setCommune(result.commune.nom);
          setOutsidePilotZone(false);
        } else {
          setDetectedCommune(null);
          setCommune("");
          setOutsidePilotZone(true);
        }
        setGpsLoading(false);
        toast.success("Position GPS capturée !");
      },
      () => {
        setGpsLoading(false);
        if (showError) toast.error("Impossible d'obtenir votre position. Vérifiez les permissions GPS.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    captureGPS(false);
  }, []);

  // Check daily limit
  useEffect(() => {
    if (!user) return;
    const checkLimit = async () => {
      const { data, error } = await supabase.rpc("count_user_daily_reports", { p_user_id: user.id });
      if (!error && data !== null) {
        const count = data as number;
        setDailyCount(count);
        setLimitReached(count >= DAILY_LIMIT);
      }
    };
    checkLimit();
  }, [user]);

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  const resolvedQuartier = quartier === "__other" ? customQuartier.trim() : quartier;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (limitReached) {
      toast.error(`Vous avez atteint la limite de ${DAILY_LIMIT} signalements par jour`);
      return;
    }
    if (!latitude || !longitude) {
      toast.error("Votre position GPS est requise pour signaler. Activez la géolocalisation.");
      return;
    }
    if (!serviceType || !commune || !resolvedQuartier) {
      toast.error("Veuillez remplir le type, la commune et le quartier");
      return;
    }
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }

    setSubmitting(true);
    try {
      // Build start_time from manual input or default to now
      let reportStartTime = new Date().toISOString();
      if (startTime) {
        const [h, m] = startTime.split(":").map(Number);
        const st = new Date();
        st.setHours(h, m, 0, 0);
        reportStartTime = st.toISOString();
      }

      const baseDesc = description || `Coupure de ${serviceType === "electricity" ? "courant" : "eau"} à ${commune}`;
      const vulnParts: string[] = [];
      if (babies > 0) vulnParts.push(`${babies} bébé(s)`);
      if (pregnant > 0) vulnParts.push(`${pregnant} femme(s) enceinte(s)`);
      if (elderly > 0) vulnParts.push(`${elderly} personne(s) âgée(s)`);
      const impactInfo = `[${impactedPeople} personne(s)${vulnParts.length ? ` dont ${vulnParts.join(", ")}` : ""}]`;
      const fullDesc = `${baseDesc} ${impactInfo}`;

      // Auto-detect urgency based on vulnerable people
      const hasVulnerable = babies > 0 || pregnant > 0 || elderly > 0;
      const urgencyLevel = hasVulnerable ? "high" : "medium";

      const { error } = await supabase.from("reports").insert({
        user_id: user.id,
        service_type: serviceType,
        description: fullDesc,
        location: commune,
        commune,
        quartier: resolvedQuartier,
        latitude,
        longitude,
        urgency: urgencyLevel,
        start_time: reportStartTime,
        photo_url: photoUrl || null,
      });
      if (error) throw error;
      toast.success("Signalement envoyé !");
      navigate("/");
    } catch (error: any) {
      toast.error(getUserFriendlyError(error, "Erreur lors de l'envoi"));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCommuneData = COMMUNES.find((c) => c.nom === commune);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-md py-8">
        {/* GPS detection banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-xl p-4 text-center"
          style={{
            backgroundColor: detectedCommune ? `${detectedCommune.couleur}15` : undefined,
            borderColor: detectedCommune?.couleur,
            borderWidth: detectedCommune ? 2 : 1,
          }}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" style={{ color: detectedCommune?.couleur }} />
              {gpsLoading ? (
                <span className="text-muted-foreground text-sm animate-pulse flex items-center gap-1">
                  <Loader2 className="h-4 w-4 animate-spin" /> Détection GPS...
                </span>
              ) : outsidePilotZone ? (
                <span className="text-sm font-medium text-destructive">
                  ⚠️ Vous n'êtes pas dans une commune pilote
                </span>
              ) : detectedCommune ? (
                <span className="font-bold" style={{ color: detectedCommune.couleur }}>
                  📍 {detectedCommune.nom} détecté ✓
                </span>
              ) : (
                <span className="text-muted-foreground text-sm">GPS non disponible — sélectionnez manuellement</span>
              )}
            </div>

            {latitude && longitude && (
              <p className="text-xs text-muted-foreground font-mono">
                {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </p>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => captureGPS(true)}
              disabled={gpsLoading}
              className="mt-1 gap-1.5"
            >
              {gpsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
              {latitude ? "Recapturer ma position" : "Capturer ma position GPS"}
            </Button>
          </div>
        </motion.div>

        {outsidePilotZone && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center"
          >
            <p className="text-sm font-medium text-destructive">
              🚧 Votre position actuelle ne se trouve pas dans l'une des 5 communes pilotes (Yopougon, Cocody, Abobo, Adjamé, Bingerville).
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Les signalements pour les autres communes seront disponibles ultérieurement. Vous pouvez tout de même sélectionner manuellement une commune pilote.
            </p>
          </motion.div>
        )}

        {/* Daily limit counter */}
        {dailyCount !== null && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-4 rounded-xl border p-3 text-center ${
              limitReached
                ? "border-destructive/30 bg-destructive/5"
                : "border-border bg-card"
            }`}
          >
            {limitReached ? (
              <>
                <p className="text-sm font-bold text-destructive">
                  🚫 Limite atteinte : {dailyCount}/{DAILY_LIMIT} signalements aujourd'hui
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Vous pourrez signaler à nouveau demain. L'abonnement premium sera bientôt disponible.
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                📊 {dailyCount}/{DAILY_LIMIT} signalements utilisés aujourd'hui
              </p>
            )}
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-4 text-center">
          <p className="text-sm text-muted-foreground">
            📍 {commune || "..."}{resolvedQuartier ? `, ${resolvedQuartier}` : ""} — [{timeStr}]
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-card"
        >
          {/* Commune selector */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Commune *</Label>
            <Select value={commune} onValueChange={(v) => { setCommune(v); setQuartier(""); setCustomQuartier(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner la commune" />
              </SelectTrigger>
              <SelectContent>
                {COMMUNES.map((c) => (
                  <SelectItem key={c.nom} value={c.nom}>
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full inline-block" style={{ backgroundColor: c.couleur }} />
                      {c.nom}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quartier */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Quartier *</Label>
            {commune ? (
              <Select value={quartier} onValueChange={setQuartier}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le quartier" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {getQuartiers(commune).map((q) => (
                    <SelectItem key={q} value={q}>{q}</SelectItem>
                  ))}
                  <SelectItem value="__other">Autre quartier...</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground italic">Sélectionnez d'abord une commune</p>
            )}
            {quartier === "__other" && (
              <Input
                placeholder="Saisissez le nom du quartier"
                value={customQuartier}
                onChange={(e) => setCustomQuartier(e.target.value)}
                maxLength={100}
                autoFocus
              />
            )}
          </div>

          {/* Service type */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Type de coupure *</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setServiceType("electricity")}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 p-4 transition-all ${
                  serviceType === "electricity"
                    ? "border-electricity bg-electricity-light"
                    : "border-border hover:border-electricity/50"
                }`}
              >
                <Zap className={`h-5 w-5 ${serviceType === "electricity" ? "text-electricity" : "text-muted-foreground"}`} />
                <span className="font-medium text-sm">Électricité</span>
              </button>
              <button
                type="button"
                onClick={() => setServiceType("water")}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 p-4 transition-all ${
                  serviceType === "water"
                    ? "border-water bg-water-light"
                    : "border-border hover:border-water/50"
                }`}
              >
                <Droplets className={`h-5 w-5 ${serviceType === "water" ? "text-water" : "text-muted-foreground"}`} />
                <span className="font-medium text-sm">Eau</span>
              </button>
            </div>
          </div>

          {/* Start time */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Heure de début de la coupure
            </Label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Laissez vide si la coupure vient de commencer
            </p>
          </div>

          {/* Impacted people + vulnerable */}
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <Users className="h-4 w-4 text-muted-foreground" />
                Personne(s) impactée(s) dans le ménage
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed bg-popover text-popover-foreground border border-border shadow-md z-50">
                  Merci d'indiquer le nombre réel de personnes concernées. Les données servent à prioriser les interventions. Toute exagération fausse les statistiques et pourrait entraîner une suspension de votre compte.
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Counter for total people */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
              <span className="text-sm text-foreground">Nombre total</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setImpactedPeople(Math.max(1, impactedPeople - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center font-bold text-foreground">{impactedPeople}</span>
                <button
                  type="button"
                  onClick={() => setImpactedPeople(Math.min(50, impactedPeople + 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Toggle vulnerable section */}
            <button
              type="button"
              onClick={() => setShowVulnerable(!showVulnerable)}
              className="flex w-full items-center justify-between rounded-xl border border-dashed border-border bg-background px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50"
            >
              <span className="flex items-center gap-1.5">
                <Heart className="h-4 w-4" />
                Personnes vulnérables
                {(babies + pregnant + elderly > 0) && (
                  <span className="ml-1 rounded-full bg-urgent/10 px-2 py-0.5 text-xs font-semibold text-urgent">
                    {babies + pregnant + elderly}
                  </span>
                )}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showVulnerable ? "rotate-180" : ""}`} />
            </button>

            {showVulnerable && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 rounded-xl border border-border bg-muted/30 p-3"
              >
                {/* Babies */}
                <div className="flex items-center justify-between py-1">
                  <span className="flex items-center gap-2 text-sm text-foreground">
                    <Baby className="h-4 w-4 text-primary" />
                    Bébés / Nourrissons
                  </span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setBabies(Math.max(0, babies - 1))} className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-background"><Minus className="h-3 w-3" /></button>
                    <span className="w-5 text-center text-sm font-semibold text-foreground">{babies}</span>
                    <button type="button" onClick={() => setBabies(Math.min(20, babies + 1))} className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-background"><Plus className="h-3 w-3" /></button>
                  </div>
                </div>

                {/* Pregnant */}
                <div className="flex items-center justify-between py-1">
                  <span className="flex items-center gap-2 text-sm text-foreground">
                    <Heart className="h-4 w-4 text-pink-500" />
                    Femmes enceintes
                  </span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setPregnant(Math.max(0, pregnant - 1))} className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-background"><Minus className="h-3 w-3" /></button>
                    <span className="w-5 text-center text-sm font-semibold text-foreground">{pregnant}</span>
                    <button type="button" onClick={() => setPregnant(Math.min(20, pregnant + 1))} className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-background"><Plus className="h-3 w-3" /></button>
                  </div>
                </div>

                {/* Elderly */}
                <div className="flex items-center justify-between py-1">
                  <span className="flex items-center gap-2 text-sm text-foreground">
                    <UserRound className="h-4 w-4 text-amber-600" />
                    Personnes âgées
                  </span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setElderly(Math.max(0, elderly - 1))} className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-background"><Minus className="h-3 w-3" /></button>
                    <span className="w-5 text-center text-sm font-semibold text-foreground">{elderly}</span>
                    <button type="button" onClick={() => setElderly(Math.min(20, elderly + 1))} className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-background"><Plus className="h-3 w-3" /></button>
                  </div>
                </div>

                {(babies + pregnant + elderly > 0) && (
                  <p className="text-xs text-urgent font-medium pt-1">
                    ⚠️ Présence de personnes vulnérables — priorité élevée automatique
                  </p>
                )}
              </motion.div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Photo</Label>
            <PhotoUpload onPhotoUploaded={setPhotoUrl} photoUrl={photoUrl} />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Description (optionnelle)</Label>
            <Textarea
              placeholder="Décrivez la situation..."
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              maxLength={500}
              rows={3}
            />
          </div>

          <Button
            type="submit"
            className="w-full py-6 text-base font-bold"
            style={{
              backgroundColor: selectedCommuneData?.couleur || undefined,
              color: "white",
            }}
            disabled={submitting || limitReached || !serviceType || !commune || !resolvedQuartier || !latitude || !longitude}
          >
            <Send className="mr-2 h-5 w-5" />
            {submitting ? "Envoi..." : "Confirmer signalement"}
          </Button>
        </motion.form>
      </main>
    </div>
  );
};

export default ReportPage;
