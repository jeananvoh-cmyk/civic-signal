-- Signalements d'infrastructure : données d'intérêt public
-- Visibles sans connexion, sans exposer user_id ni coordonnées GPS précises.

-- 1. Policy RLS : lecture anonyme des signalements infrastructure
CREATE POLICY "Public can read infrastructure reports"
  ON public.reports FOR SELECT
  TO anon
  USING (report_category = 'infrastructure');

-- 2. RPC publique — retourne les champs sûrs uniquement (pas user_id, pas GPS précis)
CREATE OR REPLACE FUNCTION public.get_public_infrastructure_reports(
  p_commune   text    DEFAULT NULL,
  p_limit     integer DEFAULT 50,
  p_offset    integer DEFAULT 0
)
RETURNS TABLE (
  id                  uuid,
  service_type        text,
  description         text,
  location            text,
  commune             text,
  quartier            text,
  status              text,
  urgency             text,
  created_at          timestamptz,
  photo_url           text,
  photo_urls          text[],
  verifications       integer,
  repair_verifications integer,
  impacted_people     integer,
  reporter_type       text,
  -- GPS arrondi à ~500m pour orienter sans exposer l'adresse exacte
  latitude_approx     numeric,
  longitude_approx    numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id,
    service_type,
    description,
    location,
    commune,
    quartier,
    status,
    urgency,
    created_at,
    photo_url,
    photo_urls,
    verifications,
    repair_verifications,
    impacted_people,
    reporter_type,
    ROUND(latitude::numeric,  3) AS latitude_approx,   -- ~100m de précision
    ROUND(longitude::numeric, 3) AS longitude_approx
  FROM public.reports
  WHERE report_category = 'infrastructure'
    AND status = 'active'
    AND (p_commune IS NULL OR commune ILIKE p_commune)
  ORDER BY created_at DESC
  LIMIT  p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_infrastructure_reports TO anon, authenticated;
