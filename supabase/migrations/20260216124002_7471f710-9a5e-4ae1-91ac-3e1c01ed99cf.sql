
-- Remove the overly permissive "Anyone can view reports" policy
DROP POLICY IF EXISTS "Anyone can view reports" ON public.reports;

-- Add explicit restrictive deny for anonymous users
CREATE POLICY "Deny anonymous access to reports"
  ON public.reports AS RESTRICTIVE FOR SELECT
  TO anon
  USING (false);
