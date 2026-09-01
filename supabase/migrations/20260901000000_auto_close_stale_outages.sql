-- Migration: Auto-clôture automatique des coupures obsolètes (>7 jours) et nettoyage de la confidentialité PADA
-- Date: 2026-09-01

-- 1. Fonction RPC sécurisée d'auto-clôture des coupures d'électricité et d'eau inactives
CREATE OR REPLACE FUNCTION public.auto_close_stale_outage_reports(p_days integer DEFAULT 7)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Clôture les coupures actives qui dépassent p_days jours sans confirmation
  UPDATE public.reports
  SET status = 'resolved',
      resolved_at = NOW(),
      updated_at = NOW(),
      operator_last_note = COALESCE(operator_last_note, 'Clôture automatique : Signalement de coupure présumé résolu après ' || p_days || ' jours sans confirmation.')
  WHERE report_category = 'outage'
    AND status = 'active'
    AND created_at < (NOW() - (p_days || ' days')::interval);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.auto_close_stale_outage_reports(integer) IS 'Clôture automatiquement les coupures (eau/électricité) actives de plus de N jours sans activité.';

-- 2. Nettoyer les adresses PADA privées incrustées dans les descriptions des coupures existantes
UPDATE public.reports
SET description = REGEXP_REPLACE(description, '\s*\[PADA\s*:[^\]]*\]', '', 'gi')
WHERE report_category = 'outage'
  AND description ~* '\[PADA\s*:';

-- 3. Exécuter l'auto-clôture immédiatement pour nettoyer les coupures obsolètes existantes
SELECT public.auto_close_stale_outage_reports(7);

-- 4. Programmer le cron quotidien si pg_cron est disponible
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-close-stale-outages-daily') THEN
      PERFORM cron.unschedule('auto-close-stale-outages-daily');
    END IF;
    PERFORM cron.schedule(
      'auto-close-stale-outages-daily',
      '0 2 * * *', -- Tous les jours à 02h00 UTC
      'SELECT public.auto_close_stale_outage_reports(7);'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END;
$$;
