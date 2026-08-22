BEGIN;
DROP POLICY IF EXISTS "Authenticated users can insert repair_confirmations" ON public.repair_confirmations;
CREATE POLICY "Authenticated users can insert repair confirmations" ON public.repair_confirmations FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id AND EXISTS (SELECT 1 FROM public.reports r WHERE r.id=repair_confirmations.report_id AND r.user_id=auth.uid() AND r.validated=true AND r.status='active'));
DROP POLICY IF EXISTS "Authenticated users can insert photo fingerprints" ON public.photo_fingerprints;
CREATE POLICY "Users can insert own photo fingerprints" ON public.photo_fingerprints FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id AND (report_id IS NULL OR EXISTS (SELECT 1 FROM public.reports r WHERE r.id=photo_fingerprints.report_id AND r.user_id=auth.uid())));
COMMIT;
