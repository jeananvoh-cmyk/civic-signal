BEGIN;
DROP POLICY IF EXISTS "Authenticated users can view infrastructure reports" ON public.reports;
DROP POLICY IF EXISTS "Users can update own reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can delete all reports" ON public.reports;
CREATE POLICY "Admins can delete all reports" ON public.reports FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
COMMIT;
