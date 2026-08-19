-- ============================================================
-- WORKFLOW DE VALIDATION MANUELLE DES RAPPORTS HEBDOMADAIRES
-- Permet la relecture, modification et approbation des rapports
-- avant toute expédition e-mail aux mairies, concessionnaires et régulateurs.
-- ============================================================

-- Mettre à jour la table weekly_report_logs pour intégrer l'approbation manuelle
ALTER TABLE public.weekly_report_logs
  ADD COLUMN IF NOT EXISTS html_preview TEXT,
  ADD COLUMN IF NOT EXISTS payload_json JSONB,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_mode TEXT DEFAULT 'manual_approval';

-- Mettre à jour la contrainte de statut si nécessaire
-- Statuses possibles : 'draft_pending_approval', 'approved_sent', 'cancelled', 'skipped_no_activity', 'error'

-- Politiques RLS pour la mise à jour et la suppression par les admins
CREATE POLICY "Admins update weekly report logs"
  ON public.weekly_report_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Clés de configuration dans relay_config pour le mode global et par entité
INSERT INTO public.relay_config (key, value, label) VALUES
  ('weekly_report_global_approval_mode', 'manual_approval', 'Mode approbation global (manual_approval / automatic)'),
  ('weekly_report_notify_admin_on_draft', 'true',            'Notifier l''admin lorsqu''un brouillon est généré')
ON CONFLICT (key) DO NOTHING;
