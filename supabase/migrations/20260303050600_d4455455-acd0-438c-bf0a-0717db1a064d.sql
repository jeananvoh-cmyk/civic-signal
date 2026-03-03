
-- Remove old cron job with hardcoded anon key
SELECT cron.unschedule('report-reminders-cron');

-- Recreate without Authorization header (verify_jwt = false, no auth needed)
SELECT cron.schedule(
  'report-reminders-cron',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://uycoawpbchgznkdbznfc.supabase.co/functions/v1/report-reminders',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);
