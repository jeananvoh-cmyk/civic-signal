
-- Function to send push notifications via pg_net → Edge Function
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_url text;
  v_anon_key text;
  v_payload jsonb;
  v_service_label text;
BEGIN
  v_url := 'https://uycoawpbchgznkdbznfc.supabase.co/functions/v1/send-push';
  v_anon_key := current_setting('app.settings.supabase_anon_key', true);
  
  -- Use hardcoded anon key since app.settings may not be available
  IF v_anon_key IS NULL OR v_anon_key = '' THEN
    v_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5Y29hd3BiY2hnem5rZGJ6bmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NTAwNzEsImV4cCI6MjA4NjQyNjA3MX0.p7ZW9SNDM7aQ98IyeHTc6ayn0DuFMDUmY89n0nfL3yk';
  END IF;

  -- Build service label
  IF TG_ARGV[0] = 'new_report' THEN
    IF NEW.service_type = 'electricity' THEN v_service_label := '⚡ Électricité';
    ELSIF NEW.service_type = 'water' THEN v_service_label := '💧 Eau';
    ELSE v_service_label := '🏛️ Mairie';
    END IF;

    v_payload := jsonb_build_object(
      'action', 'send',
      'commune', NEW.commune,
      'quartier', NEW.quartier,
      'service_type', NEW.service_type,
      'event_type', 'outage',
      'title', 'Coupure signalée — ' || NEW.commune,
      'message', v_service_label || ' dans votre quartier ' || NEW.quartier || '. Confirmez si vous êtes aussi touché(e).',
      'url', '/carte',
      'exclude_user_ids', jsonb_build_array(NEW.user_id)
    );

  ELSIF TG_ARGV[0] = 'confirmed' THEN
    -- Called when verifications reaches 3
    IF NEW.verifications >= 3 AND OLD.verifications < 3 THEN
      IF NEW.service_type = 'electricity' THEN v_service_label := '⚡ Électricité';
      ELSIF NEW.service_type = 'water' THEN v_service_label := '💧 Eau';
      ELSE v_service_label := '🏛️ Mairie';
      END IF;

      v_payload := jsonb_build_object(
        'action', 'send',
        'commune', NEW.commune,
        'quartier', '',
        'service_type', NEW.service_type,
        'event_type', 'confirmed',
        'title', '🔴 Coupure confirmée — ' || NEW.commune,
        'message', v_service_label || ' à ' || NEW.quartier || ' confirmée par 3+ voisins.',
        'url', '/carte'
      );
    ELSE
      RETURN NEW;
    END IF;

  ELSIF TG_ARGV[0] = 'resolved' THEN
    IF NEW.status = 'resolved' AND OLD.status = 'active' THEN
      IF NEW.service_type = 'electricity' THEN v_service_label := '⚡ Électricité';
      ELSIF NEW.service_type = 'water' THEN v_service_label := '💧 Eau';
      ELSE v_service_label := '🏛️ Mairie';
      END IF;

      v_payload := jsonb_build_object(
        'action', 'send',
        'commune', NEW.commune,
        'quartier', NEW.quartier,
        'service_type', NEW.service_type,
        'event_type', 'resolved',
        'title', '✅ Service rétabli — ' || NEW.commune,
        'message', v_service_label || ' rétabli à ' || NEW.quartier || '.',
        'url', '/carte'
      );
    ELSE
      RETURN NEW;
    END IF;

  ELSIF TG_ARGV[0] = 'admin_message' THEN
    v_payload := jsonb_build_object(
      'action', 'send',
      'commune', NEW.commune,
      'quartier', NEW.quartier,
      'service_type', '',
      'event_type', 'admin_message',
      'title', NEW.title,
      'message', NEW.message,
      'url', '/'
    );
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Fire and forget via pg_net
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body := v_payload
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger: new report → push to quartier neighbors
CREATE TRIGGER push_on_new_report
  AFTER INSERT ON public.reports
  FOR EACH ROW
  WHEN (NEW.validated = true AND NEW.status = 'active' AND NEW.commune <> '' AND NEW.quartier <> '' AND NEW.report_category = 'outage')
  EXECUTE FUNCTION trigger_push_notification('new_report');

-- Trigger: report confirmed (3+ verifications) → push to commune
CREATE TRIGGER push_on_report_confirmed
  AFTER UPDATE OF verifications ON public.reports
  FOR EACH ROW
  WHEN (NEW.verifications >= 3 AND OLD.verifications < 3 AND NEW.status = 'active')
  EXECUTE FUNCTION trigger_push_notification('confirmed');

-- Trigger: report resolved → push to quartier
CREATE TRIGGER push_on_report_resolved
  AFTER UPDATE OF status ON public.reports
  FOR EACH ROW
  WHEN (NEW.status = 'resolved' AND OLD.status = 'active')
  EXECUTE FUNCTION trigger_push_notification('resolved');

-- Trigger: admin message → push to commune/quartier
CREATE TRIGGER push_on_admin_message
  AFTER INSERT ON public.admin_messages
  FOR EACH ROW
  EXECUTE FUNCTION trigger_push_notification('admin_message');
