-- ── Migration : Séparation stricte des Statistiques de Coupures Réseau (Outage) et d'Infrastructures ──────
-- Garantit que la Carte des Coupures (/carte) et le Tableau Communal comptabilisent STRICTEMENT
-- les coupures domestiques (Eau & Électricité dans les foyers) et n'amalgament pas les pannes
-- d'infrastructures publiques (lampadaires, voirie, poteaux) qui sont gérées sur /infrastructures.

-- 1. Mise à jour de get_commune_service_stats
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
    -- Coupures d'électricité domestiques (exclut formellement les lampadaires/infrastructures publiques)
    COALESCE(SUM(CASE WHEN r.service_type = 'electricity' AND (r.report_category = 'outage' OR r.report_category IS NULL) AND r.status = 'active' THEN 1 ELSE 0 END), 0) AS electricite_actifs,
    COALESCE(SUM(CASE WHEN r.service_type = 'electricity' AND (r.report_category = 'outage' OR r.report_category IS NULL) AND r.status = 'resolved' THEN 1 ELSE 0 END), 0) AS electricite_resolus,
    COALESCE(SUM(CASE WHEN r.service_type = 'electricity' AND (r.report_category = 'outage' OR r.report_category IS NULL) THEN 1 ELSE 0 END), 0) AS electricite_total,
    
    -- Coupures d'eau domestiques
    COALESCE(SUM(CASE WHEN r.service_type = 'water' AND (r.report_category = 'outage' OR r.report_category IS NULL) AND r.status = 'active' THEN 1 ELSE 0 END), 0) AS eau_actifs,
    COALESCE(SUM(CASE WHEN r.service_type = 'water' AND (r.report_category = 'outage' OR r.report_category IS NULL) AND r.status = 'resolved' THEN 1 ELSE 0 END), 0) AS eau_resolus,
    COALESCE(SUM(CASE WHEN r.service_type = 'water' AND (r.report_category = 'outage' OR r.report_category IS NULL) THEN 1 ELSE 0 END), 0) AS eau_total,
    
    -- Mairie / Voirie
    COALESCE(SUM(CASE WHEN r.service_type = 'mairie' AND r.status = 'active' THEN 1 ELSE 0 END), 0) AS mairie_actifs,
    COALESCE(SUM(CASE WHEN r.service_type = 'mairie' AND r.status = 'resolved' THEN 1 ELSE 0 END), 0) AS mairie_resolus,
    COALESCE(SUM(CASE WHEN r.service_type = 'mairie' THEN 1 ELSE 0 END), 0) AS mairie_total,

    -- Confirmations citoyennes pour les coupures domestiques
    COALESCE(SUM(CASE WHEN r.service_type = 'electricity' AND (r.report_category = 'outage' OR r.report_category IS NULL) AND r.status = 'active' AND r.verifications >= 5 THEN 1 ELSE 0 END), 0) AS electricite_verified,
    COALESCE(SUM(CASE WHEN r.service_type = 'water' AND (r.report_category = 'outage' OR r.report_category IS NULL) AND r.status = 'active' AND r.verifications >= 5 THEN 1 ELSE 0 END), 0) AS eau_verified,
    COALESCE(SUM(CASE WHEN r.service_type = 'mairie' AND r.status = 'active' AND r.verifications >= 5 THEN 1 ELSE 0 END), 0) AS mairie_verified
  FROM communes c
  LEFT JOIN reports r ON LOWER(r.commune) = LOWER(c.nom) AND r.validated = true
  GROUP BY c.nom, c.couleur, c.population
  ORDER BY c.nom;
$function$;

GRANT EXECUTE ON FUNCTION public.get_commune_service_stats() TO anon, authenticated, service_role;

-- 2. Mise à jour de get_commune_quartier_stats
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
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    COALESCE(r.quartier, 'Non spécifié') AS quartier,
    COALESCE(SUM(CASE WHEN r.service_type = 'electricity' AND (r.report_category = 'outage' OR r.report_category IS NULL) AND r.status = 'active' THEN 1 ELSE 0 END), 0) AS electricite_actifs,
    COALESCE(SUM(CASE WHEN r.service_type = 'electricity' AND (r.report_category = 'outage' OR r.report_category IS NULL) AND r.status = 'resolved' THEN 1 ELSE 0 END), 0) AS electricite_resolus,
    COALESCE(SUM(CASE WHEN r.service_type = 'electricity' AND (r.report_category = 'outage' OR r.report_category IS NULL) THEN 1 ELSE 0 END), 0) AS electricite_total,
    
    COALESCE(SUM(CASE WHEN r.service_type = 'water' AND (r.report_category = 'outage' OR r.report_category IS NULL) AND r.status = 'active' THEN 1 ELSE 0 END), 0) AS eau_actifs,
    COALESCE(SUM(CASE WHEN r.service_type = 'water' AND (r.report_category = 'outage' OR r.report_category IS NULL) AND r.status = 'resolved' THEN 1 ELSE 0 END), 0) AS eau_resolus,
    COALESCE(SUM(CASE WHEN r.service_type = 'water' AND (r.report_category = 'outage' OR r.report_category IS NULL) THEN 1 ELSE 0 END), 0) AS eau_total,

    COALESCE(SUM(CASE WHEN r.service_type = 'mairie' AND r.status = 'active' THEN 1 ELSE 0 END), 0) AS mairie_actifs,
    COALESCE(SUM(CASE WHEN r.service_type = 'mairie' AND r.status = 'resolved' THEN 1 ELSE 0 END), 0) AS mairie_resolus,
    COALESCE(SUM(CASE WHEN r.service_type = 'mairie' THEN 1 ELSE 0 END), 0) AS mairie_total
  FROM reports r
  WHERE LOWER(r.commune) = LOWER(p_commune) AND r.validated = true
  GROUP BY r.quartier
  ORDER BY r.quartier;
$function$;

GRANT EXECUTE ON FUNCTION public.get_commune_quartier_stats(text) TO anon, authenticated, service_role;
