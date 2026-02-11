import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, Droplets, MapPin, AlertTriangle, Send, Building2, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/Header";
import { toast } from "sonner";
import type { ServiceType, UrgencyLevel } from "@/lib/data";

const ReportPage = () => {
  const [serviceType, setServiceType] = useState<ServiceType | "">("");
  const [urgency, setUrgency] = useState<UrgencyLevel | "">("");
  const [reporterType, setReporterType] = useState<"household" | "business">("household");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [isLocating, setIsLocating] = useState(false);

  const handleGeolocate = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
          setIsLocating(false);
          toast.success("Position GPS obtenue !");
        },
        () => {
          setIsLocating(false);
          toast.error("Impossible d'obtenir la position GPS");
        }
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceType || !urgency || !location || !description) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    toast.success("Signalement envoyé avec succès ! La communauté va le vérifier.");
    setServiceType("");
    setUrgency("");
    setLocation("");
    setDescription("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-2xl py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-display text-3xl font-bold text-foreground">
            Signaler une coupure
          </h1>
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
            <Label className="text-sm font-semibold">Type de service</Label>
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

          {/* Location */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Localisation</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Adresse ou coordonnées GPS"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleGeolocate}
                disabled={isLocating}
              >
                <MapPin className="mr-1.5 h-4 w-4" />
                {isLocating ? "..." : "GPS"}
              </Button>
            </div>
          </div>

          {/* Urgency */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Niveau d'urgence</Label>
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
            <Label className="text-sm font-semibold">Description</Label>
            <Textarea
              placeholder="Décrivez la situation : heure de début, zone affectée, impact..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <Button type="submit" className="w-full gradient-hero text-primary-foreground" size="lg">
            <Send className="mr-2 h-4 w-4" />
            Envoyer le signalement
          </Button>
        </motion.form>
      </main>
    </div>
  );
};

export default ReportPage;
