-- Fix: Remove overly broad SELECT policy that exposes all outage reports
-- (including precise GPS, user_id, vulnerable population data) to any authenticated user.
-- All legitimate access paths are already covered:
--   - Own reports: "Users can view own reports" (auth.uid() = user_id)
--   - Admin/mod: "Admins can view all reports" 
--   - Public map: get_public_reports() RPC (rounds coordinates)

DROP POLICY "Authenticated users can read outage reports" ON public.reports;