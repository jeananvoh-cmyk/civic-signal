-- Add quartier to find_similar_reports return type
CREATE OR REPLACE FUNCTION public.find_similar_reports(
  p_commune text,
  p_quartier text,
  p_service_type text,
  p_report_category text DEFAULT 'outage'
)
RETURNS TABLE(
  id uuid,
  service_type text,
  description text,
  quartier text,
  verifications integer,
  created_at timestamptz,
  start_time timestamptz,
  user_id uuid
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    r.id,
    r.service_type,
    LEFT(r.description, 120) AS description,
    r.quartier,
    r.verifications,
    r.created_at,
    r.start_time,
    r.user_id
  FROM public.reports r
  WHERE r.status = 'active'
    AND r.validated = true
    AND LOWER(r.commune) = LOWER(p_commune)
    AND LOWER(r.quartier) = LOWER(p_quartier)
    AND r.service_type = p_service_type
    AND r.report_category = p_report_category
    AND r.created_at > (NOW() - INTERVAL '24 hours')
  ORDER BY r.verifications DESC, r.created_at DESC
  LIMIT 5;
$$;
