import { useState } from "react";
import { ChevronLeft, ChevronRight, X, Maximize2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { cn } from "@/lib/utils";

// ── Vignette individuelle ─────────────────────────────────────────────────────
function GalleryThumb({
  path,
  alt,
  className,
  fallbackImage,
  onClick,
}: {
  path: string;
  alt: string;
  className?: string;
  fallbackImage?: string;
  onClick: () => void;
}) {
  const url = useSignedUrl(path);
  const [hasError, setHasError] = useState(false);
  const displaySrc = (!hasError && url) ? url : fallbackImage;

  return (
    <div
      className={`relative cursor-pointer group overflow-hidden bg-muted/40 ${className ?? ""}`}
      onClick={onClick}
    >
      {displaySrc ? (
        <img
          src={displaySrc}
          alt={alt}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted/30 text-muted-foreground animate-pulse" />
      )}
      {/* Subtle 1px image outline — black in light mode, white in dark */}
      <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.10)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)] pointer-events-none" />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
      <div className="absolute bottom-2 right-2 bg-black/50 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Maximize2 className="h-3.5 w-3.5" />
      </div>
    </div>
  );
}

// ── Image plein écran dans le lightbox ───────────────────────────────────────
function LightboxImage({ path, fallbackImage }: { path: string; fallbackImage?: string }) {
  const url = useSignedUrl(path);
  const [hasError, setHasError] = useState(false);
  const displaySrc = (!hasError && url) ? url : fallbackImage;

  return displaySrc ? (
    <img
      src={displaySrc}
      alt="Photo du signalement"
      onError={() => setHasError(true)}
      className="w-full max-h-[85vh] object-contain"
    />
  ) : null;
}

// ── Composant principal ───────────────────────────────────────────────────────
interface PhotoGalleryProps {
  /** Chemins de stockage Supabase (max 3) */
  photos: string[];
  /** Image de secours indicative si la photo est indisponible */
  fallbackImage?: string;
  /** Classe CSS appliquée au conteneur de la grille */
  className?: string;
  /** Hauteur des vignettes (Tailwind), défaut "h-48" */
  thumbHeight?: string;
  /** ISO date du signalement — affichée dans le lightbox */
  reportDate?: string;
}

/**
 * Affiche jusqu'à 3 photos en grille et ouvre un lightbox
 * avec navigation prev/next au clic.
 */
const PhotoGallery = ({
  photos,
  fallbackImage,
  className = "",
  thumbHeight = "h-48",
  reportDate,
}: PhotoGalleryProps) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0 && !fallbackImage) return null;

  const validPhotos = photos.length > 0 ? photos : (fallbackImage ? [fallbackImage] : []);

  const open = (i: number) => setLightboxIndex(i);
  const close = () => setLightboxIndex(null);
  const prev = () =>
    setLightboxIndex((i) =>
      i !== null ? (i - 1 + validPhotos.length) % validPhotos.length : 0
    );
  const next = () =>
    setLightboxIndex((i) =>
      i !== null ? (i + 1) % validPhotos.length : 0
    );

  // ── Mise en page grille ────────────────────────────────────────────────────
  const renderGrid = () => {
    if (validPhotos.length === 1) {
      return (
        <GalleryThumb
          path={validPhotos[0]}
          alt="Photo 1"
          fallbackImage={fallbackImage}
          className={`rounded-xl ${thumbHeight}`}
          onClick={() => open(0)}
        />
      );
    }

    if (validPhotos.length === 2) {
      return (
        <div className="grid grid-cols-2 gap-1">
          {validPhotos.map((p, i) => (
            <GalleryThumb
              key={p + i}
              path={p}
              alt={`Photo ${i + 1}`}
              fallbackImage={fallbackImage}
              className={`rounded-xl ${thumbHeight}`}
              onClick={() => open(i)}
            />
          ))}
        </div>
      );
    }

    // 3 photos : première pleine largeur, 2 en dessous
    return (
      <div className="grid grid-cols-2 gap-1">
        <GalleryThumb
          path={validPhotos[0]}
          alt="Photo 1"
          fallbackImage={fallbackImage}
          className={`col-span-2 rounded-t-xl ${thumbHeight}`}
          onClick={() => open(0)}
        />
        <GalleryThumb
          path={validPhotos[1]}
          alt="Photo 2"
          fallbackImage={fallbackImage}
          className={`rounded-bl-xl ${thumbHeight}`}
          onClick={() => open(1)}
        />
        <GalleryThumb
          path={validPhotos[2]}
          alt="Photo 3"
          fallbackImage={fallbackImage}
          className={`rounded-br-xl ${thumbHeight}`}
          onClick={() => open(2)}
        />
      </div>
    );
  };

  return (
    <>
      <div className={className}>{renderGrid()}</div>

      {/* ── Lightbox ─────────────────────────────────────────────────────── */}
      <Dialog open={lightboxIndex !== null} onOpenChange={(open) => !open && close()}>
        <DialogContent className="max-w-screen-md p-0 bg-black border-0 overflow-hidden">
          {/* Fermer */}
          <button
            onClick={close}
            aria-label="Fermer la galerie"
            className="absolute top-3 right-3 z-10 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Navigation prev/next */}
          {validPhotos.length > 1 && (
            <>
              <button
                onClick={prev}
                aria-label="Photo précédente"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                onClick={next}
                aria-label="Photo suivante"
                className="absolute right-12 top-1/2 -translate-y-1/2 z-10 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </>
          )}

          {/* Image courante */}
          {lightboxIndex !== null && (
            <LightboxImage path={validPhotos[lightboxIndex]} fallbackImage={fallbackImage} />
          )}

          {/* Indicateurs de position */}
          {validPhotos.length > 1 && lightboxIndex !== null && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5" role="group" aria-label="Sélection de photo">
              {validPhotos.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Photo ${i + 1} sur ${validPhotos.length}`}
                  aria-current={i === lightboxIndex ? "true" : undefined}
                  onClick={() => setLightboxIndex(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-[width,background-color] duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white",
                    i === lightboxIndex ? "w-4 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
                  )}
                />
              ))}
            </div>
          )}

          {/* Compteur */}
          {validPhotos.length > 1 && lightboxIndex !== null && (
            <div
              className="absolute top-3 left-3 bg-black/60 text-white text-xs rounded-full px-2.5 py-1 tabular-nums"
              aria-live="polite"
              aria-atomic="true"
            >
              {lightboxIndex + 1} / {validPhotos.length}
            </div>
          )}

          {/* Date du signalement — FixMyStreet style */}
          {reportDate && lightboxIndex !== null && (
            <div className={cn(
              "absolute left-3 bg-black/60 text-white text-xs rounded-full px-3 py-1.5",
              validPhotos.length > 1 ? "bottom-9" : "bottom-3"
            )}>
              Signalé le{" "}
              {new Date(reportDate).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PhotoGallery;
