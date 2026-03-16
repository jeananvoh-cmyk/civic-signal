-- ============================================================
-- MAIRIES PILOTES — mise à jour avec les 7 communes réelles
-- Abobo, Adjamé, Bingerville, Cocody, Koumassi, Port-Bouët, Yopougon
-- ============================================================

-- Ajouter les 3 communes manquantes (les 4 autres existent déjà)
INSERT INTO public.relay_config (key, value, label) VALUES
  ('mairie_bingerville_email',   '', 'Email Mairie de Bingerville'),
  ('mairie_bingerville_enabled', 'false', 'Mairie Bingerville active'),
  ('mairie_koumassi_email',      '', 'Email Mairie de Koumassi'),
  ('mairie_koumassi_enabled',    'false', 'Mairie Koumassi active'),
  ('mairie_portbouet_email',     '', 'Email Mairie de Port-Bouët'),
  ('mairie_portbouet_enabled',   'false', 'Mairie Port-Bouët active')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- TRIGGER — relay immédiat pour les signalements infrastructure
-- Pas besoin de confirmation voisins : les mairies doivent être
-- notifiées dès le dépôt d'un signalement voirie/caniveau.
-- ============================================================

CREATE OR REPLACE FUNCTION public.trigger_relay_on_infra_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Déclencher uniquement pour les signalements infrastructure mairie
  IF NEW.report_category = 'infrastructure' AND NEW.service_type = 'mairie' THEN
    INSERT INTO public.relay_logs (report_id, operator, email_to, status)
    VALUES (NEW.id, 'MAIRIE', 'mairie:' || NEW.commune, 'pending')
    ON CONFLICT (report_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_infra_report_created
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_relay_on_infra_insert();
