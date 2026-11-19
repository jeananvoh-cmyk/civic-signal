-- Allow authenticated owners to read their own pending photo fingerprints.
-- Required by photo-sync.ts to verify that a 23505 retry conflict is
-- idempotent (same user + same SHA-256) before proceeding.

DROP POLICY IF EXISTS "Users can read their own pending photo fingerprints"
  ON public.photo_fingerprint_pending;

CREATE POLICY "Users can read their own pending photo fingerprints"
  ON public.photo_fingerprint_pending
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
