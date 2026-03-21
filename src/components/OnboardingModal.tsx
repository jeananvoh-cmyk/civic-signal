import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuartierCombobox } from "@/components/QuartierCombobox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { COMMUNES } from "@/lib/communes";
import { getQuartiers } from "@/lib/quartiers";
import { toast } from "sonner";
import { ChevronRight, Check, Loader2 } from "lucide-react";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (data: { commune: string; quartier: string; phone: string }) => void;
  initialCommune?: string | null;
  initialQuartier?: string | null;
  initialPhone?: string | null;
  missingFields: string[];
}

const STEPS = [
  { id: "commune", label: "Votre commune" },
  { id: "quartier", label: "Votre quartier" },
  { id: "phone", label: "Votre téléphone" },
] as const;

const OnboardingModal = ({
  open,
  onClose,
  onComplete,
  initialCommune,
  initialQuartier,
  initialPhone,
  missingFields,
}: OnboardingModalProps) => {
  const { user } = useAuth();

  const [commune, setCommune] = useState(initialCommune ?? "");
  const [quartier, setQuartier] = useState(initialQuartier ?? "");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [saving, setSaving] = useState(false);

  // Determine which steps are actually needed
  const neededSteps = STEPS.filter((s) => missingFields.includes(s.id));
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentStep = neededSteps[currentIndex];

  const quartiers = commune ? getQuartiers(commune) : [];

  const canProceed = () => {
    if (!currentStep) return false;
    if (currentStep.id === "commune") return commune.trim() !== "";
    if (currentStep.id === "quartier") return quartier.trim() !== "";
    if (currentStep.id === "phone") return phone.trim().length >= 8;
    return false;
  };

  const handleNext = async () => {
    if (currentIndex < neededSteps.length - 1) {
      setCurrentIndex((i) => i + 1);
      return;
    }
    // Last step → save and call onComplete
    if (!user) return;
    setSaving(true);
    try {
      const updateData: Record<string, string> = {};
      if (missingFields.includes("commune")) updateData.commune = commune.trim();
      if (missingFields.includes("quartier")) updateData.quartier = quartier.trim();
      if (missingFields.includes("phone")) updateData.phone = phone.trim();

      const { error } = await supabase
        .from("profiles")
        .update(updateData as any)
        .eq("user_id", user.id);

      if (error) throw error;

      onComplete({ commune: commune.trim(), quartier: quartier.trim(), phone: phone.trim() });
    } catch {
      toast.error("Erreur lors de la sauvegarde du profil");
    } finally {
      setSaving(false);
    }
  };

  const totalSteps = neededSteps.length;
  const isLast = currentIndex === totalSteps - 1;

  if (!currentStep) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            Complétez votre profil
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Ces informations permettent de contextualiser votre signalement et renforcer sa crédibilité.
          </DialogDescription>
        </DialogHeader>

        {/* Progress dots */}
        {totalSteps > 1 && (
          <div className="flex items-center gap-2 justify-center py-1">
            {neededSteps.map((step, i) => (
              <div
                key={step.id}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i < currentIndex
                    ? "bg-primary w-2"
                    : i === currentIndex
                    ? "bg-primary w-6"
                    : "bg-muted w-2"
                }`}
              />
            ))}
          </div>
        )}

        {/* Step label */}
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-center">
          Étape {currentIndex + 1} / {totalSteps} — {currentStep.label}
        </p>

        {/* Step content */}
        <div className="py-2 space-y-3">
          {currentStep.id === "commune" && (
            <div className="space-y-1.5">
              <Label htmlFor="onb-commune">Commune de résidence</Label>
              <Select value={commune} onValueChange={(v) => { setCommune(v); setQuartier(""); }}>
                <SelectTrigger id="onb-commune">
                  <SelectValue placeholder="Choisissez votre commune" />
                </SelectTrigger>
                <SelectContent>
                  {COMMUNES.map((c) => (
                    <SelectItem key={c.nom} value={c.nom}>{c.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Votre commune de résidence habituelle à Abidjan.
              </p>
            </div>
          )}

          {currentStep.id === "quartier" && (
            <div className="space-y-1.5">
              <Label>Quartier</Label>
              {commune ? (
                <QuartierCombobox
                  quartiers={quartiers}
                  value={quartier}
                  onChange={setQuartier}
                />
              ) : (
                <p className="text-sm text-muted-foreground italic">Sélectionnez d'abord une commune.</p>
              )}
              <p className="text-xs text-muted-foreground">
                Votre quartier précis dans {commune || "la commune"}.
              </p>
            </div>
          )}

          {currentStep.id === "phone" && (
            <div className="space-y-1.5">
              <Label htmlFor="onb-phone">Numéro WhatsApp</Label>
              <Input
                id="onb-phone"
                type="tel"
                placeholder="+225 07 XX XX XX XX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Utilisé uniquement pour vous contacter si besoin de précisions sur votre signalement. Jamais publié.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground">
            Plus tard
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed() || saving}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isLast ? (
              <><Check className="h-4 w-4" /> Enregistrer et signaler</>
            ) : (
              <><ChevronRight className="h-4 w-4" /> Suivant</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingModal;
