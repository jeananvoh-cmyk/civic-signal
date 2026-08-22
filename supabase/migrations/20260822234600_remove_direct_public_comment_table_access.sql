BEGIN;
DROP POLICY IF EXISTS "Public can read visible comments" ON public.report_comments;
COMMIT;
