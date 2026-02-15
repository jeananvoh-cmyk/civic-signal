
-- Drop the overly permissive INSERT policy
DROP POLICY "System can insert notifications" ON public.notifications;

-- The trigger runs as SECURITY DEFINER so it bypasses RLS.
-- No INSERT policy needed for regular users.
