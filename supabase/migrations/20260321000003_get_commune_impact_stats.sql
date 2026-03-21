-- ============================================================
-- COMMUNE IMPACT STATS RPC
-- Returns resolution rate, infra reports count, and 7-day trend
-- for a given commune (used by CommuneDetailPage).
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_commune_impact_stats(p_commune text)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT json_build_object(
    'total_reports',    (SELECT COUNT(*)::integer     FROM public.reports WHERE LOWER(commune) = LOWER(p_commune)),
    'resolved_reports', (SELECT COUNT(*)::integer     FROM public.reports WHERE LOWER(commune) = LOWER(p_commune) AND status = 'resolved'),
    'infra_reports',    (SELECT COUNT(*)::integer     FROM public.reports WHERE LOWER(commune) = LOWER(p_commune) AND report_category = 'infrastructure'),
    'reports_last_7',   (SELECT COUNT(*)::integer     FROM public.reports WHERE LOWER(commune) = LOWER(p_commune) AND created_at >= NOW() - INTERVAL '7 days'),
    'reports_prev_7',   (SELECT COUNT(*)::integer     FROM public.reports WHERE LOWER(commune) = LOWER(p_commune) AND created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days')
  )
$$;

GRANT EXECUTE ON FUNCTION public.get_commune_impact_stats(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_commune_impact_stats(text) TO authenticated;
