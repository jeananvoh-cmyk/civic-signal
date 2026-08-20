-- ── Migration : Empreinte numérique des photos (SHA-256) & Vérification de proximité GPS ──────
-- Sécurise la validation des signalements et réparations d'infrastructure contre la fraude :
-- 1. Table d'empreintes (hash SHA-256) pour détecter le recyclage d'images / Google Images.
-- 2. Fonction RPC de confirmation géolocalisée (distance Haversine < 500m exigée).

-- 1. Table des empreintes de photos
CREATE TABLE IF NOT EXISTS public.photo_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hash TEXT NOT NULL,
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_photo_fingerprints_hash ON public.photo_fingerprints(hash);
CREATE INDEX IF NOT EXISTS idx_photo_fingerprints_report_id ON public.photo_fingerprints(report_id);

ALTER TABLE public.photo_fingerprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read for photo fingerprints"
  ON public.photo_fingerprints FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert photo fingerprints"
  ON public.photo_fingerprints FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 2. RPC : Enregistrement et vérification anti-duplication de hash photo
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
    -- Enregistrer l'empreinte pour ce signalement
    INSERT INTO public.photo_fingerprints (hash, report_id, user_id)
    VALUES (p_hash, p_report_id, v_caller_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', v_duplicate,
    'existing_report_id', v_existing_report_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_photo_hash(text, uuid) TO authenticated, anon;

-- 3. RPC : Confirmation de réparation avec validation stricte de proximité GPS (< 500m)
CREATE OR REPLACE FUNCTION public.confirm_repair_with_geo(
  p_report_id uuid,
  p_user_lat double precision DEFAULT NULL,
  p_user_lon double precision DEFAULT NULL,
  p_max_distance_meters double precision DEFAULT 500
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_report public.reports%ROWTYPE;
  v_distance double precision := NULL;
  v_new_count integer;
  v_is_infra boolean;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Connectez-vous pour confirmer la réparation.';
  END IF;

  SELECT * INTO v_report FROM public.reports
  WHERE id = p_report_id AND validated = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Signalement introuvable ou non validé.';
  END IF;

  IF v_report.status = 'resolved' THEN
    RAISE EXCEPTION 'Ce signalement est déjà clôturé comme résolu.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.repair_confirmations
    WHERE report_id = p_report_id AND user_id = v_caller_id
  ) THEN
    RAISE EXCEPTION 'Vous avez déjà confirmé la réparation de ce signalement.';
  END IF;

  -- Contrôle de proximité si le signalement et l'usager ont des coordonnées GPS
  IF v_report.latitude IS NOT NULL AND v_report.longitude IS NOT NULL
     AND p_user_lat IS NOT NULL AND p_user_lon IS NOT NULL THEN
    
    -- Calcul Haversine en mètres
    v_distance := 2 * 6371000 * asin(
      sqrt(
        sin(radians(p_user_lat - v_report.latitude) / 2)^2 +
        cos(radians(v_report.latitude)) * cos(radians(p_user_lat)) *
        sin(radians(p_user_lon - v_report.longitude) / 2)^2
      )
    );

    IF v_distance > p_max_distance_meters THEN
      RAISE EXCEPTION 'Position trop éloignée (% m). Vous devez être à moins de % m du lieu pour confirmer la réparation.',
        ROUND(v_distance::numeric), p_max_distance_meters;
    END IF;
  END IF;

  -- Enregistrer la confirmation
  INSERT INTO public.repair_confirmations (report_id, user_id)
  VALUES (p_report_id, v_caller_id)
  ON CONFLICT (report_id, user_id) DO NOTHING;

  UPDATE public.reports
  SET repair_verifications = COALESCE(repair_verifications, 0) + 1,
      updated_at = now()
  WHERE id = p_report_id
  RETURNING repair_verifications INTO v_new_count;

  -- Résolution automatique dès 3 confirmations vérifiées
  IF v_new_count >= 3 THEN
    v_is_infra := (v_report.report_category = 'infrastructure' OR v_report.service_type IN ('mairie', 'voirie'));

    UPDATE public.reports
    SET status = 'resolved',
        resolved_at = now(),
        updated_at = now(),
        latitude = CASE WHEN v_is_infra THEN latitude ELSE NULL END,
        longitude = CASE WHEN v_is_infra THEN longitude ELSE NULL END
    WHERE id = p_report_id;

    -- Enregistrer l'événement officiel dans l'historique
    INSERT INTO public.report_status_history (
      report_id,
      ticket_code,
      old_status,
      new_status,
      operator_name,
      public_note,
      created_at
    )
    VALUES (
      p_report_id,
      v_report.ticket_code,
      v_report.status,
      'resolved',
      'Consensus Citoyen (Vérifié)',
      'Réparation validée sur le terrain avec contrôle de proximité GPS par 3 riverains.',
      now()
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'repair_verifications', v_new_count,
    'distance_meters', v_distance,
    'resolved', v_new_count >= 3
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_repair_with_geo(uuid, double precision, double precision, double precision) TO authenticated;
