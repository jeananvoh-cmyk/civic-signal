-- Ajouter report_category au RPC get_public_reports
-- Permet de distinguer coupure outage vs infra CIE/SODECI côté client

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
LANGUAGE SQL
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
    CASE
      WHEN r.report_category = 'outage' THEN ROUND(r.latitude::numeric, 1)::double precision
      ELSE r.latitude
    END AS latitude,
    CASE
      WHEN r.report_category = 'outage' THEN ROUND(r.longitude::numeric, 1)::double precision
      ELSE r.longitude
    END AS longitude,
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
