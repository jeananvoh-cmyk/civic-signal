
-- Function to return daily report counts for the last N days, filterable by commune
CREATE OR REPLACE FUNCTION public.get_reports_time_series(
  p_days integer DEFAULT 90
)
RETURNS TABLE(
  report_date date,
  commune text,
  service_type text,
  actifs bigint,
  resolus bigint,
  total bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    d.report_date,
    c.nom AS commune,
    COALESCE(r.service_type, 'electricity') AS service_type,
    COUNT(r.id) FILTER (WHERE r.status = 'active') AS actifs,
    COUNT(r.id) FILTER (WHERE r.status = 'resolved') AS resolus,
    COUNT(r.id) AS total
  FROM generate_series(
    (CURRENT_DATE - (p_days || ' days')::interval)::date,
    CURRENT_DATE,
    '1 day'::interval
  ) AS d(report_date)
  CROSS JOIN public.communes c
  LEFT JOIN public.reports r 
    ON r.created_at::date = d.report_date 
    AND LOWER(r.commune) = LOWER(c.nom)
    AND r.validated = true
  GROUP BY d.report_date, c.nom, r.service_type
  ORDER BY d.report_date ASC, c.nom ASC;
$$;
