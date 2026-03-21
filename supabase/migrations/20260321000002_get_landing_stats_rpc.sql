-- ============================================================
-- LANDING STATS RPC
-- Returns total reports, resolved reports, and total users
-- for the public landing page (accessible to anon).
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_landing_stats()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT json_build_object(
    'total_reports',    (SELECT COUNT(*)::integer FROM public.reports),
    'resolved_reports', (SELECT COUNT(*)::integer FROM public.reports WHERE status = 'resolved'),
    'total_users',      (SELECT COUNT(*)::integer FROM public.profiles)
  )
$$;

GRANT EXECUTE ON FUNCTION public.get_landing_stats() TO anon;
GRANT EXECUTE ON FUNCTION public.get_landing_stats() TO authenticated;
