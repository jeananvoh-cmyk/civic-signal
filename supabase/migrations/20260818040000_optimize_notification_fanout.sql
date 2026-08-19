-- ==============================================================================
-- SIGNA-CI : OPTIMISATION DES NOTIFICATIONS EN FAN-OUT (CORRECTION RISQUE CRITIQUE 1)
-- Remplacement de la boucle PL/pgSQL FOREACH par un INSERT INTO ... SELECT vectorisé.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.notify_report_stakeholders(
  p_report_id UUID,
  p_title TEXT,
  p_message TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- 1. Insérer en un seul ordre SQL vectorisé les notifications pour tous les intervenants uniques
  -- (auteur initial, corroborateurs de coupure, et soutiens d'infrastructure)
  WITH stakeholders AS (
    SELECT DISTINCT user_id FROM (
      SELECT user_id FROM public.reports WHERE id = p_report_id AND user_id IS NOT NULL
      UNION
      SELECT user_id FROM public.corroborations WHERE report_id = p_report_id AND user_id IS NOT NULL
      UNION
      SELECT user_id FROM public.report_support_votes WHERE report_id = p_report_id AND user_id IS NOT NULL
    ) sub
  ),
  inserted AS (
    INSERT INTO public.notifications (user_id, report_id, title, message)
    SELECT user_id, p_report_id, p_title, p_message
    FROM stakeholders
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM inserted;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_report_stakeholders TO authenticated, service_role;
