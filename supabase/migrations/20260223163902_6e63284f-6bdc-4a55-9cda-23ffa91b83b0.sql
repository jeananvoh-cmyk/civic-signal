
-- Add report_category column to distinguish outages from infrastructure issues
ALTER TABLE public.reports 
ADD COLUMN report_category text NOT NULL DEFAULT 'outage'
CHECK (report_category IN ('outage', 'infrastructure'));

-- Add index for filtering by category
CREATE INDEX idx_reports_category ON public.reports (report_category);

COMMENT ON COLUMN public.reports.report_category IS 'outage = coupure de service, infrastructure = lampadaire cassé / fuite visible';
