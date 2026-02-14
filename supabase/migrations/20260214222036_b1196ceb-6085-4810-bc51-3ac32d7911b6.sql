
CREATE OR REPLACE FUNCTION public.get_commune_quartier_stats(p_commune text)
RETURNS TABLE(
  quartier text,
  electricite_actifs bigint,
  electricite_resolus bigint,
  electricite_total bigint,
  eau_actifs bigint,
  eau_resolus bigint,
  eau_total bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    r.quartier,
    COUNT(*) FILTER (WHERE r.service_type = 'electricity' AND r.status = 'active') AS electricite_actifs,
    COUNT(*) FILTER (WHERE r.service_type = 'electricity' AND r.status = 'resolved') AS electricite_resolus,
    COUNT(*) FILTER (WHERE r.service_type = 'electricity') AS electricite_total,
    COUNT(*) FILTER (WHERE r.service_type = 'water' AND r.status = 'active') AS eau_actifs,
    COUNT(*) FILTER (WHERE r.service_type = 'water' AND r.status = 'resolved') AS eau_resolus,
    COUNT(*) FILTER (WHERE r.service_type = 'water') AS eau_total
  FROM reports r
  WHERE LOWER(r.commune) = LOWER(p_commune)
    AND r.validated = true
    AND r.quartier <> ''
  GROUP BY r.quartier
  ORDER BY (COUNT(*) FILTER (WHERE r.status = 'active')) DESC, r.quartier;
$$;
