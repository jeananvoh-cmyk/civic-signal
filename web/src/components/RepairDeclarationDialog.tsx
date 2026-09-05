import { useState, useRef } from "react";
import { Camera, X, Loader2, CheckCircle2, MapPin, ShieldAlert, ImagePlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { compressImage } from "@/components/PhotoUpload";

interface RepairDeclarationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  commune?: string;
  quartier?: string;
  category?: string;
  onSuccess?: (data: { repair_photos: string[]; repair_note: string; repair_status: string }) => void;
}

const MAX_REPAIR_PHOTOS = 3;

export const RepairDeclarationDialog = ({
  open,
  onOpenChange,
  reportId,
  commune,
  quartier,
  category,
  onSuccess,
}: RepairDeclarationDialogProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [captureGps, setCaptureGps] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const availableSlots = MAX_REPAIR_PHOTOS - selectedFiles.length;
    if (availableSlots <= 0) {
      toast.warning(`Maximum ${MAX_REPAIR_PHOTOS} photos de preuve autorisées`);
      return;
    }

    const newFiles = files.slice(0, availableSlots);
    const updatedFiles = [...selectedFiles, ...newFiles];
    setSelectedFiles(updatedFiles);

    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls((prev) => [...prev, ...newPreviews]);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Veuillez vous connecter pour soumettre une preuve de réparation");
      return;
    }

    if (selectedFiles.length === 0) {
      toast.error("Veuillez joindre au moins une photo constatant la réparation");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Récupérer les coordonnées GPS si consenti
      let lat: number | null = null;
      let lon: number | null = null;

      if (captureGps && navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((res, rej) => {
            navigator.geolocation.getCurrentPosition(res, rej, {
              timeout: 5000,
              enableHighAccuracy: true,
            });
          });
          lat = position.coords.latitude;
          lon = position.coords.longitude;
        } catch (gpsErr) {
          console.warn("Impossible d'obtenir le GPS pour la preuve de réparation:", gpsErr);
        }
      }

      // 2. Traiter et uploader chaque photo dans le bucket report-photos
      const uploadedUrls: string[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const compressedBlob = await compressImage(file);
        const fileName = `${user.id}/repairs/${reportId}_${Date.now()}_${i + 1}.jpg`;

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("report-photos")
          .upload(fileName, compressedBlob, {
            contentType: "image/jpeg",
            upsert: true,
          });

        if (uploadErr) {
          console.error("Upload error:", uploadErr);
          throw new Error("Échec de l'envoi d'une photo de preuve.");
        }

        // On stocke le chemin ou l'URL publique
        const { data: pubUrlData } = supabase.storage
          .from("report-photos")
          .getPublicUrl(uploadData.path);

        uploadedUrls.push(pubUrlData.publicUrl);
      }

      // 3. Soumettre la déclaration via RPC pour modération
      const { error: rpcErr } = await (supabase as any).rpc("submit_repair_declaration", {
        p_report_id: reportId,
        p_photo_urls: uploadedUrls,
        p_note: note.trim() || null,
        p_lat: lat,
        p_lon: lon,
      });

      if (rpcErr) throw rpcErr;

      toast.success("📸 Preuve de réparation enregistrée !", {
        description:
          "Nos modérateurs et partenaires techniques vont vérifier les éléments avant clôture définitive.",
        duration: 7000,
      });

      onSuccess?.({
        repair_photos: uploadedUrls,
        repair_note: note.trim(),
        repair_status: "pending_review",
      });

      // Nettoyage et fermeture
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      setSelectedFiles([]);
      setPreviewUrls([]);
      setNote("");
      onOpenChange(false);
    } catch (err: any) {
      console.error("submit_repair_declaration error:", err);
      toast.error("Erreur lors de la transmission", {
        description: err.message || "Veuillez réessayer dans un instant.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Camera className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span>Déclarer la réparation constatée</span>
          </DialogTitle>
          <DialogDescription>
            {commune ? `${commune}${quartier ? ` · ${quartier}` : ""}` : "Signalement citoyen"} —
            Joignez une photo montrant que les travaux ou réparations ont été effectués.
          </DialogDescription>
        </DialogHeader>

        {/* Bannière de modération préalable */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Validation obligatoire avant clôture : </span>
            Afin d'éviter toute fausse déclaration, votre constat avec photo sera examiné par nos
            modérateurs et services techniques partenaires avant que l'incident soit définitivement clos.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Photos de preuve */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Photo(s) de preuve ({selectedFiles.length}/{MAX_REPAIR_PHOTOS}) *</span>
              <span className="text-[11px] font-normal text-muted-foreground">Photos après réparation</span>
            </Label>

            <div className="grid grid-cols-3 gap-2.5">
              {previewUrls.map((url, idx) => (
                <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-border bg-muted">
                  <img src={url} alt={`Preuve ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    disabled={isSubmitting}
                    className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <span className="absolute bottom-1 left-1.5 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded font-mono font-bold">
                    Après #{idx + 1}
                  </span>
                </div>
              ))}

              {selectedFiles.length < MAX_REPAIR_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-emerald-500/60 bg-muted/40 hover:bg-emerald-500/5 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-emerald-600 transition-colors p-2 text-center"
                >
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[11px] font-semibold leading-tight">Prendre / Ajouter</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Note / Précisions */}
          <div className="space-y-1.5">
            <Label htmlFor="repair-note" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Commentaire ou détails constatés (facultatif)
            </Label>
            <Textarea
              id="repair-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Les techniciens ont remplacé l'ampoule ce matin, la voie est à nouveau bien éclairée..."
              rows={3}
              maxLength={400}
              className="text-xs"
              disabled={isSubmitting}
            />
          </div>

          {/* Géolocalisation */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="capture-gps"
              checked={captureGps}
              onChange={(e) => setCaptureGps(e.target.checked)}
              disabled={isSubmitting}
              className="rounded border-border text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="capture-gps" className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer">
              <MapPin className="h-3 w-3 text-emerald-600" />
              <span>Attester ma position GPS actuelle sur les lieux du constat</span>
            </label>
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Annuler
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || selectedFiles.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Envoi et analyse de la preuve...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Soumettre pour validation
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
