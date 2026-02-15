
CREATE OR REPLACE FUNCTION public.corroborate_report(p_report_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_id uuid;
  v_service_type text;
  v_commune text;
  v_quartier text;
  v_new_count integer;
  v_service_label text;
  v_caller_id uuid;
BEGIN
  v_caller_id := auth.uid();
  
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié.';
  END IF;

  -- Check: active, validated, not own report
  IF NOT EXISTS (
    SELECT 1 FROM public.reports
    WHERE id = p_report_id AND status = 'active' AND validated = true AND user_id != v_caller_id
  ) THEN
    RAISE EXCEPTION 'Impossible de confirmer ce signalement.';
  END IF;

  -- Check: not already corroborated by this user
  IF EXISTS (
    SELECT 1 FROM public.corroborations
    WHERE report_id = p_report_id AND user_id = v_caller_id
  ) THEN
    RAISE EXCEPTION 'Vous avez déjà confirmé ce signalement.';
  END IF;

  -- Get report info
  SELECT user_id, service_type, commune, quartier, verifications + 1
  INTO v_author_id, v_service_type, v_commune, v_quartier, v_new_count
  FROM public.reports
  WHERE id = p_report_id;

  -- Record corroboration
  INSERT INTO public.corroborations (report_id, user_id) VALUES (p_report_id, v_caller_id);

  -- Increment counter
  UPDATE public.reports
  SET verifications = v_new_count
  WHERE id = p_report_id;

  -- Build service label
  IF v_service_type = 'electricity' THEN
    v_service_label := '⚡ Électricité';
  ELSE
    v_service_label := '💧 Eau';
  END IF;

  -- Notify the report author
  INSERT INTO public.notifications (user_id, report_id, title, message)
  VALUES (
    v_author_id,
    p_report_id,
    'Un voisin confirme votre signalement',
    v_service_label || ' — ' || v_commune || ', ' || v_quartier || ' • ' || v_new_count || ' confirmation(s)'
  );

  -- Threshold: after 3 confirmations, auto-escalate to critical urgency
  IF v_new_count >= 3 THEN
    UPDATE public.reports
    SET urgency = 'critical'
    WHERE id = p_report_id AND urgency != 'critical';
  END IF;
END;
$$;
