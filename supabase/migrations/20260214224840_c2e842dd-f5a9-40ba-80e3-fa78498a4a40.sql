
-- Function to get average outage duration per commune
CREATE OR REPLACE FUNCTION public.get_commune_duration_stats()
RETURNS TABLE(
  commune text,
  couleur text,
  avg_duration_minutes double precision,
  total_resolved bigint,
  total_active bigint,
  longest_duration_minutes double precision
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    c.nom AS commune,
    c.couleur,
    COALESCE(
      AVG(EXTRACT(EPOCH FROM (r.resolved_at - r.start_time)) / 60) 
      FILTER (WHERE r.status = 'resolved' AND r.resolved_at IS NOT NULL),
      0
    ) AS avg_duration_minutes,
    COUNT(r.id) FILTER (WHERE r.status = 'resolved') AS total_resolved,
    COUNT(r.id) FILTER (WHERE r.status = 'active') AS total_active,
    COALESCE(
      MAX(EXTRACT(EPOCH FROM (r.resolved_at - r.start_time)) / 60) 
      FILTER (WHERE r.status = 'resolved' AND r.resolved_at IS NOT NULL),
      0
    ) AS longest_duration_minutes
  FROM communes c
  LEFT JOIN reports r ON LOWER(r.commune) = LOWER(c.nom) AND r.validated = true
  GROUP BY c.nom, c.couleur
  ORDER BY avg_duration_minutes DESC;
$$;

-- Make report-photos bucket public for displaying photos
UPDATE storage.buckets SET public = true WHERE id = 'report-photos';

-- Add view policy if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view report photos' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Anyone can view report photos"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'report-photos');
  END IF;
END $$;
