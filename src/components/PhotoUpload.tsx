import { useState, useRef } from "react";
import { Camera, X, Loader2, MapPin, ImageIcon, AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, XCircle, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/error-utils";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import * as exifr from "exifr";
import { MAX_PHOTOS } from "@/lib/constants";

interface PhotoUploadProps {
  onPhotosChanged: (urls: string[]) => void;
  onGpsFromPhoto?: (lat: number, lng: number) => void;
  photoUrls: string[];
  isInfrastructure?: boolean;
}
const MAX_OUTPUT_PX = 1920;
const JPEG_QUALITY_HIGH = 0.90;  // pour les images ≤ 1MB
const JPEG_QUALITY_LOW  = 0.82;  // pour les images > 1MB

// ── Compression canvas adaptative ─────────────────────────────────────────────
async function compressImage(file: File): Promise<Blob> {
  const quality = file.size > 1 * 1024 * 1024 ? JPEG_QUALITY_LOW : JPEG_QUALITY_HIGH;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      if (width > MAX_OUTPUT_PX || height > MAX_OUTPUT_PX) {
        if (width > height) {
          height = Math.round((height * MAX_OUTPUT_PX) / width);
          width = MAX_OUTPUT_PX;
        } else {
          width = Math.round((width * MAX_OUTPUT_PX) / height);
          height = MAX_OUTPUT_PX;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Compression échouée"));
        },
        "image/jpeg",
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Impossible de charger l'image"));
    };

    img.src = objectUrl;
  });
}

// ── Extraction GPS EXIF ───────────────────────────────────────────────────────
async function extractExifGps(
  file: File,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const gps = await exifr.gps(file);
    if (gps && typeof gps.latitude === "number" && typeof gps.longitude === "number") {
      return { lat: gps.latitude, lng: gps.longitude };
    }
  } catch {
    // Pas d'EXIF ou format non supporté — silencieux
  }
  return null;
}

// ── Sous-composant : vignette d'une photo uploadée ────────────────────────────
function PhotoThumb({ path, onRemove }: { path: string; onRemove: () => void }) {
  const displayUrl = useSignedUrl(path);
  return (
    <div className="relative rounded-xl overflow-hidden border border-border aspect-square">
      <img
        src={displayUrl || ""}
        alt="Photo du signalement"
        className="w-full h-full object-cover"
      />
      <Button
        type="button"
        variant="destructive"
        size="icon"
        className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full"
        onClick={onRemove}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────────
const PhotoUpload = ({
  onPhotosChanged,
  onGpsFromPhoto,
  photoUrls,
  isInfrastructure = false,
}: PhotoUploadProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [gpsSource, setGpsSource] = useState<"photo" | "device" | null>(null);
  const [showTips, setShowTips] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const all = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!all.length || !user) return;

    const remaining = MAX_PHOTOS - photoUrls.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_PHOTOS} photos par signalement`);
      return;
    }

    const toProcess = all.slice(0, remaining);
    if (all.length > remaining) {
      toast.info(`${all.length - remaining} photo(s) ignorée(s) — limite de ${MAX_PHOTOS} atteinte`);
    }

    setUploading(true);
    const addedUrls: string[] = [];
    let exifHandled = false;

    for (let i = 0; i < toProcess.length; i++) {
      const file = toProcess[i];
      if (!file.type.startsWith("image/")) {
        toast.error(`"${file.name}" n'est pas une image valide`);
        continue;
      }
      try {
        const isFirstEver = photoUrls.length === 0 && i === 0;
        const [exifGps, compressed] = await Promise.all([
          isFirstEver ? extractExifGps(file) : Promise.resolve(null),
          compressImage(file),
        ]);

        const path = `${user.id}/${Date.now()}_${i}.jpg`;
        const { error } = await supabase.storage
          .from("report-photos")
          .upload(path, compressed, { upsert: true, contentType: "image/jpeg" });
        if (error) throw error;

        addedUrls.push(path);

        // GPS EXIF — première photo uniquement
        if (isFirstEver && exifGps && onGpsFromPhoto && !exifHandled) {
          onGpsFromPhoto(exifGps.lat, exifGps.lng);
          setGpsSource("photo");
          exifHandled = true;
          toast.success("📸 Position GPS extraite de la photo", {
            description: `${exifGps.lat.toFixed(5)}, ${exifGps.lng.toFixed(5)}`,
            duration: 5000,
          });
        }
      } catch (err: any) {
        toast.error(getUserFriendlyError(err, `Erreur photo ${i + 1}`));
      }
    }

    if (addedUrls.length > 0) {
      const allUrls = [...photoUrls, ...addedUrls];
      onPhotosChanged(allUrls);
      if (!exifHandled) {
        setGpsSource("device");
        toast.success(
          addedUrls.length === 1 ? "Photo ajoutée !" : `${addedUrls.length} photos ajoutées !`,
          { description: `${allUrls.length}/${MAX_PHOTOS} au total` },
        );
      }
    }

    setUploading(false);
  };

  const removePhoto = (index: number) => {
    const newUrls = photoUrls.filter((_, i) => i !== index);
    onPhotosChanged(newUrls);
    if (newUrls.length === 0) setGpsSource(null);
  };

  const canAddMore = photoUrls.length < MAX_PHOTOS;

  return (
    <div className="space-y-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Grille de photos + bouton ajout */}
      {(photoUrls.length > 0 || uploading) && (
        <div className={`grid gap-2 ${photoUrls.length >= 2 ? "grid-cols-3" : "grid-cols-2"}`}>
          {photoUrls.map((url, i) => (
            <PhotoThumb key={url} path={url} onRemove={() => removePhoto(i)} />
          ))}

          {/* Indicateur GPS — sous la première photo */}
          {gpsSource && photoUrls.length > 0 && (
            <div
              className={`col-span-full flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium w-fit
                ${gpsSource === "photo"
                  ? "bg-green-600/90 text-white"
                  : "bg-black/60 text-white"}`}
            >
              <MapPin className="h-3 w-3" />
              {gpsSource === "photo"
                ? "Position extraite de la photo"
                : "Position GPS de l'appareil"}
            </div>
          )}

          {/* Slot "Ajouter" si moins de 3 photos et pas en cours d'upload */}
          {canAddMore && !uploading && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span className="text-[10px]">{photoUrls.length}/{MAX_PHOTOS}</span>
            </button>
          )}

          {uploading && (
            <div className="aspect-square rounded-xl border border-border flex items-center justify-center bg-muted/30">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      {/* Bouton principal — visible uniquement si aucune photo encore */}
      {photoUrls.length === 0 && !uploading && (
        <Button
          type="button"
          variant="outline"
          className="w-full h-24 border-dashed border-2 flex flex-col gap-2"
          onClick={() => fileRef.current?.click()}
        >
          <div className="flex items-center gap-3">
            <Camera className="h-5 w-5 text-muted-foreground" />
            <span className="text-muted-foreground/40 text-sm">|</span>
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <span className="text-xs text-muted-foreground">
            Prendre une photo ou choisir depuis la galerie
          </span>
        </Button>
      )}

      {photoUrls.length === 0 && uploading && (
        <div className="w-full h-24 border rounded-xl flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Compression et upload…</span>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Formats : JPG, PNG, HEIC, WEBP · Taille automatiquement optimisée · Max {MAX_PHOTOS} photos
      </p>

      {/* Recommandations photo — infrastructure uniquement */}
      {isInfrastructure && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-2 text-left"
            onClick={() => setShowTips((v) => !v)}
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Comment prendre une bonne photo de signalement ?
            </span>
            {showTips
              ? <ChevronUp className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              : <ChevronDown className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
          </button>

          {showTips && (
            <div className="px-3 pb-3 space-y-3 border-t border-amber-500/20">

              <div className="pt-2 space-y-1.5">
                <p className="text-[11px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wide">
                  À faire
                </p>
                {[
                  "Prenez la photo directement sur place, au moment du constat",
                  "Cadrez le problème entièrement (route, trottoir, infrastructure, etc.)",
                  "Incluez un repère visible : panneau de rue, bâtiment, numéro de maison",
                  "Prenez plusieurs angles si possible (jusqu'à 3 photos)",
                  "Activez le GPS de votre téléphone avant de prendre la photo",
                ].map((tip) => (
                  <div key={tip} className="flex items-start gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-muted-foreground leading-snug">{tip}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">
                  À éviter
                </p>
                {[
                  "Photos floues, trop sombres ou prises de trop loin",
                  "Screenshots de Google Maps ou réseaux sociaux (pas de GPS réel)",
                  "Photos reçues sur WhatsApp — WhatsApp supprime les coordonnées GPS",
                  "Photos prises depuis chez vous montrant le problème au loin",
                ].map((tip) => (
                  <div key={tip} className="flex items-start gap-1.5">
                    <XCircle className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-muted-foreground leading-snug">{tip}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 p-2">
                <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-700 dark:text-blue-400 leading-snug">
                  Si votre <strong>première photo</strong> a été prise <strong>sur les lieux</strong>, ses coordonnées GPS
                  seront extraites automatiquement et utilisées à la place du GPS de votre appareil —
                  même si vous êtes rentrés chez vous depuis.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;
