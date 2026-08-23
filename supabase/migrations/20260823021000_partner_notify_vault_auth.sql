CREATE OR REPLACE FUNCTION public.trigger_notify_partners()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_service_role_jwt text;
BEGIN
  IF NEW.validated = true AND (OLD.validated IS NULL OR OLD.validated = false) THEN
    SELECT decrypted_secret INTO v_service_role_jwt
    FROM vault.decrypted_secrets
    WHERE name = 'civic_signal_service_role_jwt'
    LIMIT 1;

    IF v_service_role_jwt IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://uycoawpbchgznkdbznfc.supabase.co/functions/v1/notify-partner',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_role_jwt
        ),
        body := jsonb_build_object('report_id', NEW.id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
