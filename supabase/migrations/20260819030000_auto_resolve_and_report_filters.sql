-- ── Migration : Auto-clôture des coupures obsolètes et fonctions de filtrage ──────
-- Permet de clôturer automatiquement les coupures d'électricité et d'eau non réactivées (>48h)
-- afin de ne pas fausser les métriques publiques et le tableau de bord d'Abidjan.

CREATE OR REPLACE FUNCTION public.auto_resolve_stale_outages(p_hours integer DEFAULT 48)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_resolved_count integer := 0;
  v_cutoff timestamptz;
BEGIN
  v_caller_id := auth.uid();
  
  -- Autoriser les admins, modérateurs ou l'exécution planifiée (sans caller_id direct)
  IF v_caller_id IS NOT NULL AND NOT (has_role(v_caller_id, 'admin'::app_role) OR has_role(v_caller_id, 'moderator'::app_role)) THEN
    RAISE EXCEPTION 'Accès refusé.';
  END IF;

  v_cutoff := now() - (p_hours || ' hours')::interval;

  -- Mettre à jour les coupures d'électricité et d'eau créées avant le cutoff
  WITH updated_rows AS (
    UPDATE public.reports
    SET status = 'resolved',
        resolved_at = now(),
        updated_at = now()
    WHERE status = 'active'
      AND validated = true
      AND (
        report_category = 'outage'
        OR service_type IN ('electricity', 'water')
      )
      AND (report_category IS NULL OR report_category <> 'infrastructure')
      AND created_at < v_cutoff
    RETURNING id
  )
  SELECT COUNT(*)::integer INTO v_resolved_count FROM updated_rows;

  -- Nettoyer les anciennes notifications liées
  DELETE FROM public.notifications
  WHERE report_id IN (
    SELECT id FROM public.reports
    WHERE status = 'resolved'
      AND resolved_at >= now() - interval '5 minutes'
  )
  AND title = 'Coupure signalée dans votre quartier';

  RETURN v_resolved_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_resolve_stale_outages(integer) TO authenticated, service_role, anon;

-- Index pour optimiser les requêtes de statut et de service sur reports
CREATE INDEX IF NOT EXISTS idx_reports_service_status_validated
ON public.reports (service_type, status, validated, created_at);

CREATE INDEX IF NOT EXISTS idx_reports_category_status_validated
ON public.reports (report_category, status, validated, created_at);
