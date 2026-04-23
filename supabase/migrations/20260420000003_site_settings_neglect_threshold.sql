-- Seuil de jours avant qu'un signalement soit considéré "négligé" (défaut : 7)
INSERT INTO public.site_settings (key, value)
VALUES ('neglect_threshold_days', '7'::jsonb)
ON CONFLICT (key) DO NOTHING;
