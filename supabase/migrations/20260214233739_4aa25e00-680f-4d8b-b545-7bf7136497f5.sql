
CREATE POLICY "Users can create corroborations"
ON public.corroborations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
