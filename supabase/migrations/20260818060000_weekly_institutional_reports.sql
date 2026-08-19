-- ============================================================
-- RAPPORTS HEBDOMADAIRES INSTITUTIONNELS — AUDIT & RECEPTIONS
-- Table de log des synthèses hebdomadaires expédiées aux 14 mairies,
-- concessionnaires (CIE/SODECI) et régulateurs (ANARE-CI/ONEP)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.weekly_report_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL, -- 'municipal', 'concessionnaire', 'regulateur', 'global'
  target_entity TEXT NOT NULL, -- ex: 'Mairie de Cocody', 'CIE', 'ANARE-CI'
  email_to TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_reports INT DEFAULT 0,
  total_impacted INT DEFAULT 0,
  status TEXT DEFAULT 'sent', -- 'sent', 'error'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.weekly_report_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read weekly report logs"
  ON public.weekly_report_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins insert weekly report logs"
  ON public.weekly_report_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Seed configuration des destinataires des régulateurs et concessionnaires
INSERT INTO public.relay_config (key, value, label) VALUES
  ('report_email_anare',     'reclamation@anare.ci',    'Email Rapport Hebdo ANARE-CI (Électricité)'),
  ('report_email_onep',      'reclamation@onep.ci',     'Email Rapport Hebdo ONEP (Eau)'),
  ('report_email_cie',       'reclamation@cie.ci',      'Email Rapport Hebdo CIE'),
  ('report_email_sodeci',    'reclamation@sodeci.ci',   'Email Rapport Hebdo SODECI'),
  ('report_auto_send_day',   '1',                       'Jour d''envoi automatique (1 = Lundi)'),
  ('report_auto_send_hour',  '8',                       'Heure d''envoi GMT (8 = 8h00)')
ON CONFLICT (key) DO NOTHING;
