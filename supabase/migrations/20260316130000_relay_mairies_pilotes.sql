-- ============================================================
-- MAIRIES PILOTES — 7 communes avec email + toggle individuel
-- ============================================================

INSERT INTO public.relay_config (key, value, label) VALUES
  ('mairie_cocody_email',         '',      'Email Mairie de Cocody'),
  ('mairie_cocody_enabled',       'false', 'Mairie Cocody active'),
  ('mairie_plateau_email',        '',      'Email Mairie du Plateau'),
  ('mairie_plateau_enabled',      'false', 'Mairie Plateau active'),
  ('mairie_yopougon_email',       '',      'Email Mairie de Yopougon'),
  ('mairie_yopougon_enabled',     'false', 'Mairie Yopougon active'),
  ('mairie_adjame_email',         '',      'Email Mairie d''Adjamé'),
  ('mairie_adjame_enabled',       'false', 'Mairie Adjamé active'),
  ('mairie_abobo_email',          '',      'Email Mairie d''Abobo'),
  ('mairie_abobo_enabled',        'false', 'Mairie Abobo active'),
  ('mairie_treichville_email',    '',      'Email Mairie de Treichville'),
  ('mairie_treichville_enabled',  'false', 'Mairie Treichville active'),
  ('mairie_marcory_email',        '',      'Email Mairie de Marcory'),
  ('mairie_marcory_enabled',      'false', 'Mairie Marcory active')
ON CONFLICT (key) DO NOTHING;
