-- Fix two constraints that block infrastructure report submissions
--
-- 1. service_type : les signalements infrastructure (caniveau, voirie, égout…)
--    utilisent service_type = 'mairie'. Si cette contrainte n'a pas été
--    appliquée en production, l'INSERT échoue avec un code 23514 silencieux.
ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_service_type_check;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_service_type_check
  CHECK (service_type IN ('electricity', 'water', 'mairie'));

-- 2. description_length : le champ description stocke la description
--    assemblée = "[typeLabel] {saisie utilisateur} [N personne(s)]".
--    La saisie est limitée à 500 chars côté client, mais le préfixe/suffixe
--    ajoutent ~20-90 chars supplémentaires, ce qui dépasse l'ancienne limite
--    de 500 et provoque une violation 23514.
ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_description_length;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_description_length
  CHECK (description IS NULL OR char_length(description) <= 600);
