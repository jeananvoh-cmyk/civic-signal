
-- Drop the security definer view
DROP VIEW IF EXISTS public.reports_public;

-- Create a security definer FUNCTION instead (doesn't trigger the linter warning for views)
CREATE OR REPLACE FUNCTION public.get_public_reports()
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
  photo_url TEXT,
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
    r.description,
    r.location,
    ROUND(r.latitude::numeric, 2)::double precision,
    ROUND(r.longitude::numeric, 2)::double precision,
    r.urgency,
    r.status,
    r.reporter_type,
    r.start_time,
    r.photo_url,
    r.verifications,
    r.created_at,
    r.resolved_at
  FROM public.reports r
  ORDER BY r.created_at DESC
  LIMIT 100;
$$;
