-- Migration: notify citizen author when their report is validated by an admin
-- Also notify on resolution. Extends the existing partner notification trigger.

-- Replace the trigger function to also notify the citizen
CREATE OR REPLACE FUNCTION notify_citizen_on_report_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_service_label TEXT;
  v_supabase_url  TEXT := 'https://vqsqvlyeihiynhhiymdb.supabase.co';
  v_anon_key      TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxc3F2bHllaWhpeW5oaGl5bWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0OTYwMjMsImV4cCI6MjA1NTA3MjAyM30.VT6q5EvMx0mqNEFJFupJlTpSAr6bPuBhcHSM3bW_YCI';
BEGIN

  -- ── 1. Validation du signalement ─────────────────────────────────────────
  IF (OLD.validated IS DISTINCT FROM NEW.validated) AND NEW.validated = TRUE THEN

    v_service_label := CASE NEW.service_type
      WHEN 'electricity' THEN 'électricité'
      WHEN 'water'       THEN 'eau'
      ELSE 'infrastructure'
    END;

    -- Notification in-app pour l'auteur
    INSERT INTO notifications (user_id, title, message, report_id)
    VALUES (
      NEW.user_id,
      '✅ Signalement validé',
      'Votre signalement de coupure ' || v_service_label || ' à ' || NEW.commune ||
        ' (' || NEW.quartier || ') a été vérifié et validé par nos modérateurs.',
      NEW.id
    );

    -- Push notification vers l'auteur
    PERFORM net.http_post(
      url     := v_supabase_url || '/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_anon_key
      ),
      body    := jsonb_build_object(
        'action',  'send-to-user',
        'user_id', NEW.user_id,
        'title',   '✅ Signalement validé',
        'body',    'Votre signalement à ' || NEW.commune || ' · ' || NEW.quartier || ' est confirmé.',
        'url',     '/signalement/' || NEW.id
      )
    );

  END IF;

  -- ── 2. Résolution du signalement ─────────────────────────────────────────
  IF (OLD.status IS DISTINCT FROM NEW.status) AND NEW.status = 'resolved' THEN

    v_service_label := CASE NEW.service_type
      WHEN 'electricity' THEN 'électricité'
      WHEN 'water'       THEN 'eau'
      ELSE 'infrastructure'
    END;

    -- Notification in-app pour l'auteur
    INSERT INTO notifications (user_id, title, message, report_id)
    VALUES (
      NEW.user_id,
      '🎉 Problème résolu !',
      'Le service ' || v_service_label || ' a été rétabli à ' || NEW.commune ||
        ' (' || NEW.quartier || '). Merci pour votre signalement !',
      NEW.id
    );

    -- Push notification vers l'auteur
    PERFORM net.http_post(
      url     := v_supabase_url || '/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_anon_key
      ),
      body    := jsonb_build_object(
        'action',  'send-to-user',
        'user_id', NEW.user_id,
        'title',   '🎉 Problème résolu !',
        'body',    'Le service ' || v_service_label || ' est rétabli à ' || NEW.commune || '. Confirmez-vous ?',
        'url',     '/historique'
      )
    );

  END IF;

  RETURN NEW;
END;
$$;

-- Drop old trigger if exists, create new one
DROP TRIGGER IF EXISTS on_report_citizen_notify ON reports;

CREATE TRIGGER on_report_citizen_notify
  AFTER UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_citizen_on_report_update();
