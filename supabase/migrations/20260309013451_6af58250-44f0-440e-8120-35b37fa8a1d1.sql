DROP FUNCTION IF EXISTS public.get_commune_service_stats();
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
    eau_total bigint, 
    mairie_actifs bigint,
    mairie_resolus bigint,
    mairie_total bigint,
    electricite_verified bigint, 
    eau_verified bigint,
    mairie_verified bigint
)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    c.nom AS commune,
    c.couleur,
    c.population,
    COALESCE(SUM(CASE WHEN r.service_type = 'electricity' AND r.status = 'active' THEN 1 ELSE 0 END), 0) AS electricite_actifs,
    COALESCE(SUM(CASE WHEN r.service_type = 'electricity' AND r.status = 'resolved' THEN 1 ELSE 0 END), 0) AS electricite_resolus,
    COALESCE(SUM(CASE WHEN r.service_type = 'electricity' THEN 1 ELSE 0 END), 0) AS electricite_total,
    
    COALESCE(SUM(CASE WHEN r.service_type = 'water' AND r.status = 'active' THEN 1 ELSE 0 END), 0) AS eau_actifs,
    COALESCE(SUM(CASE WHEN r.service_type = 'water' AND r.status = 'resolved' THEN 1 ELSE 0 END), 0) AS eau_resolus,
    COALESCE(SUM(CASE WHEN r.service_type = 'water' THEN 1 ELSE 0 END), 0) AS eau_total,
    
    COALESCE(SUM(CASE WHEN r.service_type = 'mairie' AND r.status = 'active' THEN 1 ELSE 0 END), 0) AS mairie_actifs,
    COALESCE(SUM(CASE WHEN r.service_type = 'mairie' AND r.status = 'resolved' THEN 1 ELSE 0 END), 0) AS mairie_resolus,
    COALESCE(SUM(CASE WHEN r.service_type = 'mairie' THEN 1 ELSE 0 END), 0) AS mairie_total,

    COALESCE(SUM(CASE WHEN r.service_type = 'electricity' AND r.status = 'active' AND r.verifications >= 5 THEN 1 ELSE 0 END), 0) AS electricite_verified,
    COALESCE(SUM(CASE WHEN r.service_type = 'water' AND r.status = 'active' AND r.verifications >= 5 THEN 1 ELSE 0 END), 0) AS eau_verified,
    COALESCE(SUM(CASE WHEN r.service_type = 'mairie' AND r.status = 'active' AND r.verifications >= 5 THEN 1 ELSE 0 END), 0) AS mairie_verified
  FROM communes c
  LEFT JOIN reports r ON r.commune = c.nom AND r.validated = true
  GROUP BY c.nom, c.couleur, c.population
  ORDER BY c.nom;
$function$;

DROP FUNCTION IF EXISTS public.get_commune_quartier_stats(text);
CREATE OR REPLACE FUNCTION public.get_commune_quartier_stats(p_commune text)
 RETURNS TABLE(
    quartier text, 
    electricite_actifs bigint, 
    electricite_resolus bigint, 
    electricite_total bigint, 
    eau_actifs bigint, 
    eau_resolus bigint, 
    eau_total bigint,
    mairie_actifs bigint,
    mairie_resolus bigint,
    mairie_total bigint
)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_commune IS NULL OR LENGTH(p_commune) < 1 OR LENGTH(p_commune) > 100 THEN
    RAISE EXCEPTION 'Invalid commune name';
  END IF;

  RETURN QUERY
  SELECT
    r.quartier,
    COUNT(*) FILTER (WHERE r.service_type = 'electricity' AND r.status = 'active') AS electricite_actifs,
    COUNT(*) FILTER (WHERE r.service_type = 'electricity' AND r.status = 'resolved') AS electricite_resolus,
    COUNT(*) FILTER (WHERE r.service_type = 'electricity') AS electricite_total,
    
    COUNT(*) FILTER (WHERE r.service_type = 'water' AND r.status = 'active') AS eau_actifs,
    COUNT(*) FILTER (WHERE r.service_type = 'water' AND r.status = 'resolved') AS eau_resolus,
    COUNT(*) FILTER (WHERE r.service_type = 'water') AS eau_total,
    
    COUNT(*) FILTER (WHERE r.service_type = 'mairie' AND r.status = 'active') AS mairie_actifs,
    COUNT(*) FILTER (WHERE r.service_type = 'mairie' AND r.status = 'resolved') AS mairie_resolus,
    COUNT(*) FILTER (WHERE r.service_type = 'mairie') AS mairie_total
  FROM reports r
  WHERE LOWER(r.commune) = LOWER(p_commune)
    AND r.validated = true
    AND r.quartier <> ''
  GROUP BY r.quartier
  ORDER BY (COUNT(*) FILTER (WHERE r.status = 'active')) DESC, r.quartier;
END;
$function$;