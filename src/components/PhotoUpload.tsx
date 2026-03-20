import { useState, useRef } from "react";
import { Camera, X, Loader2, MapPin, ImageIcon, AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/error-utils";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import * as exifr from "exifr";

interface PhotoUploadProps {
  onPhotoUploaded: (url: string) => void;
  onGpsFromPhoto?: (lat: number, lng: number) => void;
  photoUrl: string | null;
  isInfrastructure?: boolean;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo
const MAX_OUTPUT_PX = 1920;       // largeur/hauteur max après compression
const JPEG_QUALITY = 0.82;        // qualité JPEG sortie

// ── Compression canvas ────────────────────────────────────────────────────────
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Redimensionner si l'image dépasse MAX_OUTPUT_PX
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
        JPEG_QUALITY,
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

// ── Composant ─────────────────────────────────────────────────────────────────
const PhotoUpload = ({
  onPhotoUploaded,
  onGpsFromPhoto,
  photoUrl,
  isInfrastructure = false,
}: PhotoUploadProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [gpsSource, setGpsSource] = useState<"photo" | "device" | null>(null);
  const [showTips, setShowTips] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const displayUrl = useSignedUrl(photoUrl);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Réinitialiser l'input pour permettre re-sélection du même fichier
    e.target.value = "";

    if (!file.type.startsWith("image/")) {
      toast.error("Seules les images sont acceptées");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("L'image ne doit pas dépasser 5 Mo");
      return;
    }

    setUploading(true);
    setGpsSource(null);

    try {
      // 1. Extraire le GPS EXIF en parallèle avec la compression
      const [exifGps, compressed] = await Promise.all([
        extractExifGps(file),
        compressImage(file),
      ]);

      // 2. Upload du fichier compressé
      const path = `${user.id}/${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from("report-photos")
        .upload(path, compressed, { upsert: true, contentType: "image/jpeg" });

      if (error) throw error;

      onPhotoUploaded(path);

      // 3. Communiquer les coordonnées GPS si trouvées dans l'EXIF
      if (exifGps && onGpsFromPhoto) {
        onGpsFromPhoto(exifGps.lat, exifGps.lng);
        setGpsSource("photo");
        toast.success("📸 Photo ajoutée — position GPS extraite de la photo", {
          description: `Coordonnées : ${exifGps.lat.toFixed(5)}, ${exifGps.lng.toFixed(5)}`,
          duration: 5000,
        });
      } else {
        setGpsSource("device");
        toast.success("Photo ajoutée !");
        if (isInfrastructure && !exifGps) {
          toast("💡 Conseil", {
            description:
              "Si vous partagez une photo prise ailleurs, la position GPS de votre appareil sera utilisée. Vous pouvez la corriger sur la carte.",
            duration: 6000,
          });
        }
      }
    } catch (err: any) {
      toast.error(getUserFriendlyError(err, "Erreur lors de l'upload photo"));
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = () => {
    onPhotoUploaded("");
    setGpsSource(null);
  };

  return (
    <div className="space-y-2">
      {/* Input : pas de capture="environment" → laisse le choix caméra / galerie */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {photoUrl ? (
        <div className="relative rounded-xl overflow-hidden border border-border">
          <img
            src={displayUrl || ""}
            alt="Photo du signalement"
            className="w-full h-40 object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 rounded-full"
            onClick={removePhoto}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Indicateur source GPS */}
          {gpsSource && (
            <div
              className={`absolute bottom-2 left-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium
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
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full h-24 border-dashed border-2 flex flex-col gap-2"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Compression et upload…
              </span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Camera className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground/40 text-sm">|</span>
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">
                Prendre une photo ou choisir depuis la galerie
              </span>
            </>
          )}
        </Button>
      )}

      <p className="text-xs text-muted-foreground">
        Formats acceptés : JPG, PNG, HEIC, WEBP · Max 5 Mo
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

              {/* Bonnes pratiques */}
              <div className="pt-2 space-y-1.5">
                <p className="text-[11px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wide">
                  À faire
                </p>
                {[
                  "Prenez la photo directement sur place, au moment du constat",
                  "Cadrez le problème entièrement (route, trottoir, infrastructure, etc.)",
                  "Incluez un repère visible : panneau de rue, bâtiment, numéro de maison",
                  "Prenez plusieurs angles si possible (avant d'upload le meilleur)",
                  "Activez le GPS de votre téléphone avant de prendre la photo",
                ].map((tip) => (
                  <div key={tip} className="flex items-start gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-muted-foreground leading-snug">{tip}</span>
                  </div>
                ))}
              </div>

              {/* À éviter */}
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

              {/* Note GPS */}
              <div className="flex items-start gap-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 p-2">
                <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-700 dark:text-blue-400 leading-snug">
                  Si votre photo a été prise <strong>sur les lieux</strong>, ses coordonnées GPS
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
