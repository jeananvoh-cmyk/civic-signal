-- ============================================================
-- DUAL RELAY — Permettre l'envoi simultané au Concessionnaire (CIE/SODECI) 
-- ET au Régulateur (ANARE-CI / ONEP) pour un même signalement.
-- ============================================================

-- 1. Remplacer la contrainte d'unicité (report_id) par (report_id, operator)
ALTER TABLE public.relay_logs DROP CONSTRAINT IF EXISTS relay_logs_report_unique;
ALTER TABLE public.relay_logs DROP CONSTRAINT IF EXISTS relay_logs_report_operator_unique;
ALTER TABLE public.relay_logs ADD CONSTRAINT relay_logs_report_operator_unique UNIQUE (report_id, operator);

-- 2. Déclencheur avec double routage (Concessionnaire + Régulateur)
CREATE OR REPLACE FUNCTION public.trigger_relay_on_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verifications >= 2
     AND OLD.verifications < 2
  THEN
    -- Électricité pure -> CIE
    IF NEW.service_type = 'electricity' THEN
      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      VALUES (NEW.id, 'CIE', 'reclamation@cie.ci', 'pending')
      ON CONFLICT (report_id, operator) DO NOTHING;

    -- Eau pure -> SODECI
    ELSIF NEW.service_type = 'water' THEN
      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      VALUES (NEW.id, 'SODECI', 'reclamation@sodeci.ci', 'pending')
      ON CONFLICT (report_id, operator) DO NOTHING;

    -- Éclairage public / Qualité courant -> DUAL RELAY (CIE + ANARE-CI)
    ELSIF NEW.service_type = 'streetlighting' OR NEW.service_type = 'electricity_quality' THEN
      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      VALUES (NEW.id, 'CIE', 'reclamation@cie.ci', 'pending')
      ON CONFLICT (report_id, operator) DO NOTHING;

      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      VALUES (NEW.id, 'ANARE', 'reclamation@anare.ci', 'pending')
      ON CONFLICT (report_id, operator) DO NOTHING;

    -- Qualité eau -> DUAL RELAY (SODECI + ONEP)
    ELSIF NEW.service_type = 'water_quality' THEN
      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      VALUES (NEW.id, 'SODECI', 'reclamation@sodeci.ci', 'pending')
      ON CONFLICT (report_id, operator) DO NOTHING;

      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      VALUES (NEW.id, 'ONEP', 'reclamation@onep.ci', 'pending')
      ON CONFLICT (report_id, operator) DO NOTHING;

    -- Infrastructures Mairie
    ELSE
      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      VALUES (NEW.id, 'MAIRIE', 'mairie:' || NEW.commune, 'pending')
      ON CONFLICT (report_id, operator) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Insérer rétroactivement le double routage pour tous les signalements d'éclairage public / qualité
INSERT INTO public.relay_logs (report_id, operator, email_to, status)
SELECT r.id, 'CIE', 'reclamation@cie.ci', 'pending'
FROM public.reports r
WHERE r.status = 'active'
  AND r.validated = true
  AND r.service_type IN ('streetlighting', 'electricity_quality', 'electricity')
ON CONFLICT (report_id, operator) DO NOTHING;

INSERT INTO public.relay_logs (report_id, operator, email_to, status)
SELECT r.id, 'ANARE', 'reclamation@anare.ci', 'pending'
FROM public.reports r
WHERE r.status = 'active'
  AND r.validated = true
  AND r.service_type IN ('streetlighting', 'electricity_quality')
ON CONFLICT (report_id, operator) DO NOTHING;
