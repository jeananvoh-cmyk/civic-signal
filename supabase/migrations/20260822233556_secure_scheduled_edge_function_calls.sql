BEGIN;
SELECT cron.unschedule('report-reminders-cron');
SELECT cron.schedule('report-reminders-cron','*/30 * * * *',$$SELECT net.http_post(url := 'https://uycoawpbchgznkdbznfc.supabase.co/functions/v1/report-reminders',headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='civic_signal_service_role_jwt')),body := jsonb_build_object('time',now())) AS request_id;$$);
SELECT cron.unschedule('weekly-admin-report');
SELECT cron.schedule('weekly-admin-report','0 7 * * 1',$$SELECT net.http_post(url := 'https://uycoawpbchgznkdbznfc.supabase.co/functions/v1/weekly-report',headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='civic_signal_service_role_jwt')),body := '{}'::jsonb);$$);
COMMIT;
