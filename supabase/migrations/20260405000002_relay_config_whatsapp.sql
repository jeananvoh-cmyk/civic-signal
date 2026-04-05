-- Ajouter les numéros WhatsApp CIE et SODECI dans relay_config
INSERT INTO public.relay_config (key, value)
VALUES
  ('whatsapp_cie',    ''),
  ('whatsapp_sodeci', '')
ON CONFLICT (key) DO NOTHING;
