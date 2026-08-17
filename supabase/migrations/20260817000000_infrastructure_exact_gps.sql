-- ── Migration : Coordonnées Précises pour les Infrastructures Publiques ────────
-- Les infrastructures (voirie, lampadaires, caniveaux) situées sur la voie publique
-- nécessitent des coordonnées GPS exactes pour permettre la localisation et la vérification citoyenne.
-- Les coupures d'eau/électricité à domicile restent floutées/agrégées pour protéger la vie privée des signaleurs.

DROP FUNCTION IF EXISTS public.get_public_infrastructure_reports();
DROP FUNCTION IF EXISTS public.get_public_infrastructure_reports(text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_public_infrastructure_reports(
  p_commune   text    DEFAULT NULL,
  p_limit     integer DEFAULT 100,
  p_offset    integer DEFAULT 0
)
RETURNS TABLE (
  id                   uuid,
  service_type         text,
  report_category      text,
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
  impacted_people      integer,
  reporter_type        text,
  latitude             double precision,
  longitude            double precision
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
    photo_url,
    photo_urls,
    verifications,
    repair_verifications,
    support_count,
    impacted_people,
    reporter_type,
    latitude::double precision AS latitude,
    longitude::double precision AS longitude
  FROM public.reports
  WHERE report_category = 'infrastructure'
    AND status IN ('active', 'chronic', 'in_progress', 'open', 'verified')
    AND (p_commune IS NULL OR commune ILIKE p_commune)
  ORDER BY created_at DESC
  LIMIT  p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_infrastructure_reports TO anon, authenticated;
