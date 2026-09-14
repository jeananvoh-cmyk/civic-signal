-- ==============================================================================
-- SIGNA-CI : HIÉRARCHIE INCIDENTS vs SIGNALEMENTS & INTERVENTIONS TERRAIN
-- 1. Incident Public Unique (Maître) fédérant plusieurs Signalements/Confirmations
-- 2. Suivi des interventions terrain municipales (Équipe/Brigade, Ordre de Travail OT)
-- 3. Timeline de résolution et certification avec photo de preuve
-- ==============================================================================

BEGIN;

-- 1. Enrichissement du schéma de `public.reports`
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS parent_incident_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS child_reports_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_incident_master BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS intervention_team TEXT,
  ADD COLUMN IF NOT EXISTS intervention_work_order TEXT,
  ADD COLUMN IF NOT EXISTS intervention_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS intervention_status TEXT DEFAULT 'unassigned';

-- Index d'accélération pour requêtes cartographiques et hiérarchiques
CREATE INDEX IF NOT EXISTS idx_reports_parent_incident_id ON public.reports(parent_incident_id);
CREATE INDEX IF NOT EXISTS idx_reports_is_incident_master ON public.reports(is_incident_master);
CREATE INDEX IF NOT EXISTS idx_reports_intervention_status ON public.reports(intervention_status);
CREATE INDEX IF NOT EXISTS idx_reports_intervention_work_order ON public.reports(intervention_work_order);

-- Initialiser les enregistrements existants sans parent comme maîtres
UPDATE public.reports
SET is_incident_master = true
WHERE parent_incident_id IS NULL AND is_incident_master IS NOT true;


-- 2. Trigger : Maintien automatique de la cohérence parent-enfants et propagation de résolution
CREATE OR REPLACE FUNCTION public.sync_incident_hierarchy_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id UUID;
BEGIN
  -- A. Déterminer l'ID du parent concerné
  IF TG_OP = 'DELETE' THEN
    v_parent_id := OLD.parent_incident_id;
  ELSE
    v_parent_id := NEW.parent_incident_id;
    -- Si ce signalement est rattaché à un parent, il n'est pas maître
    IF NEW.parent_incident_id IS NOT NULL THEN
      NEW.is_incident_master := false;
    ELSE
      NEW.is_incident_master := true;
    END IF;
  END IF;

  -- B. Si un parent existe, mettre à jour son compteur d'enfants
  IF v_parent_id IS NOT NULL THEN
    UPDATE public.reports
    SET child_reports_count = (
          SELECT COUNT(*)::INTEGER 
          FROM public.reports 
          WHERE parent_incident_id = v_parent_id
        ),
        updated_at = NOW()
    WHERE id = v_parent_id;
  END IF;

  -- C. Si TG_OP = 'UPDATE' et que l'ancien parent était différent, recalculer aussi l'ancien
  IF TG_OP = 'UPDATE' AND OLD.parent_incident_id IS NOT NULL AND OLD.parent_incident_id IS DISTINCT FROM NEW.parent_incident_id THEN
    UPDATE public.reports
    SET child_reports_count = (
          SELECT COUNT(*)::INTEGER 
          FROM public.reports 
          WHERE parent_incident_id = OLD.parent_incident_id
        ),
        updated_at = NOW()
    WHERE id = OLD.parent_incident_id;
  END IF;

  -- D. Cascade de résolution : quand un incident maître est résolu, résoudre automatiquement ses signalements enfants
  IF TG_OP = 'UPDATE' AND NEW.parent_incident_id IS NULL AND NEW.status = 'resolved' AND (OLD.status IS DISTINCT FROM 'resolved') THEN
    UPDATE public.reports
    SET status = 'resolved',
        resolved_at = COALESCE(NEW.resolved_at, NOW()),
        resolved_with_transfer = COALESCE(NEW.resolved_with_transfer, resolved_with_transfer),
        operator_last_note = COALESCE(NEW.operator_last_note, 'Clôturé suite à la résolution de l''incident majeur'),
        intervention_status = 'completed',
        updated_at = NOW()
    WHERE parent_incident_id = NEW.id AND status <> 'resolved';

    -- Historique d'audit pour les enfants
    INSERT INTO public.report_status_history (
      report_id,
      ticket_code,
      old_status,
      new_status,
      operator_name,
      public_note,
      created_by
    )
    SELECT
      c.id,
      c.ticket_code,
      'active',
      'resolved',
      COALESCE(NEW.operator_name, 'Opérateur Technique'),
      'Problème résolu sur le terrain (incident majeur clôturé avec succès)',
      NEW.repair_declared_by
    FROM public.reports c
    WHERE c.parent_incident_id = NEW.id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reports_incident_hierarchy ON public.reports;
CREATE TRIGGER trg_reports_incident_hierarchy
BEFORE INSERT OR UPDATE OF parent_incident_id, status ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.sync_incident_hierarchy_trigger();


-- 3. RPC sécurisée : Rattachement d'un signalement à un incident maître
DROP FUNCTION IF EXISTS public.link_report_to_incident(UUID, UUID);
CREATE OR REPLACE FUNCTION public.link_report_to_incident(
  p_child_report_id UUID,
  p_parent_incident_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_child public.reports%ROWTYPE;
  v_parent public.reports%ROWTYPE;
  v_target_parent_id UUID;
  v_is_authorized BOOLEAN;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentification requise.';
  END IF;

  IF p_child_report_id = p_parent_incident_id THEN
    RAISE EXCEPTION 'Un signalement ne peut pas être son propre parent.';
  END IF;

  SELECT * INTO v_child FROM public.reports WHERE id = p_child_report_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Signalement enfant introuvable.';
  END IF;

  SELECT * INTO v_parent FROM public.reports WHERE id = p_parent_incident_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Incident parent introuvable.';
  END IF;

  -- Contrôle d'accès : Auteur, Partenaire, Modérateur ou Admin
  v_is_authorized := (v_child.user_id = v_caller_id)
                  OR public.has_role(v_caller_id, 'admin')
                  OR public.has_role(v_caller_id, 'moderator')
                  OR public.has_role(v_caller_id, 'partner');

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Non autorisé à regrouper ce signalement.';
  END IF;

  -- Éviter les boucles et les chaînes multi-niveaux :
  -- Si le parent désigné est lui-même déjà rattaché à un autre incident, rattacher directement à la racine
  IF v_parent.parent_incident_id IS NOT NULL THEN
    v_target_parent_id := v_parent.parent_incident_id;
  ELSE
    v_target_parent_id := p_parent_incident_id;
  END IF;

  -- Rattachement du signalement enfant
  UPDATE public.reports
  SET
    parent_incident_id = v_target_parent_id,
    is_incident_master = false,
    updated_at = NOW()
  WHERE id = p_child_report_id;

  -- Incrémenter le compteur de l'incident parent
  UPDATE public.reports
  SET
    child_reports_count = COALESCE(child_reports_count, 0) + 1,
    is_incident_master = true,
    updated_at = NOW()
  WHERE id = v_target_parent_id;

  -- Historique d'audit
  INSERT INTO public.report_status_history (
    report_id,
    ticket_code,
    old_status,
    new_status,
    operator_name,
    public_note,
    created_by
  ) VALUES (
    p_child_report_id,
    v_child.ticket_code,
    v_child.status,
    v_child.status,
    'Fédération SIGNA.ci',
    'Signalement regroupé sous l''incident majeur #' || COALESCE(v_parent.ticket_code, v_target_parent_id::text),
    v_caller_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'child_report_id', p_child_report_id,
    'parent_incident_id', v_target_parent_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_report_to_incident(UUID, UUID) TO authenticated;


-- 4. RPC : Récupération des signalements enfants fédérés sous un incident
DROP FUNCTION IF EXISTS public.get_incident_child_reports(UUID);
CREATE OR REPLACE FUNCTION public.get_incident_child_reports(p_parent_incident_id UUID)
RETURNS TABLE (
  id UUID,
  ticket_code TEXT,
  description TEXT,
  commune TEXT,
  quartier TEXT,
  created_at TIMESTAMPTZ,
  photo_url TEXT,
  photo_urls TEXT[],
  verifications INTEGER,
  impacted_people INTEGER,
  status TEXT,
  repair_photos TEXT[],
  repair_status TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    r.id,
    r.ticket_code,
    r.description,
    r.commune,
    r.quartier,
    r.created_at,
    r.photo_url,
    r.photo_urls,
    r.verifications,
    r.impacted_people,
    r.status,
    r.repair_photos,
    r.repair_status
  FROM public.reports r
  WHERE r.parent_incident_id = p_parent_incident_id
  ORDER BY r.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_incident_child_reports(UUID) TO anon, authenticated;


-- 5. RPC get_public_reports mise à jour : Ne renvoie que les incidents maîtres (parent_incident_id IS NULL)
DROP FUNCTION IF EXISTS public.get_public_reports();

CREATE OR REPLACE FUNCTION public.get_public_reports()
RETURNS TABLE(
  id uuid,
  service_type text,
  report_category text,
  description text,
  location text,
  latitude double precision,
  longitude double precision,
  urgency text,
  status text,
  reporter_type text,
  start_time timestamptz,
  verifications integer,
  created_at timestamptz,
  resolved_at timestamptz,
  child_reports_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    r.id,
    r.service_type,
    r.report_category,
    left(r.description, 120),
    r.location,
    public.public_shift_coordinate(r.id, r.latitude, 'lat'),
    public.public_shift_coordinate(r.id, r.longitude, 'lon'),
    r.urgency,
    r.status,
    r.reporter_type,
    r.start_time,
    r.verifications,
    r.created_at,
    r.resolved_at,
    r.child_reports_count
  FROM public.reports r
  WHERE r.report_category = 'outage'
    AND r.validated = true
    AND r.parent_incident_id IS NULL
    AND r.status IN ('active', 'chronic', 'in_progress', 'open', 'verified')
  ORDER BY r.created_at DESC
  LIMIT 120;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_reports() TO anon, authenticated;


-- 6. RPC get_public_infrastructure_reports mise à jour : Filtre les signalements enfants pour éviter doublons sur la même voirie
DROP FUNCTION IF EXISTS public.get_public_infrastructure_reports(text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_public_infrastructure_reports(
  p_commune text DEFAULT NULL,
  p_limit integer DEFAULT 150,
  p_offset integer DEFAULT 0
) 
RETURNS TABLE(
  id uuid,
  service_type text,
  report_category text,
  description text,
  location text,
  commune text,
  quartier text,
  status text,
  urgency text,
  created_at timestamptz,
  resolved_at timestamptz,
  photo_url text,
  photo_urls text[],
  verifications integer,
  repair_verifications integer,
  support_count integer,
  impacted_people integer,
  reporter_type text,
  latitude double precision,
  longitude double precision,
  ticket_code text,
  operator_name text,
  operator_reference text,
  operator_last_note text,
  estimated_resolution_time timestamptz,
  child_reports_count integer,
  parent_incident_id uuid
) 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path TO 'public' 
AS $$ 
  SELECT 
    r.id,
    r.service_type,
    r.report_category,
    r.description,
    r.location,
    r.commune,
    r.quartier,
    r.status,
    r.urgency,
    r.created_at,
    r.resolved_at,
    r.photo_url,
    r.photo_urls,
    r.verifications,
    r.repair_verifications,
    r.support_count,
    r.impacted_people,
    r.reporter_type,
    public.public_shift_coordinate(r.id, r.latitude, 'lat'),
    public.public_shift_coordinate(r.id, r.longitude, 'lon'),
    r.ticket_code,
    r.operator_name,
    r.operator_reference,
    r.operator_last_note,
    r.estimated_resolution_time,
    r.child_reports_count,
    r.parent_incident_id
  FROM public.reports r 
  WHERE r.validated = true 
    AND r.parent_incident_id IS NULL
    AND (
      r.report_category = 'infrastructure' 
      OR r.service_type IN ('mairie', 'voirie') 
      OR r.description ILIKE '%lampadaire%' 
      OR r.description ILIKE '%éclairage%' 
      OR r.description ILIKE '%eclairage%' 
      OR r.description ILIKE '%poteau%' 
      OR r.description ILIKE '%caniveau%' 
      OR r.description ILIKE '%nid de poule%' 
      OR r.description ILIKE '%fuite%'
    ) 
    AND (p_commune IS NULL OR r.commune ILIKE p_commune) 
  ORDER BY r.created_at DESC 
  LIMIT least(greatest(p_limit, 1), 150) 
  OFFSET greatest(p_offset, 0); 
$$;

GRANT EXECUTE ON FUNCTION public.get_public_infrastructure_reports(text, integer, integer) TO anon, authenticated, service_role;


-- 7. RPC get_public_report_by_id mise à jour avec champs d'intervention et de hiérarchie
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
  resolved_with_transfer boolean,
  parent_incident_id uuid,
  child_reports_count integer,
  is_incident_master boolean,
  intervention_team text,
  intervention_work_order text,
  intervention_started_at timestamptz,
  intervention_status text
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
    r.resolved_with_transfer,
    r.parent_incident_id,
    r.child_reports_count,
    r.is_incident_master,
    r.intervention_team,
    r.intervention_work_order,
    r.intervention_started_at,
    r.intervention_status
  FROM public.reports r
  WHERE r.id = p_report_id;
$$;

REVOKE ALL ON FUNCTION public.get_public_report_by_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_report_by_id(uuid) TO anon, authenticated;


-- 8. RPC get_partner_reports mise à jour avec champs d'intervention, preuves et hiérarchie
DROP FUNCTION IF EXISTS public.get_partner_reports();

CREATE OR REPLACE FUNCTION public.get_partner_reports()
RETURNS TABLE (
  id uuid,
  ticket_code text,
  service_type text,
  report_category text,
  description text,
  location text,
  commune text,
  quartier text,
  pada_formatted_address text,
  status text,
  urgency text,
  validated_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  support_count integer,
  impacted_people integer,
  cie_ticket_number text,
  operator_name text,
  operator_reference text,
  estimated_resolution_time text,
  operator_last_note text,
  photo_url text,
  photo_urls text[],
  resolved_at timestamptz,
  parent_incident_id uuid,
  child_reports_count integer,
  intervention_team text,
  intervention_work_order text,
  intervention_started_at timestamptz,
  intervention_status text,
  repair_photos text[],
  repair_note text,
  repair_declared_at timestamptz,
  repair_status text,
  resolved_with_transfer boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT 
    r.id,
    r.ticket_code,
    r.service_type,
    r.report_category,
    r.description,
    r.location,
    r.commune,
    r.quartier,
    r.pada_formatted_address,
    r.status::text,
    r.urgency::text,
    r.validated_at,
    r.created_at,
    r.updated_at,
    r.support_count,
    r.impacted_people,
    r.cie_ticket_number,
    r.operator_name,
    r.operator_reference,
    r.estimated_resolution_time::text,
    r.operator_last_note,
    r.photo_url,
    r.photo_urls,
    r.resolved_at,
    r.parent_incident_id,
    r.child_reports_count,
    r.intervention_team,
    r.intervention_work_order,
    r.intervention_started_at,
    r.intervention_status,
    r.repair_photos,
    r.repair_note,
    r.repair_declared_at,
    r.repair_status,
    r.resolved_with_transfer
  FROM public.reports r
  JOIN public.partner_profiles pp ON pp.user_id = auth.uid()
  WHERE r.validated = true
    AND ((pp.partner_type = 'cie' AND r.service_type = 'electricity')
      OR (pp.partner_type = 'sodeci' AND r.service_type = 'water')
      OR (pp.partner_type = 'mairie' AND r.report_category = 'infrastructure' AND pp.commune = r.commune)
      OR (pp.partner_type IN ('ngo', 'other')))
  ORDER BY r.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_partner_reports() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_partner_reports() TO authenticated;


-- 9. RPC operator_update_ticket enrichie avec champs d'intervention terrain et preuves photo
-- Nettoyage propre de toutes les anciennes surcharges pour éviter l'erreur 42725 (function name is not unique)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT oid::regprocedure AS func_signature 
        FROM pg_proc 
        WHERE proname = 'operator_update_ticket' 
          AND pronamespace = 'public'::regnamespace
    ) LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.operator_update_ticket(
  p_ticket_code TEXT DEFAULT NULL,
  p_report_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT 'processing',
  p_operator_name TEXT DEFAULT NULL,
  p_operator_reference TEXT DEFAULT NULL,
  p_public_note TEXT DEFAULT NULL,
  p_estimated_resolution TIMESTAMPTZ DEFAULT NULL,
  p_intervention_team TEXT DEFAULT NULL,
  p_intervention_work_order TEXT DEFAULT NULL,
  p_intervention_status TEXT DEFAULT NULL,
  p_resolved_with_transfer BOOLEAN DEFAULT NULL,
  p_proof_notes TEXT DEFAULT NULL,
  p_proof_photo_url TEXT DEFAULT NULL,
  p_proof_verified BOOLEAN DEFAULT NULL,
  p_proof_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report public.reports%ROWTYPE;
  v_old_status TEXT;
  v_caller_id UUID := auth.uid();
  v_op_name TEXT;
  v_int_status TEXT;
  v_int_started TIMESTAMPTZ;
BEGIN
  -- 1. Valider le statut
  IF p_status NOT IN ('active', 'processing', 'resolved', 'rejected', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Statut invalide. Valeurs acceptées: active, processing, resolved, rejected, cancelled');
  END IF;

  -- 2. Trouver le signalement
  IF p_ticket_code IS NOT NULL AND TRIM(p_ticket_code) <> '' THEN
    SELECT * INTO v_report FROM public.reports WHERE ticket_code = UPPER(TRIM(p_ticket_code));
  ELSIF p_report_id IS NOT NULL THEN
    SELECT * INTO v_report FROM public.reports WHERE id = p_report_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Veuillez fournir ticket_code ou report_id');
  END IF;

  IF v_report.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Signalement introuvable');
  END IF;

  v_old_status := v_report.status;
  v_op_name := COALESCE(p_operator_name, v_report.operator_name, 'Opérateur Technique');

  -- Déterminer le statut d'intervention terrain
  IF p_intervention_status IS NOT NULL THEN
    v_int_status := p_intervention_status;
  ELSIF p_status = 'processing' THEN
    v_int_status := 'in_progress';
  ELSIF p_status = 'resolved' THEN
    v_int_status := 'completed';
  ELSE
    v_int_status := COALESCE(v_report.intervention_status, 'unassigned');
  END IF;

  -- Date de démarrage d'intervention
  IF v_int_status = 'in_progress' AND v_report.intervention_started_at IS NULL THEN
    v_int_started := NOW();
  ELSE
    v_int_started := v_report.intervention_started_at;
  END IF;

  -- 3. Mettre à jour la table reports
  UPDATE public.reports
  SET
    status = p_status,
    operator_name = COALESCE(p_operator_name, operator_name),
    operator_reference = COALESCE(p_operator_reference, operator_reference),
    estimated_resolution_time = COALESCE(p_estimated_resolution, estimated_resolution_time),
    operator_last_note = COALESCE(p_public_note, operator_last_note),
    intervention_team = COALESCE(p_intervention_team, intervention_team),
    intervention_work_order = COALESCE(p_intervention_work_order, operator_reference, intervention_work_order),
    intervention_started_at = v_int_started,
    intervention_status = v_int_status,
    proof_notes = COALESCE(p_proof_notes, proof_notes),
    proof_photo_url = COALESCE(p_proof_photo_url, proof_photo_url),
    proof_submitted_at = CASE WHEN p_proof_photo_url IS NOT NULL AND proof_submitted_at IS NULL THEN NOW() ELSE proof_submitted_at END,
    proof_verified = COALESCE(p_proof_verified, proof_verified),
    proof_verified_at = CASE WHEN p_proof_verified = true AND proof_verified_at IS NULL THEN NOW() ELSE proof_verified_at END,
    proof_verified_by = CASE WHEN p_proof_verified = true THEN v_caller_id ELSE proof_verified_by END,
    proof_rejection_reason = CASE WHEN p_proof_verified = false THEN p_proof_rejection_reason ELSE proof_rejection_reason END,
    resolved_with_transfer = CASE WHEN p_status = 'resolved' THEN COALESCE(p_resolved_with_transfer, resolved_with_transfer, true) ELSE resolved_with_transfer END,
    resolved_at = CASE WHEN p_status = 'resolved' THEN NOW() ELSE resolved_at END,
    updated_at = NOW()
  WHERE id = v_report.id;

  -- 4. Enregistrer dans l'historique
  INSERT INTO public.report_status_history (
    report_id,
    ticket_code,
    old_status,
    new_status,
    operator_name,
    operator_reference,
    public_note,
    estimated_resolution_time,
    created_by
  ) VALUES (
    v_report.id,
    v_report.ticket_code,
    v_old_status,
    p_status,
    v_op_name,
    COALESCE(p_intervention_work_order, p_operator_reference, v_report.operator_reference),
    p_public_note,
    p_estimated_resolution,
    v_caller_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'report_id', v_report.id,
    'status', p_status,
    'intervention_status', v_int_status,
    'intervention_work_order', COALESCE(p_intervention_work_order, p_operator_reference)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.operator_update_ticket(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.operator_update_ticket(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated, service_role;

COMMIT;
