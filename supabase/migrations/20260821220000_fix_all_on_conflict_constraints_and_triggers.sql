-- ============================================================
-- FIX: All ON CONFLICT Constraints & Triggers for Relay Logs & Photo Fingerprints
-- Prevents "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- ============================================================

-- ── 1. Fix photo_fingerprints table & RPC ──────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'photo_fingerprints') THEN
    -- Nettoyer les doublons
    DELETE FROM public.photo_fingerprints a
    USING public.photo_fingerprints b
    WHERE a.id > b.id
      AND a.hash = b.hash
      AND a.report_id = b.report_id;

    -- Créer la contrainte unique
    DROP INDEX IF EXISTS public.idx_photo_fingerprints_hash_report;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_photo_fingerprints_hash_report ON public.photo_fingerprints(hash, report_id);
    
    ALTER TABLE public.photo_fingerprints DROP CONSTRAINT IF EXISTS photo_fingerprints_hash_report_unique;
    ALTER TABLE public.photo_fingerprints ADD CONSTRAINT photo_fingerprints_hash_report_unique UNIQUE USING INDEX idx_photo_fingerprints_hash_report;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.register_photo_hash(
  p_hash text,
  p_report_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_existing_report_id uuid;
  v_duplicate boolean := false;
BEGIN
  v_caller_id := auth.uid();
  IF p_hash IS NULL OR LENGTH(TRIM(p_hash)) < 16 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Hash invalide');
  END IF;

  -- Vérifier si ce hash existe déjà sur un autre signalement
  SELECT report_id INTO v_existing_report_id
  FROM public.photo_fingerprints
  WHERE hash = p_hash AND report_id <> p_report_id
  LIMIT 1;

  IF v_existing_report_id IS NOT NULL THEN
    v_duplicate := true;
  ELSE
    -- Enregistrer l'empreinte pour ce signalement de manière 100% sûre sans ON CONFLICT
    INSERT INTO public.photo_fingerprints (hash, report_id, user_id)
    SELECT p_hash, p_report_id, v_caller_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.photo_fingerprints WHERE hash = p_hash AND report_id = p_report_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', v_duplicate,
    'existing_report_id', v_existing_report_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_photo_hash(text, uuid) TO authenticated, anon;


-- ── 2. Fix relay_logs unique constraints & trigger functions ───────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'relay_logs') THEN
    -- Nettoyer les doublons
    DELETE FROM public.relay_logs a
    USING public.relay_logs b
    WHERE a.id > b.id
      AND a.report_id = b.report_id
      AND a.operator = b.operator;

    ALTER TABLE public.relay_logs DROP CONSTRAINT IF EXISTS relay_logs_report_unique;
    ALTER TABLE public.relay_logs DROP CONSTRAINT IF EXISTS relay_logs_report_operator_unique;
    DROP INDEX IF EXISTS public.relay_logs_report_operator_uidx;

    CREATE UNIQUE INDEX IF NOT EXISTS relay_logs_report_operator_uidx ON public.relay_logs (report_id, operator);
    ALTER TABLE public.relay_logs ADD CONSTRAINT relay_logs_report_operator_unique UNIQUE USING INDEX relay_logs_report_operator_uidx;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.trigger_relay_on_infra_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.report_category = 'infrastructure' THEN
    IF NEW.service_type = 'electricity' OR NEW.service_type = 'streetlighting' OR NEW.service_type = 'electricity_quality' THEN
      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      SELECT NEW.id, 'CIE', 'reclamation@cie.ci', 'pending'
      WHERE NOT EXISTS (SELECT 1 FROM public.relay_logs WHERE report_id = NEW.id AND operator = 'CIE');

      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      SELECT NEW.id, 'ANARE', 'reclamation@anare.ci', 'pending'
      WHERE NOT EXISTS (SELECT 1 FROM public.relay_logs WHERE report_id = NEW.id AND operator = 'ANARE');

    ELSIF NEW.service_type = 'water' OR NEW.service_type = 'water_quality' THEN
      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      SELECT NEW.id, 'SODECI', 'reclamation@sodeci.ci', 'pending'
      WHERE NOT EXISTS (SELECT 1 FROM public.relay_logs WHERE report_id = NEW.id AND operator = 'SODECI');

      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      SELECT NEW.id, 'ONEP', 'reclamation@onep.ci', 'pending'
      WHERE NOT EXISTS (SELECT 1 FROM public.relay_logs WHERE report_id = NEW.id AND operator = 'ONEP');

    ELSE
      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      SELECT NEW.id, 'MAIRIE', 'mairie:' || COALESCE(NEW.commune, ''), 'pending'
      WHERE NOT EXISTS (SELECT 1 FROM public.relay_logs WHERE report_id = NEW.id AND operator = 'MAIRIE');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.trigger_relay_on_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verifications >= 2
     AND (OLD.verifications IS NULL OR OLD.verifications < 2)
  THEN
    IF NEW.service_type = 'electricity' THEN
      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      SELECT NEW.id, 'CIE', 'reclamation@cie.ci', 'pending'
      WHERE NOT EXISTS (SELECT 1 FROM public.relay_logs WHERE report_id = NEW.id AND operator = 'CIE');

    ELSIF NEW.service_type = 'water' THEN
      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      SELECT NEW.id, 'SODECI', 'reclamation@sodeci.ci', 'pending'
      WHERE NOT EXISTS (SELECT 1 FROM public.relay_logs WHERE report_id = NEW.id AND operator = 'SODECI');

    ELSIF NEW.service_type = 'streetlighting' OR NEW.service_type = 'electricity_quality' THEN
      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      SELECT NEW.id, 'CIE', 'reclamation@cie.ci', 'pending'
      WHERE NOT EXISTS (SELECT 1 FROM public.relay_logs WHERE report_id = NEW.id AND operator = 'CIE');

      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      SELECT NEW.id, 'ANARE', 'reclamation@anare.ci', 'pending'
      WHERE NOT EXISTS (SELECT 1 FROM public.relay_logs WHERE report_id = NEW.id AND operator = 'ANARE');

    ELSIF NEW.service_type = 'water_quality' THEN
      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      SELECT NEW.id, 'SODECI', 'reclamation@sodeci.ci', 'pending'
      WHERE NOT EXISTS (SELECT 1 FROM public.relay_logs WHERE report_id = NEW.id AND operator = 'SODECI');

      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      SELECT NEW.id, 'ONEP', 'reclamation@onep.ci', 'pending'
      WHERE NOT EXISTS (SELECT 1 FROM public.relay_logs WHERE report_id = NEW.id AND operator = 'ONEP');

    ELSE
      INSERT INTO public.relay_logs (report_id, operator, email_to, status)
      SELECT NEW.id, 'MAIRIE', 'mairie:' || COALESCE(NEW.commune, ''), 'pending'
      WHERE NOT EXISTS (SELECT 1 FROM public.relay_logs WHERE report_id = NEW.id AND operator = 'MAIRIE');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
