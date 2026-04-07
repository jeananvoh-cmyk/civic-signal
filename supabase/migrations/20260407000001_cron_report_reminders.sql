-- Cron job : appel de la Edge Function report-reminders toutes les heures
-- Requiert pg_cron + pg_net (actifs par défaut sur Supabase Pro/Team)
-- À exécuter dans SQL Editor → Supabase Dashboard

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Stocker la clé service_role comme paramètre de configuration
-- ⚠️  Remplacer 'eyJ...' par votre vraie clé service_role (Settings → API → service_role)
ALTER DATABASE postgres SET app.service_role_key = 'REMPLACER_PAR_SERVICE_ROLE_KEY';

-- 3. Supprimer l'ancien job si existant
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'report-reminders-hourly') THEN
    PERFORM cron.unschedule('report-reminders-hourly');
  END IF;
END;
$$;

-- 4. Planifier toutes les heures à la minute 5
SELECT cron.schedule(
  'report-reminders-hourly',
  '5 * * * *',
  $$
    SELECT net.http_post(
      url     := 'https://uycoawpbchgznkdbnfc.supabase.co/functions/v1/report-reminders',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
      ),
      body := '{}'::jsonb
    )
  $$
);

-- 5. Vérifier que le job est bien planifié
SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'report-reminders-hourly';
