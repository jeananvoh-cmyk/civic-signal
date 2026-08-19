-- ============================================================
-- EXTENSION DU RELAIS VOIRIE & INFRASTRUCTURES AUX 14 COMMUNES
-- Couverture 100% du Grand Abidjan avec relais e-mail mairies
-- ============================================================

-- Insérer ou mettre à jour les e-mails et statuts actifs pour les 14 mairies du Grand Abidjan
INSERT INTO public.relay_config (key, value, label) VALUES
  ('mairie_abobo_email',         'technique@abobo.ci',        'Email Mairie d''Abobo'),
  ('mairie_abobo_enabled',       'true',                       'Mairie Abobo active'),
  ('mairie_adjame_email',        'technique@adjame.ci',       'Email Mairie d''Adjamé'),
  ('mairie_adjame_enabled',      'true',                       'Mairie Adjamé active'),
  ('mairie_anyama_email',        'technique@anyama.ci',       'Email Mairie d''Anyama'),
  ('mairie_anyama_enabled',      'true',                       'Mairie Anyama active'),
  ('mairie_attecoube_email',     'technique@attecoube.ci',    'Email Mairie d''Attécoubé'),
  ('mairie_attecoube_enabled',   'true',                       'Mairie Attécoubé active'),
  ('mairie_bingerville_email',   'technique@bingerville.ci',   'Email Mairie de Bingerville'),
  ('mairie_bingerville_enabled', 'true',                       'Mairie Bingerville active'),
  ('mairie_cocody_email',        'technique@cocody.ci',        'Email Mairie de Cocody'),
  ('mairie_cocody_enabled',      'true',                       'Mairie Cocody active'),
  ('mairie_grandbassam_email',   'technique@grandbassam.ci',   'Email Mairie de Grand-Bassam'),
  ('mairie_grandbassam_enabled', 'true',                       'Mairie Grand-Bassam active'),
  ('mairie_koumassi_email',      'technique@koumassi.ci',      'Email Mairie de Koumassi'),
  ('mairie_koumassi_enabled',    'true',                       'Mairie Koumassi active'),
  ('mairie_marcory_email',       'technique@marcory.ci',       'Email Mairie de Marcory'),
  ('mairie_marcory_enabled',     'true',                       'Mairie Marcory active'),
  ('mairie_plateau_email',       'technique@plateau.ci',       'Email Mairie du Plateau'),
  ('mairie_plateau_enabled',     'true',                       'Mairie Plateau active'),
  ('mairie_portbouet_email',     'technique@portbouet.ci',    'Email Mairie de Port-Bouët'),
  ('mairie_portbouet_enabled',   'true',                       'Mairie Port-Bouët active'),
  ('mairie_songon_email',        'technique@songon.ci',       'Email Mairie de Songon'),
  ('mairie_songon_enabled',      'true',                       'Mairie Songon active'),
  ('mairie_treichville_email',   'technique@treichville.ci',   'Email Mairie de Treichville'),
  ('mairie_treichville_enabled', 'true',                       'Mairie Treichville active'),
  ('mairie_yopougon_email',      'technique@yopougon.ci',      'Email Mairie de Yopougon'),
  ('mairie_yopougon_enabled',    'true',                       'Mairie Yopougon active')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  label = EXCLUDED.label;
