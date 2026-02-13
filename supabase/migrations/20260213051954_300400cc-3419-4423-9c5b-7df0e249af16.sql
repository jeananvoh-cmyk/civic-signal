-- Invalidate reports from non-pilot communes
UPDATE public.reports SET validated = false WHERE LOWER(commune) NOT IN ('cocody', 'yopougon', 'adjamé', 'abobo', 'bingerville');