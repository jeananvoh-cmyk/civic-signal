-- Migration: Restauration de l'accès public aux photos de signalements d'infrastructures
-- Date: 2026-09-03
-- Description: Les photos de voirie, éclairage, caniveaux et pannes publiques sont des preuves d'intérêt général (sans PADA/compteurs).

BEGIN;

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
  estimated_resolution_time timestamptz
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
    NULL::text,
    NULL::text,
    r.estimated_resolution_time 
  FROM public.reports r 
  WHERE r.validated = true 
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

COMMIT;
