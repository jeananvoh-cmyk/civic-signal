-- Extend the citizen notification trigger to ALSO send a commune-wide push
-- when a report is newly validated (so all subscribers of that commune are alerted).

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
        'message', 'Votre signalement à ' || NEW.commune || ' · ' || NEW.quartier || ' est confirmé.',
        'url',     '/signalement/' || NEW.id
      )
    );

    -- Push commune-wide : alerte tous les abonnés de cette commune
    PERFORM net.http_post(
      url     := v_supabase_url || '/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_anon_key
      ),
      body    := jsonb_build_object(
        'action',          'send',
        'commune',         NEW.commune,
        'quartier',        NEW.quartier,
        'service_type',    NEW.service_type,
        'event_type',      'outage',
        'title',           '⚠️ Coupure ' || v_service_label || ' — ' || NEW.commune,
        'message',         'Un signalement a été confirmé à ' || NEW.quartier || '. Restez informé.',
        'url',             '/signalement/' || NEW.id,
        'tag',             'outage-' || NEW.commune,
        'exclude_user_ids', jsonb_build_array(NEW.user_id::text)
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

    -- Push vers l'auteur
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
        'message', 'Le service ' || v_service_label || ' est rétabli à ' || NEW.commune || '. Confirmez-vous ?',
        'url',     '/historique'
      )
    );

    -- Push commune-wide : rétablissement du service
    PERFORM net.http_post(
      url     := v_supabase_url || '/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_anon_key
      ),
      body    := jsonb_build_object(
        'action',          'send',
        'commune',         NEW.commune,
        'quartier',        NEW.quartier,
        'service_type',    NEW.service_type,
        'event_type',      'resolved',
        'title',           '✅ Service rétabli — ' || NEW.commune,
        'message',         'La coupure ' || v_service_label || ' à ' || NEW.quartier || ' est résolue.',
        'url',             '/commune/' || NEW.commune,
        'tag',             'resolved-' || NEW.commune,
        'exclude_user_ids', jsonb_build_array(NEW.user_id::text)
      )
    );

  END IF;

  RETURN NEW;
END;
$$;

-- Trigger already exists from previous migration — no need to recreate
