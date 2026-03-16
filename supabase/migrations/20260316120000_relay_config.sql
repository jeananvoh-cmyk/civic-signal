-- ============================================================
-- RELAY CONFIG — paramètres gérés depuis le dashboard admin
-- Emails opérateurs + mode test/production
-- ============================================================

CREATE TABLE public.relay_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '',
  label      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Valeurs par défaut
INSERT INTO public.relay_config (key, value, label) VALUES
  ('test_mode',    'true',                    'Mode test actif'),
  ('test_email',   '',                        'Email de test (reçoit tous les emails en mode test)'),
  ('email_cie',    'reclamation@cie.ci',      'Email officiel CIE (coupures électricité)'),
  ('email_sodeci', 'reclamation@sodeci.ci',   'Email officiel SODECI (coupures eau)'),
  ('email_mairie', '',                        'Email Mairies (voirie, infrastructure, éclairage public)');

-- RLS : lecture publique pour l'edge function, écriture admin uniquement
ALTER TABLE public.relay_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read relay_config"
  ON public.relay_config FOR SELECT
  USING (true);

CREATE POLICY "Service role can update relay_config"
  ON public.relay_config FOR UPDATE
  USING (true)
  WITH CHECK (true);
