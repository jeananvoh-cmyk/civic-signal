
SELECT cron.schedule(
  'report-reminders-cron',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://uycoawpbchgznkdbznfc.supabase.co/functions/v1/report-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5Y29hd3BiY2hnem5rZGJ6bmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NTAwNzEsImV4cCI6MjA4NjQyNjA3MX0.p7ZW9SNDM7aQ98IyeHTc6ayn0DuFMDUmY89n0nfL3yk"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);
