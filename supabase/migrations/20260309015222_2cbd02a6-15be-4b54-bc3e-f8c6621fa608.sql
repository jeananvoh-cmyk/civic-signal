-- Synchroniser les populations des communes existantes avec les données officielles
UPDATE public.communes SET population = 1400000 WHERE nom = 'Abobo';
UPDATE public.communes SET population = 422000 WHERE nom = 'Adjamé';
UPDATE public.communes SET population = 115000 WHERE nom = 'Bingerville';
UPDATE public.communes SET population = 447055 WHERE nom = 'Cocody';
UPDATE public.communes SET population = 1571065 WHERE nom = 'Yopougon';

-- Insérer les quartiers validés pour Koumassi
INSERT INTO public.quartiers (commune, nom, validated, source) VALUES
  ('Koumassi', 'Biétry', true, 'static'),
  ('Koumassi', 'Camp Commun', true, 'static'),
  ('Koumassi', 'Cité Verte', true, 'static'),
  ('Koumassi', 'Compagnie', true, 'static'),
  ('Koumassi', 'Dépôt', true, 'static'),
  ('Koumassi', 'Koweit', true, 'static'),
  ('Koumassi', 'Koumassi Campement', true, 'static'),
  ('Koumassi', 'Koumassi Extension', true, 'static'),
  ('Koumassi', 'Koumassi Remblai', true, 'static'),
  ('Koumassi', 'Lauriers', true, 'static'),
  ('Koumassi', 'Mairie', true, 'static'),
  ('Koumassi', 'Mosquée', true, 'static'),
  ('Koumassi', 'Orly', true, 'static'),
  ('Koumassi', 'Port Bouët II', true, 'static'),
  ('Koumassi', 'Résidentiel', true, 'static'),
  ('Koumassi', 'Sagbé', true, 'static'),
  ('Koumassi', 'Samaké', true, 'static'),
  ('Koumassi', 'Terminus', true, 'static')
ON CONFLICT (commune, nom) DO NOTHING;

-- Insérer les quartiers validés pour Port-Bouët
INSERT INTO public.quartiers (commune, nom, validated, source) VALUES
  ('Port-Bouët', 'Aéroport', true, 'static'),
  ('Port-Bouët', 'Adjouffou', true, 'static'),
  ('Port-Bouët', 'Anani', true, 'static'),
  ('Port-Bouët', 'Attécoubé', true, 'static'),
  ('Port-Bouët', 'Avocatier', true, 'static'),
  ('Port-Bouët', 'Banco 1', true, 'static'),
  ('Port-Bouët', 'Biétry II', true, 'static'),
  ('Port-Bouët', 'Gonzagueville', true, 'static'),
  ('Port-Bouët', 'Grand Bassam Route', true, 'static'),
  ('Port-Bouët', 'Houphouët-Boigny', true, 'static'),
  ('Port-Bouët', 'Ile de Boulay', true, 'static'),
  ('Port-Bouët', 'Kennedy', true, 'static'),
  ('Port-Bouët', 'Koumassi', true, 'static'),
  ('Port-Bouët', 'Marcory', true, 'static'),
  ('Port-Bouët', 'Mokotowé', true, 'static'),
  ('Port-Bouët', 'N''dotré', true, 'static'),
  ('Port-Bouët', 'Port-Bouët Village', true, 'static'),
  ('Port-Bouët', 'Quartier Français', true, 'static'),
  ('Port-Bouët', 'Vridi', true, 'static'),
  ('Port-Bouët', 'Vridi Canal', true, 'static'),
  ('Port-Bouët', 'Vridi plage', true, 'static')
ON CONFLICT (commune, nom) DO NOTHING;