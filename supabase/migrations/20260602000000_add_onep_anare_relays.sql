-- ============================================================
-- RELAY CONFIG — Ajout des clés par défaut pour ONEP & ANARE-CI
-- ============================================================

INSERT INTO public.relay_config (key, value, label) VALUES
  ('email_onep',      'reclamation@onep.ci',  'Email officiel ONEP (régulation eau potable)'),
  ('whatsapp_onep',   '+2250700000000',       'WhatsApp officiel ONEP'),
  ('email_anare',     'reclamation@anare.ci', 'Email officiel ANARE-CI (régulateur électricité & éclairage public)'),
  ('whatsapp_anare',  '+2250700000000',       'WhatsApp officiel ANARE-CI')
ON CONFLICT (key) DO NOTHING;
