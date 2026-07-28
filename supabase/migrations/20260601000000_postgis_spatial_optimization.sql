-- ── Migration P2 : Optimisation Spatiale PostGIS & Indexation GIST ────────────

-- 1. Activer l'extension PostGIS dans Supabase
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- 2. Ajouter la colonne géométrique (Point, SRID 4326 = WGS84 GPS) sur public.reports
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS geom extensions.geometry(Point, 4326);

-- 3. Mettre à jour les lignes existantes
UPDATE public.reports
SET geom = extensions.ST_SetSRID(extensions.ST_MakePoint(longitude, latitude), 4326)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND geom IS NULL;

-- 4. Fonction trigger pour synchroniser automatiquement geom lors des INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.update_report_geom()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geom := extensions.ST_SetSRID(extensions.ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  ELSE
    NEW.geom := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Trigger avant insertion ou modification
DROP TRIGGER IF EXISTS trg_update_report_geom ON public.reports;
CREATE TRIGGER trg_update_report_geom
  BEFORE INSERT OR UPDATE OF latitude, longitude ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_report_geom();

-- 6. Index spatial GIST pour des recherches de proximité ultra-rapides
CREATE INDEX IF NOT EXISTS idx_reports_geom ON public.reports USING GIST (geom);

-- 7. Mise à jour de get_landing_nearby_reports utilisant ST_DWithin (spatial index)
CREATE OR REPLACE FUNCTION public.get_landing_nearby_reports(
  p_lat     double precision,
  p_lon     double precision,
  p_rayon_m double precision DEFAULT 2000,
  p_limit   integer          DEFAULT 5
)
RETURNS TABLE(
  id              uuid,
  service_type    text,
  report_category text,
  commune         text,
  quartier        text,
  description     text,
  created_at      timestamptz,
  verifications   integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions
AS $$
  SELECT
    r.id,
    r.service_type,
    r.report_category,
    r.commune,
    r.quartier,
    LEFT(r.description, 200) AS description,
    r.created_at,
    r.verifications
  FROM public.reports r
  WHERE r.status = 'active'
    AND r.geom IS NOT NULL
    AND extensions.ST_DWithin(
          r.geom::extensions.geography,
          extensions.ST_SetSRID(extensions.ST_MakePoint(p_lon, p_lat), 4326)::extensions.geography,
          p_rayon_m
        )
  ORDER BY
    extensions.ST_Distance(
      r.geom::extensions.geography,
      extensions.ST_SetSRID(extensions.ST_MakePoint(p_lon, p_lat), 4326)::extensions.geography
    ) ASC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_landing_nearby_reports TO anon, authenticated;
