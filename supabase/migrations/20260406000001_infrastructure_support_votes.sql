-- Modèle FixMyStreet : vote citoyen pour prioriser les réparations infrastructure
-- Séparé du système de corroboration (réservé aux coupures)

-- 1. Table des votes de soutien infrastructure
CREATE TABLE IF NOT EXISTS public.report_support_votes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_id, user_id)  -- un vote par citoyen par signalement
);

ALTER TABLE public.report_support_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own support votes"
  ON public.report_support_votes FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can insert support votes"
  ON public.report_support_votes FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own support votes"
  ON public.report_support_votes FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- 2. Colonne support_count sur reports (compteur dénormalisé)
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS support_count integer NOT NULL DEFAULT 0;

-- 3. RPC : voter pour une réparation rapide (toggle)
CREATE OR REPLACE FUNCTION public.vote_infrastructure_support(p_report_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  uuid := auth.uid();
  v_existing uuid;
  v_new_count integer;
  v_voted    boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Connexion requise pour voter');
  END IF;

  -- Vérifier que c'est bien un signalement infrastructure
  IF NOT EXISTS (
    SELECT 1 FROM public.reports
    WHERE id = p_report_id AND report_category = 'infrastructure'
  ) THEN
    RETURN jsonb_build_object('error', 'Signalement introuvable');
  END IF;

  -- Vérifier si déjà voté
  SELECT id INTO v_existing
  FROM public.report_support_votes
  WHERE report_id = p_report_id AND user_id = v_user_id;

  IF v_existing IS NOT NULL THEN
    -- Déjà voté → retirer le vote (toggle)
    DELETE FROM public.report_support_votes WHERE id = v_existing;
    UPDATE public.reports SET support_count = GREATEST(0, support_count - 1)
    WHERE id = p_report_id
    RETURNING support_count INTO v_new_count;
    v_voted := false;
  ELSE
    -- Pas encore voté → ajouter le vote
    INSERT INTO public.report_support_votes (report_id, user_id)
    VALUES (p_report_id, v_user_id);
    UPDATE public.reports SET support_count = support_count + 1
    WHERE id = p_report_id
    RETURNING support_count INTO v_new_count;
    v_voted := true;
  END IF;

  RETURN jsonb_build_object(
    'voted',        v_voted,
    'support_count', v_new_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.vote_infrastructure_support TO authenticated;

-- 4. RPC : récupérer les votes du citoyen connecté (pour pré-cocher les boutons)
CREATE OR REPLACE FUNCTION public.get_my_infrastructure_votes()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY_AGG(report_id)
  FROM public.report_support_votes
  WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_infrastructure_votes TO authenticated;

-- 5. Mettre à jour la RPC publique pour inclure support_count
CREATE OR REPLACE FUNCTION public.get_public_infrastructure_reports(
  p_commune   text    DEFAULT NULL,
  p_limit     integer DEFAULT 50,
  p_offset    integer DEFAULT 0
)
RETURNS TABLE (
  id                   uuid,
  service_type         text,
  description          text,
  location             text,
  commune              text,
  quartier             text,
  status               text,
  urgency              text,
  created_at           timestamptz,
  photo_url            text,
  photo_urls           text[],
  verifications        integer,
  repair_verifications integer,
  support_count        integer,
  reporter_type        text,
  latitude_approx      numeric,
  longitude_approx     numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id, service_type, description, location, commune, quartier,
    status, urgency, created_at, photo_url, photo_urls,
    verifications, repair_verifications, support_count, reporter_type,
    ROUND(latitude::numeric,  3) AS latitude_approx,
    ROUND(longitude::numeric, 3) AS longitude_approx
  FROM public.reports
  WHERE report_category = 'infrastructure'
    AND status = 'active'
    AND (p_commune IS NULL OR commune ILIKE p_commune)
  ORDER BY support_count DESC, created_at DESC
  LIMIT  p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_infrastructure_reports TO anon, authenticated;
