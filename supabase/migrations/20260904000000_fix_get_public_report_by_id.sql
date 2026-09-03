-- Migration: Fix get_public_report_by_id to allow viewing any public infrastructure or outage report by ID
-- Date: 2026-09-04

BEGIN;

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
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_report_by_id(uuid) TO anon, authenticated, service_role;

COMMIT;
