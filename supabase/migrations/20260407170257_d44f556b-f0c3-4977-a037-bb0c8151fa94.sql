CREATE OR REPLACE FUNCTION public.support_infra_report(p_report_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_id uuid;
  v_commune   text;
  v_quartier  text;
  v_new_count integer;
  v_caller_id uuid;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.reports
    WHERE id = p_report_id
      AND status = 'active'
      AND report_category = 'infrastructure'
      AND user_id != v_caller_id
  ) THEN
    RAISE EXCEPTION 'Signalement introuvable ou déjà le vôtre.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.corroborations
    WHERE report_id = p_report_id AND user_id = v_caller_id
  ) THEN
    RAISE EXCEPTION 'Vous avez déjà soutenu ce signalement.';
  END IF;

  INSERT INTO public.corroborations (report_id, user_id) VALUES (p_report_id, v_caller_id);

  UPDATE public.reports
  SET support_count = support_count + 1,
      verifications = verifications + 1
  WHERE id = p_report_id
  RETURNING support_count, user_id, commune, quartier
  INTO v_new_count, v_author_id, v_commune, v_quartier;

  INSERT INTO public.notifications (user_id, report_id, title, message)
  VALUES (
    v_author_id, p_report_id,
    'Un citoyen soutient votre signalement',
    '🏗️ ' || v_commune || ', ' || v_quartier || ' — ' || v_new_count ||
    ' citoyen' || CASE WHEN v_new_count > 1 THEN 's soutiennent' ELSE ' soutient' END ||
    ' votre signalement.'
  );
END;
$$;