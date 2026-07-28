-- ============================================================
-- RPC ADMIN : Relayer un signalement vers l'opérateur & décrémenter les escalades
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_relay_report(
  p_report_id uuid,
  p_operator  text DEFAULT NULL,
  p_email     text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_report    record;
  v_op        text;
  v_email     text;
  v_count     integer := 0;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié.';
  END IF;

  -- 1. Récupérer le signalement
  SELECT * INTO v_report FROM public.reports WHERE id = p_report_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Signalement introuvable.';
  END IF;

  -- 2. Déterminer l'opérateur principal si non fourni
  IF p_operator IS NOT NULL AND p_operator != '' THEN
    v_op := p_operator;
  ELSE
    IF v_report.service_type = 'electricity' THEN v_op := 'CIE';
    ELSIF v_report.service_type = 'water' THEN v_op := 'SODECI';
    ELSIF v_report.service_type IN ('streetlighting', 'electricity_quality') THEN v_op := 'ANARE';
    ELSIF v_report.service_type = 'water_quality' THEN v_op := 'ONEP';
    ELSE v_op := 'MAIRIE';
    END IF;
  END IF;

  -- 3. Déterminer l'email si non fourni
  IF p_email IS NOT NULL AND p_email != '' THEN
    v_email := p_email;
  ELSE
    IF v_op = 'CIE' THEN v_email := 'reclamation@cie.ci';
    ELSIF v_op = 'SODECI' THEN v_email := 'reclamation@sodeci.ci';
    ELSIF v_op = 'ANARE' THEN v_email := 'reclamation@anare.ci';
    ELSIF v_op = 'ONEP' THEN v_email := 'reclamation@onep.ci';
    ELSE v_email := 'mairie:' || v_report.commune;
    END IF;
  END IF;

  -- 4. Insérer / Mettre à jour dans relay_logs
  INSERT INTO public.relay_logs (report_id, operator, email_to, status, created_at)
  VALUES (p_report_id, v_op, v_email, 'pending', now())
  ON CONFLICT (report_id, operator) DO UPDATE 
    SET status = 'pending', email_to = EXCLUDED.email_to, error_message = NULL;

  -- Double routage : Éclairage public / Qualité courant -> Ajouter aussi CIE
  IF v_report.service_type IN ('streetlighting', 'electricity_quality') AND v_op = 'ANARE' THEN
    INSERT INTO public.relay_logs (report_id, operator, email_to, status, created_at)
    VALUES (p_report_id, 'CIE', 'reclamation@cie.ci', 'pending', now())
    ON CONFLICT (report_id, operator) DO UPDATE 
      SET status = 'pending', email_to = 'reclamation@cie.ci', error_message = NULL;
  END IF;

  -- Double routage : Qualité eau -> Ajouter aussi SODECI
  IF v_report.service_type = 'water_quality' AND v_op = 'ONEP' THEN
    INSERT INTO public.relay_logs (report_id, operator, email_to, status, created_at)
    VALUES (p_report_id, 'SODECI', 'reclamation@sodeci.ci', 'pending', now())
    ON CONFLICT (report_id, operator) DO UPDATE 
      SET status = 'pending', email_to = 'reclamation@sodeci.ci', error_message = NULL;
  END IF;

  -- 5. Marquer le signalement comme "transmis"
  UPDATE public.reports
  SET forwarded_to_operator_at = now(),
      updated_at = now()
  WHERE id = p_report_id;

  -- 6. Marquer toutes les notifications d'escalade correspondantes comme lues pour décrémenter le compteur
  WITH updated_notifs AS (
    UPDATE public.notifications
    SET read = true
    WHERE (report_id = p_report_id OR message LIKE '%' || p_report_id::text || '%')
      AND read = false
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM updated_notifs;

  RETURN json_build_object('success', true, 'operator', v_op, 'notifications_read', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_relay_report TO authenticated;
