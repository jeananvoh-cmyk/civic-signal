
DROP FUNCTION IF EXISTS public.get_commune_duration_stats();

CREATE OR REPLACE FUNCTION public.get_commune_duration_stats()
 RETURNS TABLE(commune text, couleur text, avg_duration_minutes double precision, total_resolved bigint, total_active bigint, longest_duration_minutes double precision, service_type text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    c.nom AS commune,
    c.couleur,
    COALESCE(
      AVG(EXTRACT(EPOCH FROM (r.resolved_at - r.start_time)) / 60) 
      FILTER (WHERE r.status = 'resolved' AND r.resolved_at IS NOT NULL),
      0
    ) AS avg_duration_minutes,
    COUNT(r.id) FILTER (WHERE r.status = 'resolved') AS total_resolved,
    COUNT(r.id) FILTER (WHERE r.status = 'active') AS total_active,
    COALESCE(
      MAX(EXTRACT(EPOCH FROM (r.resolved_at - r.start_time)) / 60) 
      FILTER (WHERE r.status = 'resolved' AND r.resolved_at IS NOT NULL),
      0
    ) AS longest_duration_minutes,
    st.service_type
  FROM communes c
  CROSS JOIN (VALUES ('electricity'), ('water')) AS st(service_type)
  LEFT JOIN reports r 
    ON LOWER(r.commune) = LOWER(c.nom) 
    AND r.validated = true
    AND r.service_type = st.service_type
  GROUP BY c.nom, c.couleur, st.service_type
  ORDER BY avg_duration_minutes DESC;
$function$;
