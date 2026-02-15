
-- Add structured vulnerable people columns to reports
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS impacted_people integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS babies integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pregnant integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS elderly integer NOT NULL DEFAULT 0;
