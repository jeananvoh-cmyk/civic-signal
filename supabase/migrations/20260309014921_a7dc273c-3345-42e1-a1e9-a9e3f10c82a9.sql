-- Insert new pilot communes: Koumassi and Port-Bouët (Abidjan Sud)
INSERT INTO public.communes (nom, center_lat, center_lon, rayon_m, population, couleur)
VALUES
  ('Koumassi',   5.3050, -3.9950, 4000,  428020, '#EC4899'),
  ('Port-Bouët', 5.2600, -3.9300, 7000,  365006, '#F97316')
ON CONFLICT (nom) DO UPDATE SET
  center_lat = EXCLUDED.center_lat,
  center_lon = EXCLUDED.center_lon,
  rayon_m    = EXCLUDED.rayon_m,
  population = EXCLUDED.population,
  couleur    = EXCLUDED.couleur;