-- Optimize the pending photo fingerprint SELECT policy so auth.uid()
-- is evaluated once per statement instead of once per row.
DROP POLICY IF EXISTS "Users can read their own pending photo fingerprints"
  ON public.photo_fingerprint_pending;

CREATE POLICY "Users can read their own pending photo fingerprints"
  ON public.photo_fingerprint_pending
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);
