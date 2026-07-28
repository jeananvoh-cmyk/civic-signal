-- ============================================================
-- RELAY LOGS — Mise à jour contrainte opérateur + Triggers
-- ============================================================

-- 1. Mettre à jour la contrainte CHECK pour inclure ONEP et ANARE
ALTER TABLE public.relay_logs DROP CONSTRAINT IF EXISTS relay_logs_operator_check;
ALTER TABLE public.relay_logs ADD CONSTRAINT relay_logs_operator_check 
  CHECK (operator IN ('CIE', 'SODECI', 'MAIRIE', 'ONEP', 'ANARE'));

-- 2. Fonction trigger pour la création de relais lors des corroborations citoyennes
CREATE OR REPLACE FUNCTION public.trigger_relay_on_verification()
RETURNS TRIGGER AS $$
DECLARE
  v_operator TEXT;
  v_email    TEXT;
BEGIN
  IF NEW.verifications >= 2
     AND OLD.verifications < 2
  THEN
    IF NEW.service_type = 'electricity' THEN
      v_operator := 'CIE';
      v_email    := 'reclamation@cie.ci';
    ELSIF NEW.service_type = 'water' THEN
      v_operator := 'SODECI';
      v_email    := 'reclamation@sodeci.ci';
    ELSIF NEW.service_type = 'streetlighting' OR NEW.service_type = 'electricity_quality' THEN
      v_operator := 'ANARE';
      v_email    := 'reclamation@anare.ci';
    ELSIF NEW.service_type = 'water_quality' THEN
      v_operator := 'ONEP';
      v_email    := 'reclamation@onep.ci';
    ELSE
      v_operator := 'MAIRIE';
      v_email    := 'mairie:' || NEW.commune;
    END IF;

    INSERT INTO public.relay_logs (report_id, operator, email_to, status)
    VALUES (NEW.id, v_operator, v_email, 'pending')
    ON CONFLICT (report_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Générer rétroactivement des relais en attente pour tous les signalements valides existants non encore transmis
INSERT INTO public.relay_logs (report_id, operator, email_to, status)
SELECT 
  r.id,
  CASE 
    WHEN r.service_type = 'electricity' THEN 'CIE'
    WHEN r.service_type = 'water' THEN 'SODECI'
    WHEN r.service_type IN ('streetlighting', 'electricity_quality') THEN 'ANARE'
    WHEN r.service_type = 'water_quality' THEN 'ONEP'
    ELSE 'MAIRIE'
  END AS operator,
  CASE 
    WHEN r.service_type = 'electricity' THEN 'reclamation@cie.ci'
    WHEN r.service_type = 'water' THEN 'reclamation@sodeci.ci'
    WHEN r.service_type IN ('streetlighting', 'electricity_quality') THEN 'reclamation@anare.ci'
    WHEN r.service_type = 'water_quality' THEN 'reclamation@onep.ci'
    ELSE 'mairie:' || r.commune
  END AS email_to,
  'pending' AS status
FROM public.reports r
WHERE r.status = 'active'
  AND r.validated = true
  AND NOT EXISTS (
    SELECT 1 FROM public.relay_logs rl WHERE rl.report_id = r.id
  )
ON CONFLICT (report_id) DO NOTHING;
