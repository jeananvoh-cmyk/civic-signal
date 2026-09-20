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
import { Check, Loader2, Phone, MapPin, Building2, ShieldCheck } from "lucide-react";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (data: { commune: string; quartier: string; phone: string }) => void;
  initialCommune?: string | null;
  initialQuartier?: string | null;
  initialPhone?: string | null;
  missingFields: string[];
}

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

  const quartiers = commune ? getQuartiers(commune) : [];

  const isCommuneNeeded = missingFields.includes("commune");
  const isQuartierNeeded = missingFields.includes("quartier");
  const isPhoneNeeded = missingFields.includes("phone");

  const canProceed = () => {
    if (isCommuneNeeded && !commune.trim()) return false;
    if (isQuartierNeeded && !quartier.trim()) return false;
    if (isPhoneNeeded && phone.trim().length < 8) return false;
    return true;
  };

  const handleSave = async () => {
    if (!user) return;
    if (!canProceed()) return;

    setSaving(true);
    try {
      const updateData: Record<string, string> = {};
      if (isCommuneNeeded) updateData.commune = commune.trim();
      if (isQuartierNeeded) updateData.quartier = quartier.trim();
      if (isPhoneNeeded) updateData.phone = phone.trim();

      const { error } = await supabase
        .from("profiles")
        .update(updateData as any)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Profil complété avec succès !");
      onComplete({ commune: commune.trim(), quartier: quartier.trim(), phone: phone.trim() });
    } catch {
      toast.error("Erreur lors de la sauvegarde du profil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wide uppercase">
            <ShieldCheck className="h-4 w-4" /> Complétion du profil citoyen
          </div>
          <DialogTitle className="text-xl font-extrabold text-foreground">
            Dernière étape avant envoi
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Ces informations permettent de contextualiser votre signalement et de certifier sa crédibilité auprès des opérateurs.
          </DialogDescription>
        </DialogHeader>

        {/* Unified Single-Screen Form */}
        <div className="py-2 space-y-4">
          {/* Field: Commune */}
          {isCommuneNeeded && (
            <div className="space-y-1.5">
              <Label htmlFor="onb-commune" className="text-xs font-bold flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" /> Commune de résidence *
              </Label>
              <Select value={commune} onValueChange={(v) => { setCommune(v); setQuartier(""); }}>
                <SelectTrigger id="onb-commune" className="h-11 rounded-xl">
                  <SelectValue placeholder="Choisissez votre commune" />
                </SelectTrigger>
                <SelectContent>
                  {COMMUNES.map((c) => (
                    <SelectItem key={c.nom} value={c.nom}>{c.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Field: Quartier */}
          {isQuartierNeeded && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" /> Quartier *
              </Label>
              {commune ? (
                <QuartierCombobox
                  quartiers={quartiers}
                  value={quartier}
                  onChange={setQuartier}
                />
              ) : (
                <p className="text-xs text-muted-foreground italic bg-muted/40 p-2.5 rounded-xl">
                  Sélectionnez d'abord une commune ci-dessus.
                </p>
              )}
            </div>
          )}

          {/* Field: Phone / WhatsApp */}
          {isPhoneNeeded && (
            <div className="space-y-1.5">
              <Label htmlFor="onb-phone" className="text-xs font-bold flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-emerald-600" /> Numéro WhatsApp *
              </Label>
              <Input
                id="onb-phone"
                type="tel"
                placeholder="+225 07 XX XX XX XX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-11 rounded-xl"
              />
              <p className="text-[11px] text-muted-foreground leading-tight">
                🔒 Votre numéro reste <strong>confidentiel</strong>. Il sert uniquement aux relances et à la transmission d'interventions.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs text-muted-foreground">
            Plus tard
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canProceed() || saving}
            className="py-5 px-5 text-sm font-bold rounded-xl gap-2 bg-primary text-primary-foreground hover:opacity-90 shadow-md"
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...</>
            ) : (
              <><Check className="h-4 w-4" /> Enregistrer et envoyer</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingModal;
