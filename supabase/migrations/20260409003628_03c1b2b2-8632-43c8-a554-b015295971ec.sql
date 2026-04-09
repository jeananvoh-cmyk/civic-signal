CREATE POLICY "Anon can view report photos"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'report-photos');