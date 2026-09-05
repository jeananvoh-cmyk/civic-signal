-- ==============================================================================
-- SIGNA-CI : PREUVES DE RÉPARATION CITOYENNE & QUALIFICATION DE RÉSOLUTION
-- Supporte : Preuve photo Avant/Après, Validation Modérateur/Admin/Partenaire,
-- Distinction "Résolu avec transfert SIGNA.ci" vs "Résolu sans transfert (Spontané)"
-- ==============================================================================

BEGIN;

-- 1. Enrichissement de la table `reports` avec les champs de preuve citoyenne et de reporting
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS repair_photos TEXT[],
  ADD COLUMN IF NOT EXISTS repair_note TEXT,
  ADD COLUMN IF NOT EXISTS repair_declared_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS repair_declared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS repair_status TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS resolved_with_transfer BOOLEAN DEFAULT NULL;

-- Index pour accélérer le filtrage des preuves en attente de modération
CREATE INDEX IF NOT EXISTS idx_reports_repair_status ON public.reports(repair_status);

-- 2. Fonction RPC sécurisée : Soumission d'une preuve de réparation citoyenne
CREATE OR REPLACE FUNCTION public.submit_repair_declaration(
  p_report_id UUID,
  p_photo_urls TEXT[],
  p_note TEXT DEFAULT NULL,
  p_lat DOUBLE PRECISION DEFAULT NULL,
  p_lon DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_report public.reports%ROWTYPE;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Vous devez être connecté pour soumettre une preuve de réparation.';
  END IF;

  SELECT * INTO v_report FROM public.reports
  WHERE id = p_report_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Signalement introuvable.';
  END IF;

  IF v_report.status = 'resolved' THEN
    RAISE EXCEPTION 'Ce signalement est déjà clôturé comme résolu.';
  END IF;

  IF p_photo_urls IS NULL OR array_length(p_photo_urls, 1) = 0 THEN
    RAISE EXCEPTION 'Au moins une photo preuve est obligatoire pour déclarer la réparation.';
  END IF;

  -- Mettre à jour le signalement avec la déclaration de réparation en attente de revue
  UPDATE public.reports
  SET repair_photos = p_photo_urls,
      repair_note = TRIM(p_note),
      repair_declared_at = now(),
      repair_declared_by = v_caller_id,
      repair_status = 'pending_review',
      repair_verifications = COALESCE(repair_verifications, 0) + 1,
      updated_at = now()
  WHERE id = p_report_id;

  -- Enregistrer automatiquement la confirmation de l'usager
  INSERT INTO public.repair_confirmations (report_id, user_id)
  VALUES (p_report_id, v_caller_id)
  ON CONFLICT (report_id, user_id) DO NOTHING;

  -- Enregistrer l'événement d'audit dans l'historique
  INSERT INTO public.report_status_history (
    report_id,
    ticket_code,
    old_status,
    new_status,
    operator_name,
    public_note,
    created_by,
    created_at
  )
  VALUES (
    p_report_id,
    v_report.ticket_code,
    v_report.status,
    v_report.status,
    'Citoyen (Preuve après-travaux)',
    COALESCE(TRIM(p_note), 'Photo(s) preuve de réparation soumise(s). Dossier transmis pour validation.'),
    v_caller_id,
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'report_id', p_report_id,
    'repair_status', 'pending_review'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_repair_declaration(UUID, TEXT[], TEXT, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;


-- 3. Fonction RPC sécurisée : Modération & Validation d'une preuve de réparation
CREATE OR REPLACE FUNCTION public.moderate_repair_declaration(
  p_report_id UUID,
  p_decision TEXT, -- 'approve' ou 'reject'
  p_resolved_with_transfer BOOLEAN DEFAULT FALSE,
  p_moderator_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_is_authorized BOOLEAN;
  v_report public.reports%ROWTYPE;
  v_is_infra BOOLEAN;
  v_resolution_note TEXT;
  v_operator_title TEXT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié.';
  END IF;

  -- Vérifier les droits : Admin, Modérateur ou Partenaire
  v_is_authorized := public.has_role(v_caller_id, 'admin') 
                  OR public.has_role(v_caller_id, 'moderator') 
                  OR public.has_role(v_caller_id, 'partner');

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Seuls les modérateurs, administrateurs et services partenaires peuvent valider les preuves de réparation.';
  END IF;

  SELECT * INTO v_report FROM public.reports
  WHERE id = p_report_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Signalement introuvable.';
  END IF;

  v_is_infra := (v_report.report_category = 'infrastructure' OR v_report.service_type IN ('mairie', 'voirie'));

  IF p_decision = 'approve' THEN
    IF p_resolved_with_transfer THEN
      v_resolution_note := 'Réparation certifiée suite au transfert SIGNA.ci aux services techniques.';
      v_operator_title := 'Modération SIGNA.ci (Validé suite à transfert)';
    ELSE
      v_resolution_note := 'Réparation constatée sur le terrain sans transfert préalable (intervention spontanée / externe).';
      v_operator_title := 'Modération SIGNA.ci (Résolution spontanée)';
    END IF;

    IF p_moderator_note IS NOT NULL AND LENGTH(TRIM(p_moderator_note)) > 0 THEN
      v_resolution_note := v_resolution_note || ' · Note : ' || TRIM(p_moderator_note);
    END IF;

    UPDATE public.reports
    SET status = 'resolved',
        resolved_at = now(),
        repair_status = 'approved',
        resolved_with_transfer = p_resolved_with_transfer,
        operator_last_note = v_resolution_note,
        updated_at = now(),
        latitude = CASE WHEN v_is_infra THEN latitude ELSE NULL END,
        longitude = CASE WHEN v_is_infra THEN longitude ELSE NULL END
    WHERE id = p_report_id;

    -- Historique officiel
    INSERT INTO public.report_status_history (
      report_id,
      ticket_code,
      old_status,
      new_status,
      operator_name,
      public_note,
      created_by,
      created_at
    )
    VALUES (
      p_report_id,
      v_report.ticket_code,
      v_report.status,
      'resolved',
      v_operator_title,
      v_resolution_note,
      v_caller_id,
      now()
    );

    RETURN jsonb_build_object(
      'success', true,
      'status', 'resolved',
      'repair_status', 'approved',
      'resolved_with_transfer', p_resolved_with_transfer
    );

  ELSIF p_decision = 'reject' THEN
    v_resolution_note := 'Preuve de réparation non retenue : ' || COALESCE(TRIM(p_moderator_note), 'Éléments visuels insuffisants ou incident persistant.');

    UPDATE public.reports
    SET repair_status = 'rejected',
        operator_last_note = v_resolution_note,
        updated_at = now()
    WHERE id = p_report_id;

    -- Historique de rejet
    INSERT INTO public.report_status_history (
      report_id,
      ticket_code,
      old_status,
      new_status,
      operator_name,
      public_note,
      created_by,
      created_at
    )
    VALUES (
      p_report_id,
      v_report.ticket_code,
      v_report.status,
      v_report.status,
      'Modération SIGNA.ci',
      v_resolution_note,
      v_caller_id,
      now()
    );

    RETURN jsonb_build_object(
      'success', true,
      'status', v_report.status,
      'repair_status', 'rejected'
    );
  ELSE
    RAISE EXCEPTION 'Décision invalide. Valeurs acceptées : "approve" ou "reject".';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.moderate_repair_declaration(UUID, TEXT, BOOLEAN, TEXT) TO authenticated;


-- 4. Mise à jour de `get_public_report_by_id` pour inclure les nouveaux champs
DROP FUNCTION IF EXISTS public.get_public_report_by_id(uuid);

CREATE OR REPLACE FUNCTION public.get_public_report_by_id(p_report_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  ticket_code text,
  pada_commune_code text,
  pada_street_name text,
  pada_formatted_address text,
  service_type text,
  report_category text,
  description text,
  location text,
  commune text,
  quartier text,
  status text,
  urgency text,
  created_at timestamptz,
  start_time timestamptz,
  resolved_at timestamptz,
  validated boolean,
  validated_at timestamptz,
  forwarded_to_operator_at timestamptz,
  photo_url text,
  photo_urls text[],
  verifications integer,
  repair_verifications integer,
  impacted_people integer,
  babies integer,
  pregnant integer,
  elderly integer,
  operator_name text,
  operator_reference text,
  estimated_resolution_time timestamptz,
  operator_last_note text,
  latitude double precision,
  longitude double precision,
  repair_photos text[],
  repair_note text,
  repair_declared_at timestamptz,
  repair_status text,
  resolved_with_transfer boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    r.id,
    r.user_id,
    r.ticket_code,
    r.pada_commune_code,
    r.pada_street_name,
    r.pada_formatted_address,
    r.service_type,
    r.report_category,
    r.description,
    r.location,
    r.commune,
    r.quartier,
    r.status,
    r.urgency,
    r.created_at,
    r.start_time,
    r.resolved_at,
    r.validated,
    r.validated_at,
    r.forwarded_to_operator_at,
    r.photo_url,
    r.photo_urls,
    r.verifications,
    r.repair_verifications,
    r.impacted_people,
    r.babies,
    r.pregnant,
    r.elderly,
    r.operator_name,
    r.operator_reference,
    r.estimated_resolution_time,
    r.operator_last_note,
    r.latitude,
    r.longitude,
    r.repair_photos,
    r.repair_note,
    r.repair_declared_at,
    r.repair_status,
    r.resolved_with_transfer
  FROM public.reports r
  WHERE r.id = p_report_id;
$$;

REVOKE ALL ON FUNCTION public.get_public_report_by_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_report_by_id(uuid) TO anon, authenticated;

COMMIT;
