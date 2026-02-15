
-- Drop the permissive INSERT policy that allows direct inserts
DROP POLICY IF EXISTS "Users can create corroborations" ON public.corroborations;

-- Block all direct inserts — only the SECURITY DEFINER RPC can insert
CREATE POLICY "No direct inserts on corroborations"
  ON public.corroborations FOR INSERT
  WITH CHECK (false);

-- Block direct updates
CREATE POLICY "No direct updates on corroborations"
  ON public.corroborations FOR UPDATE
  USING (false);

-- Block direct deletes
CREATE POLICY "No direct deletes on corroborations"
  ON public.corroborations FOR DELETE
  USING (false);
