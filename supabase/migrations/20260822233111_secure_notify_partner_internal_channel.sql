BEGIN;
INSERT INTO public.relay_config(key,value,label,updated_at,updated_by)
VALUES ('notify_partner_internal_key','T4MiC1NgkX5GIktcoAfHbxW1vg-nd7T6T5l4-w6fc2M','Internal key for the report validation partner-notification webhook',now(),NULL)
ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value,label=EXCLUDED.label,updated_at=now();
CREATE OR REPLACE FUNCTION public.trigger_notify_partners() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_internal_key text;
BEGIN
 IF NEW.validated=true AND (OLD.validated IS NULL OR OLD.validated=false) THEN
  SELECT value INTO v_internal_key FROM public.relay_config WHERE key='notify_partner_internal_key' LIMIT 1;
  IF v_internal_key IS NOT NULL THEN
   PERFORM net.http_post(url:='https://uycoawpbchgznkdbznfc.supabase.co/functions/v1/notify-partner',headers:=jsonb_build_object('Content-Type','application/json','x-internal-key',v_internal_key),body:=jsonb_build_object('report_id',NEW.id));
  END IF;
 END IF;
 RETURN NEW;
END; $$;
COMMIT;
