
-- Public RPC to expose active outage count to unauthenticated visitors.
-- The "Deny anonymous access to reports" RESTRICTIVE policy blocks all anon
-- SELECT on the reports table, so the homepage badge always shows 0 for visitors.
-- This SECURITY DEFINER function bypasses RLS and returns only the count
-- (no sensitive data), then grants EXECUTE to the anon role.

CREATE OR REPLACE FUNCTION public.get_active_outage_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.reports
  WHERE status = 'active'
    AND report_category = 'outage';
$$;

-- Allow anonymous (unauthenticated) callers to invoke this function
GRANT EXECUTE ON FUNCTION public.get_active_outage_count() TO anon;
-- Also ensure authenticated role has access
GRANT EXECUTE ON FUNCTION public.get_active_outage_count() TO authenticated;
