
-- Drop the old public SELECT policy (may already be gone)
DROP POLICY IF EXISTS "Anyone can view report photos" ON storage.objects;
