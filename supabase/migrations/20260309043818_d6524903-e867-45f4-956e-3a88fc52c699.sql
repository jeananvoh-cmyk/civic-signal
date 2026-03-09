-- Modifier get_public_reports pour différencier les coupures et infrastructures
-- Coupures (outages) : position arrondie pour anonymat
-- Infrastructures : position exacte pour intervention efficace

DROP FUNCTION IF EXISTS public.get_public_reports();

CREATE FUNCTION public.get_public_reports()
RETURNS TABLE (
  id uuid,
  service_type text,
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
    LEFT(r.description, 120) AS description,
    r.location,
    -- Position arrondie pour les coupures (anonymat), exacte pour les infrastructures (intervention)
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