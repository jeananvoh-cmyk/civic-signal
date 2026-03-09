-- Synchroniser les rayons des communes avec le code source
UPDATE public.communes SET rayon_m = 2000 WHERE nom = 'Adjamé';
UPDATE public.communes SET rayon_m = 6500 WHERE nom = 'Cocody';
UPDATE public.communes SET rayon_m = 6300 WHERE nom = 'Bingerville';