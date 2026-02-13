import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Zap, Droplets, Send, Building2, Home, Clock, Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/Header";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ServiceType, UrgencyLevel } from "@/lib/data";

const ReportPage = () => {
  const { user } = useAuth();
  const [serviceType, setServiceType] = useState<ServiceType | "">("");
  const [urgency, setUrgency] = useState<UrgencyLevel | "">("");
  const [reporterType, setReporterType] = useState<"household" | "business">("household");
  const [commune, setCommune] = useState("");
  const [quartier, setQuartier] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Silently capture GPS on mount (not shared publicly)
  useState(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
        },
        () => {} // silently fail
      );
    }
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("La photo ne doit pas dépasser 5 Mo");
        return;
      }
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceType || !urgency || !commune || !quartier || !description || !startTime) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }

    setSubmitting(true);
    try {
      let photoUrl: string | null = null;

      if (photo) {
        const ext = photo.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("report-photos")
          .upload(path, photo);
        if (uploadError) throw uploadError;
        // Store the storage path, not a public URL (bucket is private)
        photoUrl = path;
      }

      const { error } = await supabase.from("reports").insert({
        user_id: user.id,
        service_type: serviceType,
        description,
        location: `${commune}, ${quartier}`,
        commune,
        quartier,
        latitude,
        longitude,
        urgency,
        reporter_type: reporterType,
        start_time: new Date(startTime).toISOString(),
        photo_url: photoUrl,
      });

      if (error) throw error;

      toast.success("Signalement envoyé avec succès !");
      setServiceType("");
      setUrgency("");
      setCommune("");
      setQuartier("");
      setDescription("");
      setStartTime("");
      removePhoto();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-2xl py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Signaler une coupure</h1>
          <p className="mt-2 text-muted-foreground">
            Votre signalement sera vérifié par la communauté pour une fiabilité maximale.
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-card"
        >
          {/* Service type */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Type de service *</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setServiceType("electricity")}
                className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                  serviceType === "electricity"
                    ? "border-electricity bg-electricity-light"
                    : "border-border hover:border-electricity/50"
                }`}
              >
                <Zap className={`h-6 w-6 ${serviceType === "electricity" ? "text-electricity" : "text-muted-foreground"}`} />
                <div>
                  <p className="font-medium text-foreground">Électricité</p>
                  <p className="text-xs text-muted-foreground">Coupure de courant</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setServiceType("water")}
                className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                  serviceType === "water"
                    ? "border-water bg-water-light"
                    : "border-border hover:border-water/50"
                }`}
              >
                <Droplets className={`h-6 w-6 ${serviceType === "water" ? "text-water" : "text-muted-foreground"}`} />
                <div>
                  <p className="font-medium text-foreground">Eau</p>
                  <p className="text-xs text-muted-foreground">Coupure d'eau</p>
                </div>
              </button>
            </div>
          </div>

          {/* Reporter type */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Type de profil</Label>
            <RadioGroup
              value={reporterType}
              onValueChange={(v) => setReporterType(v as "household" | "business")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="household" id="household" />
                <Label htmlFor="household" className="flex items-center gap-1.5 text-sm">
                  <Home className="h-4 w-4" /> Ménage
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="business" id="business" />
                <Label htmlFor="business" className="flex items-center gap-1.5 text-sm">
                  <Building2 className="h-4 w-4" /> Entreprise
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Start time */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Heure de début de la coupure *</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Commune & Quartier */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Commune *</Label>
              <Input
                placeholder="Ex: Cocody, Plateau..."
                value={commune}
                onChange={(e) => setCommune(e.target.value.slice(0, 100))}
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Quartier *</Label>
              <Input
                placeholder="Ex: Riviera, Angré..."
                value={quartier}
                onChange={(e) => setQuartier(e.target.value.slice(0, 100))}
                maxLength={100}
                required
              />
            </div>
          </div>

          {/* Urgency */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Niveau d'urgence *</Label>
            <Select value={urgency} onValueChange={(v) => setUrgency(v as UrgencyLevel)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner le niveau" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">🟢 Faible — Gêne mineure</SelectItem>
                <SelectItem value="medium">🟡 Moyen — Impact modéré</SelectItem>
                <SelectItem value="high">🟠 Élevé — Impact significatif</SelectItem>
                <SelectItem value="critical">🔴 Critique — Urgence vitale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Description *</Label>
            <Textarea
              placeholder="Décrivez la situation : zone affectée, impact..."
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
              maxLength={2000}
              rows={4}
            />
          </div>

          {/* Photo */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Photo (optionnelle)</Label>
            {photoPreview ? (
              <div className="relative inline-block">
                <img src={photoPreview} alt="Aperçu" className="h-32 w-auto rounded-lg border border-border object-cover" />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Camera className="mr-2 h-4 w-4" />
                Ajouter une photo
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          <Button
            type="submit"
            className="w-full gradient-hero text-primary-foreground"
            size="lg"
            disabled={submitting}
          >
            <Send className="mr-2 h-4 w-4" />
            {submitting ? "Envoi en cours..." : "Envoyer le signalement"}
          </Button>
        </motion.form>
      </main>
    </div>
  );
};

export default ReportPage;
