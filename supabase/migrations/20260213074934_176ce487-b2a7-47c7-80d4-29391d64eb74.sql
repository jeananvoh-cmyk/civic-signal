
CREATE OR REPLACE FUNCTION public.get_commune_service_stats()
RETURNS TABLE(
  commune text,
  couleur text,
  population integer,
  electricite_actifs bigint,
  electricite_resolus bigint,
  electricite_total bigint,
  eau_actifs bigint,
  eau_resolus bigint,
  eau_total bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.nom AS commune,
    c.couleur,
    c.population,
    COALESCE(SUM(CASE WHEN r.service_type = 'electricity' AND r.status = 'active' THEN 1 ELSE 0 END), 0) AS electricite_actifs,
    COALESCE(SUM(CASE WHEN r.service_type = 'electricity' AND r.status = 'resolved' THEN 1 ELSE 0 END), 0) AS electricite_resolus,
    COALESCE(SUM(CASE WHEN r.service_type = 'electricity' THEN 1 ELSE 0 END), 0) AS electricite_total,
    COALESCE(SUM(CASE WHEN r.service_type = 'water' AND r.status = 'active' THEN 1 ELSE 0 END), 0) AS eau_actifs,
    COALESCE(SUM(CASE WHEN r.service_type = 'water' AND r.status = 'resolved' THEN 1 ELSE 0 END), 0) AS eau_resolus,
    COALESCE(SUM(CASE WHEN r.service_type = 'water' THEN 1 ELSE 0 END), 0) AS eau_total
  FROM communes c
  LEFT JOIN reports r ON r.commune = c.nom
  GROUP BY c.nom, c.couleur, c.population
  ORDER BY c.nom;
$$;
