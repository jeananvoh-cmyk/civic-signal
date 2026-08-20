-- ── Migration : Contestation citoyenne & Réouverture des pannes d'infrastructure non résolues ──────
-- Permet à un riverain de contester une fausse résolution et de réactiver immédiatement le signalement.

CREATE OR REPLACE FUNCTION public.reopen_infrastructure_report(
  p_report_id uuid,
  p_reason text DEFAULT 'Signalé toujours en panne par un riverain'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_report public.reports%ROWTYPE;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Connectez-vous pour signaler que le problème persiste.';
  END IF;

  SELECT * INTO v_report FROM public.reports WHERE id = p_report_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Signalement introuvable.';
  END IF;

  -- Remettre le signalement en statut actif
  UPDATE public.reports
  SET status = 'active',
      resolved_at = NULL,
      repair_verifications = 0,
      updated_at = now()
  WHERE id = p_report_id;

  -- Enregistrer l'événement officiel dans l'historique
  INSERT INTO public.report_status_history (
    report_id,
    ticket_code,
    old_status,
    new_status,
    operator_name,
    public_note,
    created_by,
    created_at
  )
  VALUES (
    p_report_id,
    v_report.ticket_code,
    v_report.status,
    'reopened',
    'Vigie Citoyenne',
    COALESCE(NULLIF(TRIM(p_reason), ''), 'Problème toujours constaté sur le terrain par un riverain.'),
    v_caller_id,
    now()
  );

  -- Notifier les parties prenantes de la réouverture
  PERFORM public.notify_report_stakeholders(
    p_report_id,
    'Signalement réouvert',
    'Un riverain a signalé que ce problème est toujours présent sur le terrain.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reopen_infrastructure_report(uuid, text) TO authenticated;
