-- ── Migration : Rétablissement de l'état réel 'active' des signalements d'infrastructure ──────
-- Corrige l'auto-résolution abusive des pannes de voirie et lampadaires qui avaient été
-- résolues par erreur par le cron de coupures domestiques (outage).

-- 1. Réactiver les pannes d'infrastructure qui n'ont pas été explicitement confirmées réparées par les citoyens ou clôturées par un opérateur
UPDATE public.reports
SET status = 'active',
    resolved_at = NULL,
    updated_at = now()
WHERE report_category = 'infrastructure'
  AND status = 'resolved'
  AND (repair_verifications IS NULL OR repair_verifications < 3)
  AND (operator_last_note IS NULL OR operator_last_note = '');

-- 2. Verrouiller la fonction auto_resolve_stale_outages pour qu'elle n'affecte JAMAIS les infrastructures
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

  -- Mettre à jour STRICTEMENT les coupures domestiques (report_category = 'outage')
  WITH updated_rows AS (
    UPDATE public.reports
    SET status = 'resolved',
        resolved_at = now(),
        updated_at = now()
    WHERE status = 'active'
      AND validated = true
      AND (report_category = 'outage' OR report_category IS NULL)
      AND service_type IN ('electricity', 'water')
      AND (
        description NOT ILIKE '%lampadaire%'
        AND description NOT ILIKE '%éclairage%'
        AND description NOT ILIKE '%eclairage%'
        AND description NOT ILIKE '%poteau%'
        AND description NOT ILIKE '%caniveau%'
        AND description NOT ILIKE '%nid de poule%'
        AND description NOT ILIKE '%chaussée%'
        AND description NOT ILIKE '%voirie%'
        AND description NOT ILIKE '%égout%'
        AND description NOT ILIKE '%egout%'
        AND description NOT ILIKE '%fuite%'
      )
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
