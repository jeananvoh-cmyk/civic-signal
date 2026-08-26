BEGIN;

-- Retry safety: uploadPhotoArtifact() uses Storage upsert, so authenticated
-- owners need UPDATE permission on their own report-photo objects.
DROP POLICY IF EXISTS "Users can update own report photos" ON storage.objects;
CREATE POLICY "Users can update own report photos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'report-photos'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'report-photos'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND lower(storage.extension(name)) = ANY (ARRAY['jpg','jpeg','png','gif','webp','heic'])
  );

-- Allow a user to remove an orphaned pending fingerprint belonging to them.
DROP POLICY IF EXISTS "Users can delete own pending photo fingerprints" ON public.photo_fingerprint_pending;
CREATE POLICY "Users can delete own pending photo fingerprints"
  ON public.photo_fingerprint_pending
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Supports ownership-scoped cleanup and lookups without changing the logical contract.
CREATE INDEX IF NOT EXISTS idx_photo_fingerprint_pending_user_id
  ON public.photo_fingerprint_pending(user_id);

COMMIT;
