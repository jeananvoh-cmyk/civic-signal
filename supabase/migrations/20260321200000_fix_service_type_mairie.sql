-- ============================================================
-- FIX: Ajouter 'mairie' à la contrainte service_type
--
-- Le CHECK initial n'acceptait que ('electricity', 'water').
-- Les signalements infrastructure (caniveau, nid de poule,
-- dépôt sauvage, autre) utilisent service_type = 'mairie',
-- ce qui provoquait une violation de contrainte → erreur d'envoi.
-- ============================================================

ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_service_type_check;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_service_type_check
  CHECK (service_type IN ('electricity', 'water', 'mairie'));
