-- RPC : durées des coupures ACTIVES par commune + service
-- Retourne la coupure active la plus ancienne par (commune, service_type)
-- Utilisé dans la carte pour afficher "en cours depuis Xh" + badges d'alerte

CREATE OR REPLACE FUNCTION public.get_commune_active_durations()
RETURNS TABLE (
  commune          text,
  service_type     text,
  oldest_start     timestamptz,   -- start_time ou created_at de la coupure la plus ancienne
  longest_hours    numeric,       -- durée en heures arrondie à 1 décimale
  active_count     bigint         -- nb de coupures actives dans la commune+service
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.commune,
    r.service_type,
    MIN(COALESCE(r.start_time, r.created_at))                                         AS oldest_start,
    ROUND(
      EXTRACT(EPOCH FROM (now() - MIN(COALESCE(r.start_time, r.created_at)))) / 3600,
      1
    )                                                                                  AS longest_hours,
    COUNT(r.id)                                                                        AS active_count
  FROM public.reports r
  WHERE r.status         = 'active'
    AND r.report_category = 'outage'
    AND r.commune        IS NOT NULL
  GROUP BY r.commune, r.service_type;
$$;

GRANT EXECUTE ON FUNCTION public.get_commune_active_durations() TO anon, authenticated;
