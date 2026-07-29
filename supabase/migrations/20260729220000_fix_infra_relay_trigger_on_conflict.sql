-- ============================================================
-- FIX: Update trigger_relay_on_infra_insert and trigger_relay_on_verification
-- to match UNIQUE (report_id, operator) preventing ON CONFLICT error
-- ============================================================

CREATE OR REPLACE FUNCTION public.trigger_relay_on_infra_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.report_category = 'infrastructure' THEN
    IF NEW.service_type = 'electricity' OR NEW.service_type = 'streetlighting' OR NEW.service_type = 'electricity_quality' THEN
      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      VALUES (NEW.id, 'CIE', 'reclamation@cie.ci', 'pending')
      ON CONFLICT (report_id, operator) DO NOTHING;

      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      VALUES (NEW.id, 'ANARE', 'reclamation@anare.ci', 'pending')
      ON CONFLICT (report_id, operator) DO NOTHING;

    ELSIF NEW.service_type = 'water' OR NEW.service_type = 'water_quality' THEN
      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      VALUES (NEW.id, 'SODECI', 'reclamation@sodeci.ci', 'pending')
      ON CONFLICT (report_id, operator) DO NOTHING;

      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      VALUES (NEW.id, 'ONEP', 'reclamation@onep.ci', 'pending')
      ON CONFLICT (report_id, operator) DO NOTHING;

    ELSE
      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      VALUES (NEW.id, 'MAIRIE', 'mairie:' || NEW.commune, 'pending')
      ON CONFLICT (report_id, operator) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.trigger_relay_on_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verifications >= 2
     AND OLD.verifications < 2
  THEN
    IF NEW.service_type = 'electricity' THEN
      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      VALUES (NEW.id, 'CIE', 'reclamation@cie.ci', 'pending')
      ON CONFLICT (report_id, operator) DO NOTHING;

    ELSIF NEW.service_type = 'water' THEN
      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      VALUES (NEW.id, 'SODECI', 'reclamation@sodeci.ci', 'pending')
      ON CONFLICT (report_id, operator) DO NOTHING;

    ELSIF NEW.service_type = 'streetlighting' OR NEW.service_type = 'electricity_quality' THEN
      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      VALUES (NEW.id, 'CIE', 'reclamation@cie.ci', 'pending')
      ON CONFLICT (report_id, operator) DO NOTHING;

      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      VALUES (NEW.id, 'ANARE', 'reclamation@anare.ci', 'pending')
      ON CONFLICT (report_id, operator) DO NOTHING;

    ELSIF NEW.service_type = 'water_quality' THEN
      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      VALUES (NEW.id, 'SODECI', 'reclamation@sodeci.ci', 'pending')
      ON CONFLICT (report_id, operator) DO NOTHING;

      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      VALUES (NEW.id, 'ONEP', 'reclamation@onep.ci', 'pending')
      ON CONFLICT (report_id, operator) DO NOTHING;

    ELSE
      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      VALUES (NEW.id, 'MAIRIE', 'mairie:' || NEW.commune, 'pending')
      ON CONFLICT (report_id, operator) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
