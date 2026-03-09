
CREATE OR REPLACE FUNCTION public.get_commune_infrastructure_stats()
RETURNS TABLE(
  commune TEXT,
  couleur TEXT,
  population BIGINT,
  elec_infra_actifs BIGINT,
  elec_infra_resolus BIGINT,
  elec_infra_total BIGINT,
  elec_infra_verified BIGINT,
  eau_infra_actifs BIGINT,
  eau_infra_resolus BIGINT,
  eau_infra_total BIGINT,
  eau_infra_verified BIGINT,
  mairie_infra_actifs BIGINT,
  mairie_infra_resolus BIGINT,
  mairie_infra_total BIGINT,
  mairie_infra_verified BIGINT
)
LANGUAGE sql STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    c.nom AS commune,
    c.couleur,
    c.population::BIGINT,
    COALESCE(SUM(CASE WHEN r.service_type = 'electricity' AND r.report_category = 'infrastructure' AND r.status = 'active' THEN 1 ELSE 0 END), 0) AS elec_infra_actifs,
    COALESCE(SUM(CASE WHEN r.service_type = 'electricity' AND r.report_category = 'infrastructure' AND r.status = 'resolved' THEN 1 ELSE 0 END), 0) AS elec_infra_resolus,
    COALESCE(SUM(CASE WHEN r.service_type = 'electricity' AND r.report_category = 'infrastructure' THEN 1 ELSE 0 END), 0) AS elec_infra_total,
    COALESCE(SUM(CASE WHEN r.service_type = 'electricity' AND r.report_category = 'infrastructure' AND r.status = 'active' AND r.verifications >= 5 THEN 1 ELSE 0 END), 0) AS elec_infra_verified,
    COALESCE(SUM(CASE WHEN r.service_type = 'water' AND r.report_category = 'infrastructure' AND r.status = 'active' THEN 1 ELSE 0 END), 0) AS eau_infra_actifs,
    COALESCE(SUM(CASE WHEN r.service_type = 'water' AND r.report_category = 'infrastructure' AND r.status = 'resolved' THEN 1 ELSE 0 END), 0) AS eau_infra_resolus,
    COALESCE(SUM(CASE WHEN r.service_type = 'water' AND r.report_category = 'infrastructure' THEN 1 ELSE 0 END), 0) AS eau_infra_total,
    COALESCE(SUM(CASE WHEN r.service_type = 'water' AND r.report_category = 'infrastructure' AND r.status = 'active' AND r.verifications >= 5 THEN 1 ELSE 0 END), 0) AS eau_infra_verified,
    COALESCE(SUM(CASE WHEN r.service_type = 'mairie' AND r.report_category = 'infrastructure' AND r.status = 'active' THEN 1 ELSE 0 END), 0) AS mairie_infra_actifs,
    COALESCE(SUM(CASE WHEN r.service_type = 'mairie' AND r.report_category = 'infrastructure' AND r.status = 'resolved' THEN 1 ELSE 0 END), 0) AS mairie_infra_resolus,
    COALESCE(SUM(CASE WHEN r.service_type = 'mairie' AND r.report_category = 'infrastructure' THEN 1 ELSE 0 END), 0) AS mairie_infra_total,
    COALESCE(SUM(CASE WHEN r.service_type = 'mairie' AND r.report_category = 'infrastructure' AND r.status = 'active' AND r.verifications >= 5 THEN 1 ELSE 0 END), 0) AS mairie_infra_verified
  FROM public.communes c
  LEFT JOIN public.reports r ON LOWER(r.commune) = LOWER(c.nom)
  GROUP BY c.nom, c.couleur, c.population
  ORDER BY c.nom;
$$;
