-- ─── 1. Contraintes CHECK sur la table reports ────────────────────────────────
-- Empêche l'injection de valeurs aberrantes côté client ou via API directe.
-- Ex: "1000 bébés", impacted_people négatif, etc.

ALTER TABLE public.reports
  ADD CONSTRAINT reports_impacted_people_range
    CHECK (impacted_people IS NULL OR (impacted_people >= 1 AND impacted_people <= 200)),
  ADD CONSTRAINT reports_babies_range
    CHECK (babies IS NULL OR (babies >= 0 AND babies <= 100)),
  ADD CONSTRAINT reports_pregnant_range
    CHECK (pregnant IS NULL OR (pregnant >= 0 AND pregnant <= 100)),
  ADD CONSTRAINT reports_elderly_range
    CHECK (elderly IS NULL OR (elderly >= 0 AND elderly <= 100)),
  ADD CONSTRAINT reports_vuln_not_exceed_total
    CHECK (
      impacted_people IS NULL
      OR (COALESCE(babies, 0) + COALESCE(pregnant, 0) + COALESCE(elderly, 0)) <= impacted_people
    ),
  ADD CONSTRAINT reports_description_length
    CHECK (description IS NULL OR char_length(description) <= 500);

-- ─── 2. Limite quotidienne côté serveur ──────────────────────────────────────
-- Trigger qui bloque l'insertion si l'utilisateur dépasse DAILY_REPORT_LIMIT.
-- Complète (et remplace si contourné) la vérification côté client.

CREATE OR REPLACE FUNCTION public.enforce_daily_report_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count int;
  v_limit int := 5;
BEGIN
  -- Les comptes test et admin (role = 'test' | 'admin') sont exemptés
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.user_id
      AND role IN ('admin', 'test')
  ) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.reports
  WHERE user_id = NEW.user_id
    AND created_at >= NOW() - INTERVAL '24 hours';

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'daily_limit_exceeded'
      USING HINT = 'Maximum 5 signalements par 24h';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_daily_limit ON public.reports;

CREATE TRIGGER trg_enforce_daily_limit
  BEFORE INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_daily_report_limit();

-- ─── 3. Fonction agrégée quartiers (toutes communes en 1 requête) ─────────────
-- Remplace les 7 appels séparés à get_commune_quartier_stats dans DashboardPage.

DROP FUNCTION IF EXISTS public.get_all_commune_quartier_stats();

CREATE OR REPLACE FUNCTION public.get_all_commune_quartier_stats()
RETURNS TABLE(
  commune         text,
  quartier        text,
  electricite_actifs  bigint,
  electricite_resolus bigint,
  electricite_total   bigint,
  eau_actifs          bigint,
  eau_resolus         bigint,
  eau_total           bigint,
  mairie_actifs       bigint,
  mairie_resolus      bigint,
  mairie_total        bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.commune,
    r.quartier,
    COUNT(*) FILTER (WHERE r.service_type = 'electricity' AND r.status = 'active')   AS electricite_actifs,
    COUNT(*) FILTER (WHERE r.service_type = 'electricity' AND r.status = 'resolved') AS electricite_resolus,
    COUNT(*) FILTER (WHERE r.service_type = 'electricity')                           AS electricite_total,
    COUNT(*) FILTER (WHERE r.service_type = 'water'       AND r.status = 'active')   AS eau_actifs,
    COUNT(*) FILTER (WHERE r.service_type = 'water'       AND r.status = 'resolved') AS eau_resolus,
    COUNT(*) FILTER (WHERE r.service_type = 'water')                                 AS eau_total,
    COUNT(*) FILTER (WHERE r.service_type = 'mairie'      AND r.status = 'active')   AS mairie_actifs,
    COUNT(*) FILTER (WHERE r.service_type = 'mairie'      AND r.status = 'resolved') AS mairie_resolus,
    COUNT(*) FILTER (WHERE r.service_type = 'mairie')                                AS mairie_total
  FROM reports r
  WHERE r.validated = true
    AND r.quartier <> ''
    AND r.commune IN (
      'Abobo','Adjamé','Bingerville','Cocody','Koumassi','Port-Bouët','Yopougon'
    )
  GROUP BY r.commune, r.quartier
  ORDER BY r.commune, (COUNT(*) FILTER (WHERE r.status = 'active')) DESC;
END;
$$;

-- Accès public en lecture (même politique que get_commune_quartier_stats)
GRANT EXECUTE ON FUNCTION public.get_all_commune_quartier_stats() TO anon, authenticated;
