
CREATE OR REPLACE FUNCTION public.get_commune_vulnerable_stats()
RETURNS TABLE(
  commune text,
  couleur text,
  population integer,
  total_signalements bigint,
  total_actifs bigint,
  total_impacted bigint,
  total_babies bigint,
  total_pregnant bigint,
  total_elderly bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    c.nom AS commune,
    c.couleur,
    c.population,
    COUNT(r.id) AS total_signalements,
    COUNT(r.id) FILTER (WHERE r.status = 'active') AS total_actifs,
    COALESCE(SUM(r.impacted_people) FILTER (WHERE r.status = 'active'), 0) AS total_impacted,
    COALESCE(SUM(r.babies) FILTER (WHERE r.status = 'active'), 0) AS total_babies,
    COALESCE(SUM(r.pregnant) FILTER (WHERE r.status = 'active'), 0) AS total_pregnant,
    COALESCE(SUM(r.elderly) FILTER (WHERE r.status = 'active'), 0) AS total_elderly
  FROM communes c
  LEFT JOIN reports r ON LOWER(r.commune) = LOWER(c.nom) AND r.validated = true
  GROUP BY c.nom, c.couleur, c.population
  ORDER BY COALESCE(SUM(r.elderly) FILTER (WHERE r.status = 'active'), 0) + COALESCE(SUM(r.babies) FILTER (WHERE r.status = 'active'), 0) + COALESCE(SUM(r.pregnant) FILTER (WHERE r.status = 'active'), 0) DESC, c.nom;
$$;

CREATE OR REPLACE FUNCTION public.get_quartier_vulnerable_stats(p_commune text)
RETURNS TABLE(
  quartier text,
  total_actifs bigint,
  total_impacted bigint,
  total_babies bigint,
  total_pregnant bigint,
  total_elderly bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    r.quartier,
    COUNT(r.id) FILTER (WHERE r.status = 'active') AS total_actifs,
    COALESCE(SUM(r.impacted_people) FILTER (WHERE r.status = 'active'), 0) AS total_impacted,
    COALESCE(SUM(r.babies) FILTER (WHERE r.status = 'active'), 0) AS total_babies,
    COALESCE(SUM(r.pregnant) FILTER (WHERE r.status = 'active'), 0) AS total_pregnant,
    COALESCE(SUM(r.elderly) FILTER (WHERE r.status = 'active'), 0) AS total_elderly
  FROM reports r
  WHERE LOWER(r.commune) = LOWER(p_commune)
    AND r.validated = true
    AND r.quartier <> ''
  GROUP BY r.quartier
  ORDER BY COALESCE(SUM(r.babies), 0) + COALESCE(SUM(r.pregnant), 0) + COALESCE(SUM(r.elderly), 0) DESC, r.quartier;
$$;
