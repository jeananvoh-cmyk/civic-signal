-- Visibilité du lien "Suivi" dans la navigation (activé par défaut)
INSERT INTO public.site_settings (key, value)
VALUES ('suivi_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;
