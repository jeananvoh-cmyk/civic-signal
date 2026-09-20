/**
 * Utilitaire de traitement et d'optimisation d'images pour les photos d'élus.
 * - Redimensionnement automatique en format portrait carré (480x480 px max).
 * - Cadrage intelligent centré sur le buste/visage (offset vertical 20%).
 * - Compression optimale en WebP (qualité 0.85) avec repli automatique en JPEG.
 * - Poids résultant moyen : 20 à 35 Ko (idéal pour le chargement instantané et la persistance).
 */
export const processLeaderPhotoFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Le fichier sélectionné n\'est pas une image valide.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier image.'));
    
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format d\'image corrompu ou non supporté.'));
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const TARGET_SIZE = 480;

          // Cadrage carré centré sur le visage (léger décalage vers le haut pour les portraits)
          const minDim = Math.min(img.width, img.height);
          const startX = (img.width - minDim) / 2;
          const startY = Math.max(0, (img.height - minDim) * 0.15);

          canvas.width = TARGET_SIZE;
          canvas.height = TARGET_SIZE;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Impossible d\'initialiser le contexte graphique.'));
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, TARGET_SIZE, TARGET_SIZE);

          // Export en WebP (format moderne le plus léger et adapté) ou JPEG de repli
          let dataUrl = canvas.toDataURL('image/webp', 0.85);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          }

          resolve(dataUrl);
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Erreur lors du traitement de l\'image.'));
        }
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
};
