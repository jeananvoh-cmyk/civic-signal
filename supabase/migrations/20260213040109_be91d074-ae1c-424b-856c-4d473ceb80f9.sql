
-- Table des 5 communes pilotes
CREATE TABLE public.communes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL UNIQUE,
  center_lat double precision NOT NULL,
  center_lon double precision NOT NULL,
  rayon_m integer NOT NULL DEFAULT 5000,
  population integer NOT NULL DEFAULT 0,
  couleur text NOT NULL DEFAULT '#888888',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.communes ENABLE ROW LEVEL SECURITY;

-- Lecture publique pour tous les utilisateurs authentifiés
CREATE POLICY "Authenticated users can read communes"
  ON public.communes FOR SELECT
  TO authenticated
  USING (true);

-- Seuls les admins peuvent modifier
CREATE POLICY "Admins can manage communes"
  ON public.communes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Insérer les 5 communes pilotes
INSERT INTO public.communes (nom, center_lat, center_lon, rayon_m, population, couleur) VALUES
  ('Yopougon',    5.3500, -4.0833, 8000, 1200000, '#DC2626'),
  ('Cocody',      5.3667, -3.9833, 6000,  300000, '#10B981'),
  ('Abobo',       5.4167, -4.0167, 5000,  850000, '#3B82F6'),
  ('Adjamé',      5.3500, -4.0167, 3000,  150000, '#F59E0B'),
  ('Bingerville', 5.4000, -3.8833, 7000,   80000, '#8B5CF6');

-- Fonction pour trouver la commune la plus proche d'un point GPS
CREATE OR REPLACE FUNCTION public.find_nearest_commune(p_lat double precision, p_lon double precision)
RETURNS TABLE(nom text, couleur text, distance_km double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT 
    c.nom, 
    c.couleur,
    (6371 * acos(
      cos(radians(p_lat)) * cos(radians(c.center_lat)) *
      cos(radians(c.center_lon) - radians(p_lon)) +
      sin(radians(p_lat)) * sin(radians(c.center_lat))
    )) as distance_km
  FROM public.communes c
  ORDER BY distance_km ASC
  LIMIT 1;
$$;

-- Fonction stats par commune
CREATE OR REPLACE FUNCTION public.get_commune_stats()
RETURNS TABLE(commune text, couleur text, actifs bigint, resolus bigint, total bigint, population integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT 
    c.nom as commune,
    c.couleur,
    COUNT(r.id) FILTER (WHERE r.status = 'active') as actifs,
    COUNT(r.id) FILTER (WHERE r.status = 'resolved') as resolus,
    COUNT(r.id) as total,
    c.population
  FROM public.communes c
  LEFT JOIN public.reports r ON LOWER(r.commune) = LOWER(c.nom) AND r.validated = true
  GROUP BY c.nom, c.couleur, c.population
  ORDER BY actifs DESC;
$$;

-- Fonction pour trouver les signalements proches (vérification communautaire)
CREATE OR REPLACE FUNCTION public.get_nearby_reports(p_lat double precision, p_lon double precision, p_rayon_m double precision DEFAULT 200)
RETURNS TABLE(
  id uuid, service_type text, description text, commune text, 
  distance_m double precision, nb_verifications integer, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT 
    r.id, r.service_type, LEFT(r.description, 100), r.commune,
    (6371000 * acos(
      cos(radians(p_lat)) * cos(radians(r.latitude)) *
      cos(radians(r.longitude) - radians(p_lon)) +
      sin(radians(p_lat)) * sin(radians(r.latitude))
    )) as distance_m,
    r.verifications as nb_verifications,
    r.created_at
  FROM public.reports r
  WHERE r.status = 'active' 
    AND r.latitude IS NOT NULL 
    AND r.longitude IS NOT NULL
    AND r.validated = true
    AND (6371000 * acos(
      cos(radians(p_lat)) * cos(radians(r.latitude)) *
      cos(radians(r.longitude) - radians(p_lon)) +
      sin(radians(p_lat)) * sin(radians(r.latitude))
    )) <= p_rayon_m
  ORDER BY distance_m ASC
  LIMIT 20;
$$;

-- Fonction pour corroborer un signalement
CREATE OR REPLACE FUNCTION public.corroborate_report(p_report_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.reports 
  SET verifications = verifications + 1
  WHERE id = p_report_id AND status = 'active';
END;
$$;
