-- Restrict the public report-by-ID RPC to validated reports.
-- Owners may still retrieve their own unvalidated report.
-- Sensitive household vulnerability counts and internal operator notes/references
-- are not disclosed to anonymous or non-owner callers.

BEGIN;

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
    CASE WHEN auth.uid() = r.user_id THEN r.user_id ELSE NULL::uuid END,
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
    CASE WHEN auth.uid() = r.user_id THEN r.babies ELSE NULL::integer END,
    CASE WHEN auth.uid() = r.user_id THEN r.pregnant ELSE NULL::integer END,
    CASE WHEN auth.uid() = r.user_id THEN r.elderly ELSE NULL::integer END,
    r.operator_name,
    NULL::text,
    r.estimated_resolution_time,
    NULL::text,
    public.public_shift_coordinate(r.id, r.latitude, 'lat') AS latitude,
    public.public_shift_coordinate(r.id, r.longitude, 'lon') AS longitude
  FROM public.reports r
  WHERE r.id = p_report_id
    AND (r.validated IS TRUE OR auth.uid() = r.user_id)
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_report_by_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_report_by_id(uuid) TO anon, authenticated, service_role;

COMMIT;
