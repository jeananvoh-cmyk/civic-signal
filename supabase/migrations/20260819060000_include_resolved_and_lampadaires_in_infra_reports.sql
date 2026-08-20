-- ── Migration : Harmonisation Complète Backend — Hub Civique Infrastructure & FixMyStreet ──────
-- Garantit que les signalements de lampadaires, voirie, canalisations et pannes publiques
-- sont parfaitement exposés (avec coordonnées exactes, statut d'intervention, support_count et journal d'updates).

-- 1. Mise à jour de la RPC publique des signalements d'infrastructure
DROP FUNCTION IF EXISTS public.get_public_infrastructure_reports();
DROP FUNCTION IF EXISTS public.get_public_infrastructure_reports(text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_public_infrastructure_reports(
  p_commune   text    DEFAULT NULL,
  p_limit     integer DEFAULT 150,
  p_offset    integer DEFAULT 0
)
RETURNS TABLE (
  id                        uuid,
  service_type              text,
  report_category           text,
  description               text,
  location                  text,
  commune                   text,
  quartier                  text,
  status                    text,
  urgency                   text,
  created_at                timestamptz,
  resolved_at               timestamptz,
  photo_url                 text,
  photo_urls                text[],
  verifications             integer,
  repair_verifications      integer,
  support_count             integer,
  impacted_people           integer,
  reporter_type             text,
  latitude                  double precision,
  longitude                 double precision,
  ticket_code               text,
  operator_name             text,
  operator_reference         text,
  operator_last_note        text,
  estimated_resolution_time timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id,
    service_type,
    report_category,
    description,
    location,
    commune,
    quartier,
    status,
    urgency,
    created_at,
    resolved_at,
    photo_url,
    photo_urls,
    verifications,
    repair_verifications,
    support_count,
    impacted_people,
    reporter_type,
    latitude::double precision AS latitude,
    longitude::double precision AS longitude,
    ticket_code,
    operator_name,
    operator_reference,
    operator_last_note,
    estimated_resolution_time
  FROM public.reports
  WHERE (
      report_category = 'infrastructure'
      OR service_type IN ('mairie', 'voirie')
      OR description ILIKE '%lampadaire%'
      OR description ILIKE '%éclairage%'
      OR description ILIKE '%eclairage%'
      OR description ILIKE '%poteau%'
      OR description ILIKE '%caniveau%'
      OR description ILIKE '%nid de poule%'
      OR description ILIKE '%fuite%'
    )
    AND (p_commune IS NULL OR commune ILIKE p_commune)
  ORDER BY created_at DESC
  LIMIT  p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_infrastructure_reports(text, integer, integer) TO anon, authenticated, service_role;

-- 2. Table des votes de soutien infrastructure & RLS
CREATE TABLE IF NOT EXISTS public.report_support_votes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_id, user_id)
);

ALTER TABLE public.report_support_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own support votes" ON public.report_support_votes;
CREATE POLICY "Users can view own support votes"
  ON public.report_support_votes FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can insert support votes" ON public.report_support_votes;
CREATE POLICY "Authenticated users can insert support votes"
  ON public.report_support_votes FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own support votes" ON public.report_support_votes;
CREATE POLICY "Users can delete own support votes"
  ON public.report_support_votes FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- 3. RPC : voter pour une réparation / soutien infrastructure (toggle sécurisé)
CREATE OR REPLACE FUNCTION public.vote_infrastructure_support(p_report_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   uuid := auth.uid();
  v_existing  uuid;
  v_new_count integer;
  v_voted     boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Connexion requise pour voter');
  END IF;

  -- Vérifier que le signalement existe
  IF NOT EXISTS (
    SELECT 1 FROM public.reports WHERE id = p_report_id
  ) THEN
    RETURN jsonb_build_object('error', 'Signalement introuvable');
  END IF;

  -- Vérifier si déjà voté
  SELECT id INTO v_existing
  FROM public.report_support_votes
  WHERE report_id = p_report_id AND user_id = v_user_id;

  IF v_existing IS NOT NULL THEN
    -- Déjà voté → toggle off
    DELETE FROM public.report_support_votes WHERE id = v_existing;
    UPDATE public.reports SET support_count = GREATEST(0, COALESCE(support_count, 0) - 1)
    WHERE id = p_report_id
    RETURNING support_count INTO v_new_count;
    v_voted := false;
  ELSE
    -- Pas encore voté → toggle on
    INSERT INTO public.report_support_votes (report_id, user_id)
    VALUES (p_report_id, v_user_id)
    ON CONFLICT (report_id, user_id) DO NOTHING;

    UPDATE public.reports SET support_count = COALESCE(support_count, 0) + 1
    WHERE id = p_report_id
    RETURNING support_count INTO v_new_count;
    v_voted := true;
  END IF;

  RETURN jsonb_build_object(
    'voted',         v_voted,
    'support_count', v_new_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.vote_infrastructure_support(uuid) TO authenticated;

-- 4. RPC : Récupérer mes votes d'infrastructure
CREATE OR REPLACE FUNCTION public.get_my_infrastructure_votes()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(ARRAY_AGG(report_id), '{}'::uuid[])
  FROM public.report_support_votes
  WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_infrastructure_votes() TO authenticated;

-- 5. RPC : Confirmation de réparation avec préservation du GPS pour les infrastructures
CREATE OR REPLACE FUNCTION public.confirm_repair(p_report_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id  uuid;
  v_new_count  integer;
  v_is_infra   boolean;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.reports
    WHERE id = p_report_id AND status = 'active' AND validated = true
  ) THEN
    RAISE EXCEPTION 'Impossible de confirmer la réparation de ce signalement.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.repair_confirmations
    WHERE report_id = p_report_id AND user_id = v_caller_id
  ) THEN
    RAISE EXCEPTION 'Vous avez déjà confirmé la réparation.';
  END IF;

  INSERT INTO public.repair_confirmations (report_id, user_id)
  VALUES (p_report_id, v_caller_id)
  ON CONFLICT (report_id, user_id) DO NOTHING;

  UPDATE public.reports
  SET repair_verifications = COALESCE(repair_verifications, 0) + 1
  WHERE id = p_report_id
  RETURNING repair_verifications INTO v_new_count;

  -- Résolution automatique dès 3 confirmations citoyennes
  IF v_new_count >= 3 THEN
    SELECT (report_category = 'infrastructure' OR service_type IN ('mairie', 'voirie'))
    INTO v_is_infra
    FROM public.reports WHERE id = p_report_id;

    UPDATE public.reports 
    SET status = 'resolved', 
        resolved_at = now(),
        updated_at = now(),
        latitude = CASE WHEN v_is_infra THEN latitude ELSE NULL END,
        longitude = CASE WHEN v_is_infra THEN longitude ELSE NULL END
    WHERE id = p_report_id;
    
    DELETE FROM public.notifications
    WHERE report_id = p_report_id AND read = false AND title = 'Coupure signalée dans votre quartier';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_repair(uuid) TO authenticated;

-- 6. RPC : Annulation de confirmation de réparation
CREATE OR REPLACE FUNCTION public.cancel_repair(p_report_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.repair_confirmations
    WHERE report_id = p_report_id AND user_id = v_caller_id
  ) THEN
    RAISE EXCEPTION 'Aucune confirmation à annuler.';
  END IF;

  DELETE FROM public.repair_confirmations
  WHERE report_id = p_report_id AND user_id = v_caller_id;

  UPDATE public.reports
  SET repair_verifications = GREATEST(0, COALESCE(repair_verifications, 0) - 1)
  WHERE id = p_report_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_repair(uuid) TO authenticated;

-- 7. Rétro-classification des lampadaires, voirie et canalisations en infrastructure
UPDATE public.reports
SET report_category = 'infrastructure'
WHERE (report_category IS NULL OR report_category = 'outage')
  AND (
    service_type IN ('mairie', 'voirie')
    OR description ILIKE '%lampadaire%'
    OR description ILIKE '%éclairage%'
    OR description ILIKE '%eclairage%'
    OR description ILIKE '%poteau%'
    OR description ILIKE '%caniveau%'
    OR description ILIKE '%nid de poule%'
    OR description ILIKE '%fuite%'
  );

-- 8. Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_report_support_votes_report_user
ON public.report_support_votes (report_id, user_id);

CREATE INDEX IF NOT EXISTS idx_reports_category_status_created
ON public.reports (report_category, status, created_at DESC);
