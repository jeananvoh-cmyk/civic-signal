
-- Make bucket private
UPDATE storage.buckets SET public = false WHERE id = 'report-photos';

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view report photos" ON storage.objects;

-- Authenticated users can view report photos
CREATE POLICY "Authenticated users can view report photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'report-photos');
