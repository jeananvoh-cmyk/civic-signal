import { useState } from "react";
import { ChevronLeft, ChevronRight, X, Maximize2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useSignedUrl } from "@/hooks/useSignedUrl";

// ── Vignette individuelle ─────────────────────────────────────────────────────
function GalleryThumb({
  path,
  alt,
  className,
  onClick,
}: {
  path: string;
  alt: string;
  className?: string;
  onClick: () => void;
}) {
  const url = useSignedUrl(path);
  return (
    <div
      className={`relative cursor-pointer group overflow-hidden ${className ?? ""}`}
      onClick={onClick}
    >
      {url && (
        <img src={url} alt={alt} className="w-full h-full object-cover" />
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
      <div className="absolute bottom-2 right-2 bg-black/50 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Maximize2 className="h-3.5 w-3.5" />
      </div>
    </div>
  );
}

// ── Image plein écran dans le lightbox ───────────────────────────────────────
function LightboxImage({ path }: { path: string }) {
  const url = useSignedUrl(path);
  return url ? (
    <img
      src={url}
      alt="Photo du signalement"
      className="w-full max-h-[85vh] object-contain"
    />
  ) : null;
}

// ── Composant principal ───────────────────────────────────────────────────────
interface PhotoGalleryProps {
  /** Chemins de stockage Supabase (max 3) */
  photos: string[];
  /** Classe CSS appliquée au conteneur de la grille */
  className?: string;
  /** Hauteur des vignettes (Tailwind), défaut "h-48" */
  thumbHeight?: string;
}

/**
 * Affiche jusqu'à 3 photos en grille et ouvre un lightbox
 * avec navigation prev/next au clic.
 */
const PhotoGallery = ({
  photos,
  className = "",
  thumbHeight = "h-48",
}: PhotoGalleryProps) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  const open = (i: number) => setLightboxIndex(i);
  const close = () => setLightboxIndex(null);
  const prev = () =>
    setLightboxIndex((i) =>
      i !== null ? (i - 1 + photos.length) % photos.length : 0
    );
  const next = () =>
    setLightboxIndex((i) =>
      i !== null ? (i + 1) % photos.length : 0
    );

  // ── Mise en page grille ────────────────────────────────────────────────────
  const renderGrid = () => {
    if (photos.length === 1) {
      return (
        <GalleryThumb
          path={photos[0]}
          alt="Photo 1"
          className={`rounded-xl ${thumbHeight}`}
          onClick={() => open(0)}
        />
      );
    }

    if (photos.length === 2) {
      return (
        <div className="grid grid-cols-2 gap-1">
          {photos.map((p, i) => (
            <GalleryThumb
              key={p}
              path={p}
              alt={`Photo ${i + 1}`}
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
          path={photos[0]}
          alt="Photo 1"
          className={`col-span-2 rounded-t-xl ${thumbHeight}`}
          onClick={() => open(0)}
        />
        <GalleryThumb
          path={photos[1]}
          alt="Photo 2"
          className={`rounded-bl-xl ${thumbHeight}`}
          onClick={() => open(1)}
        />
        <GalleryThumb
          path={photos[2]}
          alt="Photo 3"
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
            className="absolute top-3 right-3 z-10 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Navigation prev/next */}
          {photos.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={next}
                className="absolute right-12 top-1/2 -translate-y-1/2 z-10 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Image courante */}
          {lightboxIndex !== null && (
            <LightboxImage path={photos[lightboxIndex]} />
          )}

          {/* Indicateurs de position */}
          {photos.length > 1 && lightboxIndex !== null && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === lightboxIndex
                      ? "w-4 bg-white"
                      : "w-1.5 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Compteur */}
          {photos.length > 1 && lightboxIndex !== null && (
            <div className="absolute top-3 left-3 bg-black/60 text-white text-xs rounded-full px-2.5 py-1">
              {lightboxIndex + 1} / {photos.length}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PhotoGallery;
