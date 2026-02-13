
DROP FUNCTION IF EXISTS public.get_public_reports();

CREATE FUNCTION public.get_public_reports()
RETURNS TABLE (
  id UUID,
  service_type TEXT,
  description TEXT,
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  urgency TEXT,
  status TEXT,
  reporter_type TEXT,
  start_time TIMESTAMPTZ,
  verifications INTEGER,
  created_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.service_type,
    LEFT(r.description, 120) AS description,
    r.location,
    ROUND(r.latitude::numeric, 1)::double precision AS latitude,
    ROUND(r.longitude::numeric, 1)::double precision AS longitude,
    r.urgency,
    r.status,
    r.reporter_type,
    r.start_time,
    r.verifications,
    r.created_at,
    r.resolved_at
  FROM public.reports r
  WHERE auth.uid() IS NOT NULL
  ORDER BY r.created_at DESC
  LIMIT 100;
$$;
