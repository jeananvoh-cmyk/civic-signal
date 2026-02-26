
-- Add reminder tracking columns to reports
ALTER TABLE public.reports
ADD COLUMN last_reminder_at timestamptz,
ADD COLUMN reminder_count integer NOT NULL DEFAULT 0;

-- Index for efficient cron queries on active reports
CREATE INDEX idx_reports_active_reminders ON public.reports (status, created_at)
WHERE status = 'active';
