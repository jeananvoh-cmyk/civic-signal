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
  reportId?: string;
}

const MAX_OUTPUT_PX = 1920;
const JPEG_QUALITY_HIGH = 0.90;
const JPEG_QUALITY_LOW  = 0.82;

// ── Calcul d'empreinte SHA-256 sur le Blob propre final ──────────────────────
export async function computeBlobHash(blob: Blob): Promise<string> {
  try {
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "";
  }
}

// ── Compression canvas adaptative (Nettoyage EXIF garanti) ────────────────────
export async function compressImage(file: File): Promise<Blob> {
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
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas de traitement non disponible"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("La compression et le nettoyage de l'image ont échoué"));
        },
        "image/jpeg",
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Format d'image non supporté ou fichier corrompu"));
    };

    img.src = objectUrl;
  });
}

// ── Extraction GPS EXIF (En mémoire vive uniquement) ──────────────────────────
async function extractExifGps(file: File): Promise<{ lat: number; lng: number } | null> {
  try {
    const gps = await exifr.gps(file);
    if (gps && typeof gps.latitude === "number" && typeof gps.longitude === "number"
        && (gps.latitude !== 0 || gps.longitude !== 0)) {
      return { lat: gps.latitude, lng: gps.longitude };
    }
  } catch {
    // Format non supporté — silencieux
  }
  return null;
}

// ── Upload d'un fichier nettoyé (Zéro fuite d'EXIF possible) ───────────────────
async function uploadSanitizedFile(file: File, userId: string, index: number): Promise<{ path: string; hash: string }> {
  // Le passage par canvas garantit la suppression intégrale des métadonnées EXIF
  const blob = await compressImage(file);
  const hash = await computeBlobHash(blob);

  const path = `${userId}/${Date.now()}_${index}.jpg`;
  const { error } = await supabase.storage
    .from("report-photos")
    .upload(path, blob, { upsert: true, contentType: "image/jpeg" });

  if (error) throw error;
  return { path, hash };
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
        aria-label="Supprimer cette photo"
        className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full"
        onClick={onRemove}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
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
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: File[]) => {
    if (!files.length || !user) return;

    const remaining = MAX_PHOTOS - photoUrls.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_PHOTOS} photos par signalement`);
      return;
    }

    const toProcess = files.slice(0, remaining);
    if (files.length > remaining) {
      toast.info(`${files.length - remaining} photo(s) ignorée(s) — limite de ${MAX_PHOTOS} atteinte`);
    }

    setUploading(true);

    let exifExtracted = false;

    const uploadPromises = toProcess.map(async (file, i) => {
      if (!file.type.startsWith("image/") && !file.name.match(/\.(heic|heif)$/i)) {
        throw new Error(`"${file.name}" n'est pas une image valide`);
      }

      const exifGps = await extractExifGps(file);
      const { path } = await uploadSanitizedFile(file, user.id, i);

      if (exifGps && onGpsFromPhoto && !exifExtracted) {
        exifExtracted = true;
        onGpsFromPhoto(exifGps.lat, exifGps.lng);
        setGpsSource("photo");
        toast.success("📸 Position GPS extraite pour le signalement", {
          description: "Les coordonnées serviront à localiser le signalement et les métadonnées EXIF ont été nettoyées de la photo.",
          duration: 5000,
        });
      }

      return path;
    });

    const results = await Promise.allSettled(uploadPromises);
    const addedUrls: string[] = [];
    results.forEach((r, idx) => {
      if (r.status === "fulfilled") {
        addedUrls.push(r.value);
      } else {
        toast.error(getUserFriendlyError(r.reason, `Erreur photo ${idx + 1}`));
      }
    });

    if (addedUrls.length > 0) {
      const allUrls = [...photoUrls, ...addedUrls];
      onPhotosChanged(allUrls);
      toast.success(
        addedUrls.length === 1 ? "Photo ajoutée !" : `${addedUrls.length} photos ajoutées simultanément !`,
        { description: `${allUrls.length}/${MAX_PHOTOS} au total` },
      );
    }

    setUploading(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    await processFiles(files);
  };

  const removePhoto = (index: number) => {
    const newUrls = photoUrls.filter((_, i) => i !== index);
    onPhotosChanged(newUrls);
    if (newUrls.length === 0) setGpsSource(null);
  };

  const canAddMore = photoUrls.length < MAX_PHOTOS;

  return (
    <div className="space-y-3">
      {/* Inputs cachés */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Grille de photos + boutons d'ajout */}
      {(photoUrls.length > 0 || uploading) && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground px-0.5">
            <span>Photos du signalement ({photoUrls.length}/{MAX_PHOTOS})</span>
            {canAddMore && (
              <span className="text-[11px] text-muted-foreground font-normal">
                Encore {MAX_PHOTOS - photoUrls.length} photo(s) possible(s)
              </span>
            )}
          </div>

          <div className={`grid gap-2 ${photoUrls.length >= 2 ? "grid-cols-3" : "grid-cols-2"}`}>
            {photoUrls.map((url, i) => (
              <PhotoThumb key={url} path={url} onRemove={() => removePhoto(i)} />
            ))}

            {canAddMore && !uploading && (
              <div className="col-span-1 border-2 border-dashed border-border rounded-xl p-1.5 flex flex-col justify-center gap-1 bg-muted/20">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => cameraRef.current?.click()}
                  className="h-7 text-[10px] font-semibold justify-start gap-1 px-1.5 hover:bg-primary/10 hover:text-primary text-foreground"
                  title="Prendre une photo directe avec l'appareil photo"
                >
                  <Camera className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>Caméra</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => galleryRef.current?.click()}
                  className="h-7 text-[10px] font-semibold justify-start gap-1 px-1.5 hover:bg-blue-500/10 hover:text-blue-600 text-foreground"
                  title="Sélectionner des photos dans la galerie"
                >
                  <ImageIcon className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>Galerie</span>
                </Button>
              </div>
            )}

            {uploading && (
              <div className="aspect-square rounded-xl border border-border flex flex-col items-center justify-center gap-1.5 bg-muted/30 p-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-[10px] text-primary font-semibold animate-pulse text-center leading-tight">Optimisation & envoi…</span>
              </div>
            )}
          </div>

          {gpsSource && photoUrls.length > 0 && (
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium w-fit
                ${gpsSource === "photo"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-700 text-white"}`}
            >
              <MapPin className="h-3 w-3" />
              {gpsSource === "photo"
                ? "Position GPS extraite de la photo"
                : "Position GPS de l'appareil"}
            </div>
          )}
        </div>
      )}

      {/* Boutons principaux — visibles uniquement si aucune photo encore */}
      {photoUrls.length === 0 && !uploading && (
        <div className="grid grid-cols-2 gap-2.5">
          <Button
            type="button"
            variant="outline"
            className="h-24 border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center gap-1.5 transition-all group"
            onClick={() => cameraRef.current?.click()}
          >
            <div className="p-2 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
              <Camera className="h-5 w-5" />
            </div>
            <div className="text-center">
              <span className="text-xs font-bold text-foreground block">Prendre une photo</span>
              <span className="text-[10px] text-muted-foreground">Appareil photo en direct</span>
            </div>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-24 border-2 border-dashed border-blue-500/40 hover:border-blue-500 hover:bg-blue-500/5 flex flex-col items-center justify-center gap-1.5 transition-all group"
            onClick={() => galleryRef.current?.click()}
          >
            <div className="p-2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div className="text-center">
              <span className="text-xs font-bold text-foreground block">Depuis la galerie</span>
              <span className="text-[10px] text-muted-foreground">Sélectionner (jusqu'à 3)</span>
            </div>
          </Button>
        </div>
      )}

      {photoUrls.length === 0 && uploading && (
        <div className="w-full h-20 border rounded-xl flex flex-col items-center justify-center gap-2 bg-muted/20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-medium">Compression et envoi des photos…</span>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        📸 Appareil photo ou Galerie · JPG, PNG, HEIC, WEBP · Max {MAX_PHOTOS} photos
      </p>

      {/* Recommandations photo — infrastructure uniquement */}
      {isInfrastructure && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 overflow-hidden">
          <button
            type="button"
            aria-expanded={showTips}
            aria-controls="photo-tips-content"
            className="w-full flex items-center justify-between px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            onClick={() => setShowTips((v) => !v)}
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Comment prendre une bonne photo de signalement ?
            </span>
            {showTips
              ? <ChevronUp className="h-3.5 w-3.5 text-amber-600 shrink-0" aria-hidden="true" />
              : <ChevronDown className="h-3.5 w-3.5 text-amber-600 shrink-0" aria-hidden="true" />}
          </button>

          {showTips && (
            <div id="photo-tips-content" className="px-3 pb-3 space-y-3 border-t border-amber-500/20">
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
