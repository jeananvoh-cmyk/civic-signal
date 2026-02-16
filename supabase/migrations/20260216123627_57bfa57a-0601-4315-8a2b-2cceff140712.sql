
-- Fix profiles RLS: drop all SELECT policies and recreate with proper TO clauses

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;

-- Restrictive deny for anon role
CREATE POLICY "Deny anonymous access to profiles"
  ON public.profiles AS RESTRICTIVE FOR SELECT
  TO anon
  USING (false);

-- Permissive: users can read own profile (authenticated only)
CREATE POLICY "Users can read own profile"
  ON public.profiles AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Permissive: admins can read all profiles (authenticated only)
CREATE POLICY "Admins can read all profiles"
  ON public.profiles AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
