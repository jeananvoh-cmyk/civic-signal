-- Validate all existing unvalidated reports
UPDATE public.reports SET validated = true WHERE validated = false;

-- Fix typo in commune name
UPDATE public.reports SET commune = 'Adjamé', location = REPLACE(location, 'Adajamé', 'Adjamé') WHERE commune = 'Adajamé';