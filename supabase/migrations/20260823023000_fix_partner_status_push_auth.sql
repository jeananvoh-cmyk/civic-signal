CREATE OR REPLACE FUNCTION public.partner_update_report_status(p_report_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_report public.reports%ROWTYPE;
  v_partner public.partner_profiles%ROWTYPE;
  v_title text;
  v_message text;
  v_service_role_jwt text;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid,'partner') THEN
    RAISE EXCEPTION 'Accès refusé : rôle partenaire requis';
  END IF;
  IF p_status NOT IN ('processing','resolved','active') THEN
    RAISE EXCEPTION 'Statut invalide';
  END IF;
  SELECT * INTO v_report FROM public.reports WHERE id=p_report_id AND validated=true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Signalement introuvable ou non validé'; END IF;
  SELECT * INTO v_partner FROM public.partner_profiles WHERE user_id=v_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profil partenaire introuvable'; END IF;
  IF NOT ((v_partner.partner_type='cie' AND v_report.service_type IN ('electricity','streetlighting','electricity_quality')) OR (v_partner.partner_type='sodeci' AND v_report.service_type IN ('water','water_quality')) OR (v_partner.partner_type='mairie' AND v_report.report_category='infrastructure' AND lower(v_partner.commune)=lower(v_report.commune))) THEN
    RAISE EXCEPTION 'Ce signalement ne relève pas de votre périmètre';
  END IF;
  IF p_status='processing' AND v_report.status NOT IN ('active','processing') THEN RAISE EXCEPTION 'Transition de statut invalide'; END IF;
  IF p_status='resolved' AND v_report.status NOT IN ('processing','active') THEN RAISE EXCEPTION 'Transition de statut invalide'; END IF;
  IF p_status='active' AND v_report.status NOT IN ('processing','resolved') THEN RAISE EXCEPTION 'Transition de statut invalide'; END IF;

  UPDATE public.reports
  SET status=p_status,
      resolved_at=CASE WHEN p_status='resolved' THEN now() WHEN p_status='active' THEN NULL ELSE resolved_at END,
      updated_at=now()
  WHERE id=p_report_id;

  v_title:=CASE p_status WHEN 'processing' THEN '🛠️ Prise en charge en cours' WHEN 'resolved' THEN '✅ Problème résolu' ELSE '🔄 Statut mis à jour' END;
  v_message:=v_partner.organization_name||' a mis à jour votre signalement à '||v_report.commune||' ('||v_report.quartier||').';
  INSERT INTO public.notifications(user_id,report_id,title,message) VALUES(v_report.user_id,p_report_id,v_title,v_message);

  SELECT decrypted_secret INTO v_service_role_jwt
  FROM vault.decrypted_secrets
  WHERE name='civic_signal_service_role_jwt'
  LIMIT 1;

  IF v_service_role_jwt IS NOT NULL AND v_service_role_jwt <> '' THEN
    PERFORM net.http_post(
      url := 'https://uycoawpbchgznkdbznfc.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_service_role_jwt),
      body := jsonb_build_object('action','send-to-user','user_id',v_report.user_id,'title',v_title,'message',v_message,'url','/historique','report_id',p_report_id)
    );
  END IF;
END;
$$;