-- ============================================================
-- RELAY : passer en mode validation manuelle par l'admin
-- Le cron automatique est désactivé.
-- L'envoi se fait via l'edge function avec relay_ids explicites.
-- ============================================================

SELECT cron.unschedule('process-relay-queue');
