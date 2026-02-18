
-- Drop and recreate SELECT policies with explicit role targeting
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;

-- Block anonymous access (RESTRICTIVE)
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles AS RESTRICTIVE FOR SELECT
TO anon
USING (false);

-- Users can only read their own profile (PERMISSIVE, scoped to authenticated)
CREATE POLICY "Users can read own profile"
ON public.profiles AS PERMISSIVE FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can read all profiles (PERMISSIVE, scoped to authenticated)
CREATE POLICY "Admins can read all profiles"
ON public.profiles AS PERMISSIVE FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
