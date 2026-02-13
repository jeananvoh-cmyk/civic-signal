import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Droplets, Send, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/Header";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { COMMUNES, findNearestCommune, type Commune } from "@/lib/communes";
import type { ServiceType, UrgencyLevel } from "@/lib/data";

const ReportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [serviceType, setServiceType] = useState<ServiceType | "">("");
  const [urgency, setUrgency] = useState<"normal" | "urgent">("normal");
  const [commune, setCommune] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [detectedCommune, setDetectedCommune] = useState<Commune | null>(null);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setLatitude(lat);
          setLongitude(lon);
          const nearest = findNearestCommune(lat, lon);
          if (nearest) {
            setDetectedCommune(nearest);
            setCommune(nearest.nom);
          }
          setGpsLoading(false);
        },
        () => setGpsLoading(false),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setGpsLoading(false);
    }
  }, []);

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceType || !commune) {
      toast.error("Veuillez sélectionner un type et une commune");
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
        quartier: "",
        latitude,
        longitude,
        urgency: urgency === "urgent" ? "high" : "medium",
        start_time: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("Signalement envoyé !");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi");
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
          <div className="flex items-center justify-center gap-2">
            <MapPin className="h-5 w-5" style={{ color: detectedCommune?.couleur }} />
            {gpsLoading ? (
              <span className="text-muted-foreground text-sm animate-pulse">Détection GPS...</span>
            ) : detectedCommune ? (
              <span className="font-bold" style={{ color: detectedCommune.couleur }}>
                📍 {detectedCommune.nom} détecté ✓
              </span>
            ) : (
              <span className="text-muted-foreground text-sm">GPS non disponible — sélectionnez manuellement</span>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-4 text-center">
          <p className="text-sm text-muted-foreground">
            📍 {commune || "..."} — [{timeStr}]
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
            disabled={submitting || !serviceType || !commune}
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
