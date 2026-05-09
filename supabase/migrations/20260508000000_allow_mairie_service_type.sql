-- Allow 'mairie' as service_type for infrastructure reports (caniveau, voirie, égout, etc.)
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_service_type_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_service_type_check
  CHECK (service_type IN ('electricity', 'water', 'mairie'));
