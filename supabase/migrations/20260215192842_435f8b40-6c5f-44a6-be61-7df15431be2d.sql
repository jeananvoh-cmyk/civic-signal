-- Make the report-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'report-photos';

-- Ensure authenticated users can upload to their own folder
CREATE POLICY "Users can upload own photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'report-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can view their own photos
CREATE POLICY "Users can view own photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'report-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admins/moderators can view all photos (for validation)
CREATE POLICY "Admins can view all photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'report-photos' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')));

-- Users can delete their own photos
CREATE POLICY "Users can delete own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'report-photos' AND auth.uid()::text = (storage.foldername(name))[1]);