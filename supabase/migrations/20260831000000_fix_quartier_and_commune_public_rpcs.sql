-- Migration: Corriger get_commune_quartier_stats et ajouter get_public_commune_reports
-- Permet à tout citoyen (connecté ou anonyme) d'accéder aux coupures réelles et de visualiser le quartier exact.

BEGIN;

-- 1. Fonction RPC publique pour récupérer les signalements d'une commune sans blocage RLS
DROP FUNCTION IF EXISTS public.get_public_commune_reports(text, integer);
CREATE OR REPLACE FUNCTION public.get_public_commune_reports(
  p_commune text,
  p_limit integer DEFAULT 50
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
  reporter_type text,
  start_time timestamptz,
  verifications integer,
  created_at timestamptz,
  resolved_at timestamptz,
  ticket_code text,
  latitude double precision,
  longitude double precision
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
    left(r.description, 160) AS description,
    r.location,
    r.commune,
    r.quartier,
    r.status,
    r.urgency,
    r.reporter_type,
    r.start_time,
    r.verifications,
    r.created_at,
    r.resolved_at,
    r.ticket_code,
    public.public_shift_coordinate(r.id, r.latitude, 'lat') AS latitude,
    public.public_shift_coordinate(r.id, r.longitude, 'lon') AS longitude
  FROM public.reports r
  WHERE r.validated = true
    AND (
      LOWER(r.commune) = LOWER(p_commune)
      OR r.location ILIKE '%' || p_commune || '%'
    )
  ORDER BY r.created_at DESC
  LIMIT least(greatest(p_limit, 1), 100);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_commune_reports(text, integer) TO anon, authenticated, service_role;

-- 2. Mise à jour de get_commune_quartier_stats pour inclure TOUS les signalements sans les filtrer
DROP FUNCTION IF EXISTS public.get_commune_quartier_stats(text);
CREATE OR REPLACE FUNCTION public.get_commune_quartier_stats(p_commune text)
RETURNS TABLE(
  quartier text, 
  electricite_actifs bigint, 
  electricite_resolus bigint, 
  electricite_total bigint, 
  eau_actifs bigint, 
  eau_resolus bigint, 
  eau_total bigint,
  mairie_actifs bigint,
  mairie_resolus bigint,
  mairie_total bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_commune IS NULL OR LENGTH(p_commune) < 1 OR LENGTH(p_commune) > 100 THEN
    RAISE EXCEPTION 'Invalid commune name';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(
      NULLIF(TRIM(r.quartier), ''),
      CASE 
        WHEN r.location ILIKE '%Plateau Dokui%' THEN 'Plateau Dokui'
        WHEN r.location ILIKE '%Avocatier%' THEN 'Abobo Avocatier'
        WHEN r.location ILIKE '%PK 18%' OR r.location ILIKE '%PK18%' THEN 'PK 18'
        WHEN r.location ILIKE '%Abobo-Té%' OR r.location ILIKE '%Abobo Té%' THEN 'Abobo Abobo-Té'
        WHEN r.location ILIKE '%Baoulé%' THEN 'Abobo Baoulé'
        WHEN r.location ILIKE '%Anonkoua%' THEN 'Abobo Anonkoua Kouté'
        WHEN r.location ILIKE '%Bocabo%' THEN 'Bocabo'
        WHEN r.location ILIKE '%Kennedy%' THEN 'Kennedy'
        WHEN r.location ILIKE '%Sogefiha%' THEN 'Sogefiha'
        WHEN r.location ILIKE '%Belleville%' THEN 'Belleville'
        ELSE p_commune || ' (Centre / Secteur général)'
      END
    ) AS quartier,
    COUNT(*) FILTER (WHERE r.service_type = 'electricity' AND (r.report_category = 'outage' OR r.report_category IS NULL) AND r.status IN ('active', 'chronic', 'in_progress', 'open', 'verified')) AS electricite_actifs,
    COUNT(*) FILTER (WHERE r.service_type = 'electricity' AND (r.report_category = 'outage' OR r.report_category IS NULL) AND r.status = 'resolved') AS electricite_resolus,
    COUNT(*) FILTER (WHERE r.service_type = 'electricity' AND (r.report_category = 'outage' OR r.report_category IS NULL)) AS electricite_total,
    
    COUNT(*) FILTER (WHERE r.service_type = 'water' AND (r.report_category = 'outage' OR r.report_category IS NULL) AND r.status IN ('active', 'chronic', 'in_progress', 'open', 'verified')) AS eau_actifs,
    COUNT(*) FILTER (WHERE r.service_type = 'water' AND (r.report_category = 'outage' OR r.report_category IS NULL) AND r.status = 'resolved') AS eau_resolus,
    COUNT(*) FILTER (WHERE r.service_type = 'water' AND (r.report_category = 'outage' OR r.report_category IS NULL)) AS eau_total,
    
    COUNT(*) FILTER (WHERE (r.service_type IN ('mairie', 'voirie') OR r.report_category = 'infrastructure') AND r.status IN ('active', 'chronic', 'in_progress', 'open', 'verified')) AS mairie_actifs,
    COUNT(*) FILTER (WHERE (r.service_type IN ('mairie', 'voirie') OR r.report_category = 'infrastructure') AND r.status = 'resolved') AS mairie_resolus,
    COUNT(*) FILTER (WHERE (r.service_type IN ('mairie', 'voirie') OR r.report_category = 'infrastructure')) AS mairie_total
  FROM reports r
  WHERE (LOWER(r.commune) = LOWER(p_commune) OR r.location ILIKE '%' || p_commune || '%')
    AND r.validated = true
  GROUP BY 1
  ORDER BY 2 DESC, 5 DESC, 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_commune_quartier_stats(text) TO anon, authenticated, service_role;

-- 3. Fonction RPC publique pour récupérer un signalement individuel par son ID
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
  longitude double precision
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
    public.public_shift_coordinate(r.id, r.latitude, 'lat') AS latitude,
    public.public_shift_coordinate(r.id, r.longitude, 'lon') AS longitude
  FROM public.reports r
  WHERE r.id = p_report_id
    AND r.validated = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_report_by_id(uuid) TO anon, authenticated, service_role;

-- 4. Politique de lecture publique des signalements validés
DROP POLICY IF EXISTS "Public can view validated reports" ON public.reports;
CREATE POLICY "Public can view validated reports" ON public.reports
  FOR SELECT TO public
  USING (validated = true);

COMMIT;

