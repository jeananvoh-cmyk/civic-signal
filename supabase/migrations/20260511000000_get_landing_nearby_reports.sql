-- RPC pour "Près de moi" sur la page d'accueil.
-- Filtre par haversine côté DB (évite de charger 100 lignes côté client).
-- Champs correspondant à l'interface NearbyReport du frontend.
CREATE OR REPLACE FUNCTION public.get_landing_nearby_reports(
  p_lat   double precision,
  p_lon   double precision,
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
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
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
  WHERE r.status      = 'active'
    AND r.latitude    IS NOT NULL
    AND r.longitude   IS NOT NULL
    AND (6371000 * acos(
      LEAST(1.0,
        cos(radians(p_lat)) * cos(radians(r.latitude)) *
        cos(radians(r.longitude) - radians(p_lon)) +
        sin(radians(p_lat)) * sin(radians(r.latitude))
      )
    )) <= p_rayon_m
  ORDER BY
    (6371000 * acos(
      LEAST(1.0,
        cos(radians(p_lat)) * cos(radians(r.latitude)) *
        cos(radians(r.longitude) - radians(p_lon)) +
        sin(radians(p_lat)) * sin(radians(r.latitude))
      )
    )) ASC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_landing_nearby_reports TO anon, authenticated;
