-- Migration: Index de scalabilité haute performance pour pics de charge
-- Date: 2026-09-02

-- 1. Index partiel ultra-rapide sur les incidents actifs (élimine les Seq Scans sur la carte et la page d'accueil)
CREATE INDEX IF NOT EXISTS idx_reports_active_commune_service 
ON public.reports (commune, service_type, created_at DESC) 
WHERE status IN ('active', 'chronic');

-- 2. Index partiel dédié aux coupures en cours par quartier pour le groupement en temps réel
CREATE INDEX IF NOT EXISTS idx_reports_active_outages_quartier
ON public.reports (commune, quartier, created_at DESC)
WHERE report_category = 'outage' AND status = 'active';

-- 3. Indexation des clés étrangères pour accélérer l'évaluation RLS
CREATE INDEX IF NOT EXISTS idx_report_comments_user_id 
ON public.report_comments (user_id);

CREATE INDEX IF NOT EXISTS idx_report_support_votes_user_id 
ON public.report_support_votes (user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created_unread
ON public.notifications (user_id, created_at DESC)
WHERE read = false;

-- 4. Index sur les historiques de statut opérateur
CREATE INDEX IF NOT EXISTS idx_report_status_history_lookup
ON public.report_status_history (report_id, created_at DESC);
