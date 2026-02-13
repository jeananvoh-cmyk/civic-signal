-- Allow admins to delete any report
CREATE POLICY "Admins can delete all reports"
ON public.reports
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));