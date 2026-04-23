-- Rapport hebdomadaire chaque lundi à 7h UTC (8h à Abidjan, GMT+1)
-- Requiert pg_cron + pg_net (déjà activés via migration report-reminders)
-- La clé service_role est lue depuis app.service_role_key (déjà configuré)

-- Supprimer l'ancien job si existant (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-admin-report') THEN
    PERFORM cron.unschedule('weekly-admin-report');
  END IF;
END;
$$;

-- Planifier chaque lundi à 7h UTC
SELECT cron.schedule(
  'weekly-admin-report',
  '0 7 * * 1',
  $$
    SELECT net.http_post(
      url     := 'https://uycoawpbchgznkdbznfc.supabase.co/functions/v1/weekly-report',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
      ),
      body := '{}'::jsonb
    )
  $$
);

-- Vérifier
SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'weekly-admin-report';
