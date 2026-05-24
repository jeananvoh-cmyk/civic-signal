-- Seuil de corroboration configurable depuis le dashboard admin
INSERT INTO public.relay_config (key, value, label)
VALUES ('corroboration_threshold', '3', 'Nombre de corroborations requis pour valider un signalement')
ON CONFLICT (key) DO NOTHING;
