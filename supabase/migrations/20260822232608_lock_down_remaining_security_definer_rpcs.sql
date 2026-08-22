BEGIN;
REVOKE EXECUTE ON FUNCTION public.admin_resolve_report(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.auto_resolve_stale_outages(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.broadcast_admin_message(text,text,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_repair(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.corroborate_report(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.partner_update_report_status(uuid,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_report(uuid,timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.support_infra_report(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_report_description(uuid,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.vote_infrastructure_support(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.register_photo_hash(text,uuid) FROM anon;
CREATE OR REPLACE FUNCTION public.auto_resolve_stale_outages(p_hours integer DEFAULT 48) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_caller_id uuid:=auth.uid(); v_jwt_role text:=COALESCE(auth.jwt()->>'role',''); v_resolved_count integer:=0; v_cutoff timestamptz;
BEGIN
 IF v_jwt_role='service_role' THEN NULL; ELSIF v_caller_id IS NOT NULL AND (has_role(v_caller_id,'admin'::app_role) OR has_role(v_caller_id,'moderator'::app_role)) THEN NULL; ELSE RAISE EXCEPTION 'Accès refusé.'; END IF;
 IF p_hours<1 OR p_hours>720 THEN RAISE EXCEPTION 'Fenêtre invalide.'; END IF;
 v_cutoff:=now()-(p_hours||' hours')::interval;
 WITH updated_rows AS (UPDATE public.reports SET status='resolved',resolved_at=now(),updated_at=now() WHERE status='active' AND validated=true AND (report_category='outage' OR report_category IS NULL) AND service_type IN ('electricity','water') AND description NOT ILIKE '%lampadaire%' AND description NOT ILIKE '%éclairage%' AND description NOT ILIKE '%eclairage%' AND description NOT ILIKE '%poteau%' AND description NOT ILIKE '%caniveau%' AND description NOT ILIKE '%nid de poule%' AND description NOT ILIKE '%chaussée%' AND description NOT ILIKE '%voirie%' AND description NOT ILIKE '%égout%' AND description NOT ILIKE '%egout%' AND description NOT ILIKE '%fuite%' AND created_at<v_cutoff RETURNING id) SELECT count(*)::integer INTO v_resolved_count FROM updated_rows;
 DELETE FROM public.notifications WHERE report_id IN (SELECT id FROM public.reports WHERE status='resolved' AND resolved_at>=now()-interval '5 minutes') AND title='Coupure signalée dans votre quartier';
 RETURN v_resolved_count;
END; $$;
CREATE OR REPLACE FUNCTION public.register_photo_hash(p_hash text,p_report_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_caller_id uuid:=auth.uid(); v_existing_report_id uuid;
BEGIN
 IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Non authentifié.'; END IF;
 IF p_hash IS NULL OR length(trim(p_hash))<16 THEN RETURN jsonb_build_object('success',false,'error','Hash invalide'); END IF;
 IF NOT EXISTS (SELECT 1 FROM public.reports r WHERE r.id=p_report_id AND r.user_id=v_caller_id) THEN RAISE EXCEPTION 'Accès refusé.'; END IF;
 SELECT report_id INTO v_existing_report_id FROM public.photo_fingerprints WHERE hash=p_hash AND report_id<>p_report_id LIMIT 1;
 IF v_existing_report_id IS NOT NULL THEN RETURN jsonb_build_object('success',true,'duplicate',true); END IF;
 INSERT INTO public.photo_fingerprints(hash,report_id,user_id) VALUES(p_hash,p_report_id,v_caller_id) ON CONFLICT DO NOTHING;
 RETURN jsonb_build_object('success',true,'duplicate',false);
END; $$;
COMMIT;
