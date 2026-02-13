
-- Remove the anon policy on the base table (it exposes user_id)
DROP POLICY "Anon can read public reports view" ON public.reports;

-- Recreate the view without security_invoker so it runs as definer (bypasses RLS)
DROP VIEW IF EXISTS public.reports_public;
CREATE VIEW public.reports_public AS
  SELECT
    id,
    service_type,
    description,
    location,
    ROUND(latitude::numeric, 2)::double precision AS latitude,
    ROUND(longitude::numeric, 2)::double precision AS longitude,
    urgency,
    status,
    reporter_type,
    start_time,
    photo_url,
    verifications,
    created_at,
    resolved_at
  FROM public.reports;
