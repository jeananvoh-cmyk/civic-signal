import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Droplets, Send, MapPin, Clock, Navigation, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/Header";
import PhotoUpload from "@/components/PhotoUpload";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/error-utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { COMMUNES, findNearestCommune, type Commune, type CommuneResult } from "@/lib/communes";
import type { ServiceType, UrgencyLevel } from "@/lib/data";

const DAILY_LIMIT = 5;

const ReportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [serviceType, setServiceType] = useState<ServiceType | "">("");
  const [urgency, setUrgency] = useState<"normal" | "urgent">("normal");
  const [commune, setCommune] = useState("");
  const [quartier, setQuartier] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
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
    if (!serviceType || !commune || !quartier.trim()) {
      toast.error("Veuillez remplir le type, la commune et le quartier");
      return;
    }
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("reports").insert({
        user_id: user.id,
        service_type: serviceType,
        description: description || `Coupure de ${serviceType === "electricity" ? "courant" : "eau"} à ${commune}`,
        location: commune,
        commune,
        quartier: quartier.trim(),
        latitude,
        longitude,
        urgency: urgency === "urgent" ? "high" : "medium",
        start_time: new Date().toISOString(),
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
            📍 {commune || "..."}{quartier ? `, ${quartier}` : ""} — [{timeStr}]
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
            <Select value={commune} onValueChange={setCommune}>
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
            <Input
              placeholder="Ex: Angré, Riviera 2, Plateau Dokui..."
              value={quartier}
              onChange={(e) => setQuartier(e.target.value)}
              maxLength={100}
            />
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

          {/* Urgency */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Niveau</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUrgency("normal")}
                className={`rounded-xl border-2 p-3 text-sm font-medium transition-all ${
                  urgency === "normal" ? "border-success bg-success/10 text-success" : "border-border text-muted-foreground"
                }`}
              >
                ✅ Normal
              </button>
              <button
                type="button"
                onClick={() => setUrgency("urgent")}
                className={`rounded-xl border-2 p-3 text-sm font-medium transition-all ${
                  urgency === "urgent" ? "border-urgent bg-urgent/10 text-urgent" : "border-border text-muted-foreground"
                }`}
              >
                🚨 Urgent
              </button>
            </div>
          </div>

          {/* Photo */}
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
            disabled={submitting || limitReached || !serviceType || !commune || !quartier.trim() || !latitude || !longitude}
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
