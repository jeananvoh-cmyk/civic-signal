-- 1. Activation page transparence (désactivée par défaut, admin choisit)
INSERT INTO public.site_settings (key, value, description)
VALUES ('transparency_enabled', 'false'::jsonb, 'Affiche la page publique de transparence /transparence')
ON CONFLICT (key) DO NOTHING;

-- 2. RPC publique de statistiques de transparence
CREATE OR REPLACE FUNCTION get_transparency_stats()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT jsonb_build_object(
    -- Totaux globaux
    'total_reports',    (SELECT COUNT(*) FROM reports),
    'total_resolved',   (SELECT COUNT(*) FROM reports WHERE status = 'resolved'),
    'total_users',      (SELECT COUNT(*) FROM profiles),

    -- Taux de résolution global
    'resolution_rate', CASE
      WHEN (SELECT COUNT(*) FROM reports) = 0 THEN 0
      ELSE ROUND(
        100.0 * (SELECT COUNT(*) FROM reports WHERE status = 'resolved')
               / (SELECT COUNT(*) FROM reports), 1
      )
    END,

    -- Délai moyen de résolution (heures), par service
    'avg_resolution_hours', (
      SELECT jsonb_object_agg(service_type, avg_h) FROM (
        SELECT service_type,
               ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)::numeric, 1) AS avg_h
        FROM reports
        WHERE status = 'resolved' AND resolved_at IS NOT NULL
        GROUP BY service_type
      ) t
    ),

    -- Taux de résolution par commune
    'by_commune', (
      SELECT jsonb_agg(row ORDER BY row->>'total' DESC) FROM (
        SELECT jsonb_build_object(
          'commune',       commune,
          'total',         COUNT(*),
          'resolved',      COUNT(*) FILTER (WHERE status = 'resolved'),
          'resolution_rate', CASE WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'resolved') / COUNT(*), 1)
          END
        ) AS row
        FROM reports
        GROUP BY commune
      ) t
    ),

    -- Activité par mois (12 derniers mois)
    'monthly', (
      SELECT jsonb_agg(row ORDER BY row->>'month') FROM (
        SELECT jsonb_build_object(
          'month',    TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM'),
          'total',    COUNT(*),
          'resolved', COUNT(*) FILTER (WHERE status = 'resolved')
        ) AS row
        FROM reports
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
      ) t
    ),

    -- Top 5 communes les plus touchées (actifs)
    'top_communes', (
      SELECT jsonb_agg(row) FROM (
        SELECT jsonb_build_object(
          'commune', commune,
          'actifs',  COUNT(*) FILTER (WHERE status = 'active'),
          'total',   COUNT(*)
        ) AS row
        FROM reports
        GROUP BY commune
        ORDER BY COUNT(*) FILTER (WHERE status = 'active') DESC
        LIMIT 5
      ) t
    )
  );
$$;

GRANT EXECUTE ON FUNCTION get_transparency_stats() TO anon, authenticated;
