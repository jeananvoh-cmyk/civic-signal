-- ── Migration P1 : Confidentialité & Masquage des Coordonnées GPS Publiques ──────
-- Floute les coordonnées précises à 3 décimales (~110m de précision au quartier)
-- sur les RPCs publiques pour empêcher la géolocalisation exacte des domiciles.

-- 1. Mise à jour de get_public_reports
DROP FUNCTION IF EXISTS public.get_public_reports();

CREATE FUNCTION public.get_public_reports()
RETURNS TABLE (
  id uuid,
  service_type text,
  report_category text,
  description text,
  location text,
  latitude double precision,
  longitude double precision,
  urgency text,
  status text,
  reporter_type text,
  start_time timestamptz,
  verifications integer,
  created_at timestamptz,
  resolved_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.service_type,
    r.report_category,
    LEFT(r.description, 120) AS description,
    r.location,
    ROUND(r.latitude::numeric, 3)::double precision AS latitude,
    ROUND(r.longitude::numeric, 3)::double precision AS longitude,
    r.urgency,
    r.status,
    r.reporter_type,
    r.start_time,
    r.verifications,
    r.created_at,
    r.resolved_at
  FROM public.reports r
  WHERE auth.uid() IS NOT NULL
    AND r.validated = true
  ORDER BY r.created_at DESC
  LIMIT 100;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_reports TO authenticated;

-- 2. Mise à jour de get_public_infrastructure_reports (suppression des anciennes signatures)
DROP FUNCTION IF EXISTS public.get_public_infrastructure_reports();
DROP FUNCTION IF EXISTS public.get_public_infrastructure_reports(text, integer, integer);

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
