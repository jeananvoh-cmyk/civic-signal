CREATE POLICY "Authenticated users can view infrastructure reports"
ON public.reports
FOR SELECT
TO authenticated
USING (report_category = 'infrastructure');