-- Add column 'type' and make report_id optional on notifications table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.notifications ALTER COLUMN report_id DROP NOT NULL;
