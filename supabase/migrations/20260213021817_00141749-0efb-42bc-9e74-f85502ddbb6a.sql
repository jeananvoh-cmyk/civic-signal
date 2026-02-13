
-- Drop the overly permissive public SELECT policy
DROP POLICY "Anyone can view reports" ON public.reports;

-- Authenticated users can view all reports
CREATE POLICY "Authenticated users can view all reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (true);

-- Create a public view that hides user_id and rounds coordinates
CREATE VIEW public.reports_public
WITH (security_invoker = on) AS
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

-- Allow anonymous users to read the public view
CREATE POLICY "Anon can read public reports view"
  ON public.reports FOR SELECT
  TO anon
  USING (true);
