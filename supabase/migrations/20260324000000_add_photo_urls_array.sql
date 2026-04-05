-- Ajout du tableau de photos (max 3) sur les signalements
-- photo_url reste la photo principale (rétro-compatibilité)
-- photo_urls contient toutes les URLs incluant photo_url

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS photo_urls text[] DEFAULT '{}'::text[];

-- Backfill : les signalements existants avec une photo_url → photo_urls = [photo_url]
UPDATE reports
SET photo_urls = ARRAY[photo_url]
WHERE photo_url IS NOT NULL AND (photo_urls IS NULL OR array_length(photo_urls, 1) IS NULL);

COMMENT ON COLUMN reports.photo_urls IS 'Tableau des chemins de photos (max 3). photo_url reste la 1ère photo pour la rétro-compatibilité.';
