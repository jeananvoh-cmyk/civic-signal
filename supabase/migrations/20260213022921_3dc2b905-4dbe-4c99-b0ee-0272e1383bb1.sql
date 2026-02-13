
-- Replace the overly permissive authenticated SELECT policy
DROP POLICY "Authenticated users can view all reports" ON public.reports;

-- Users can only directly read their own reports (full detail)
CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
