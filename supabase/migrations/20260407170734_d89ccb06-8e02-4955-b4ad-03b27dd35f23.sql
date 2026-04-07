-- Drop old function (returns void)
DROP FUNCTION IF EXISTS public.support_infra_report(uuid);

-- Recreate as toggle returning json
CREATE OR REPLACE FUNCTION public.support_infra_report(p_report_id uuid)
RETURNS json
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
  v_already   boolean;
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

  v_already := EXISTS (
    SELECT 1 FROM public.corroborations
    WHERE report_id = p_report_id AND user_id = v_caller_id
  );

  IF v_already THEN
    -- Remove vote
    DELETE FROM public.corroborations
    WHERE report_id = p_report_id AND user_id = v_caller_id;

    UPDATE public.reports
    SET support_count = GREATEST(support_count - 1, 0),
        verifications = GREATEST(verifications - 1, 0)
    WHERE id = p_report_id
    RETURNING support_count INTO v_new_count;

    RETURN json_build_object('voted', false, 'support_count', v_new_count);
  ELSE
    -- Add vote
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

    RETURN json_build_object('voted', true, 'support_count', v_new_count);
  END IF;
END;
$$;