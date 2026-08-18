-- ─── SEED QUARTIERS OFFICIELS DES 14 COMMUNES DU GRAND ABIDJAN ────────────────
-- Ajout des quartiers canoniques pour les 7 nouvelles communes :
-- Marcory, Plateau, Treichville, Attécoubé, Anyama, Songon, Grand-Bassam

INSERT INTO public.quartiers (commune, nom, validated, source) VALUES
-- Marcory
('Marcory', 'Anoumabo', true, 'static'),
('Marcory', 'Biétry', true, 'static'),
('Marcory', 'Champroux', true, 'static'),
('Marcory', 'GFCI', true, 'static'),
('Marcory', 'Hibiscus', true, 'static'),
('Marcory', 'INJS', true, 'static'),
('Marcory', 'Konankro', true, 'static'),
('Marcory', 'Marcory Résidentiel', true, 'static'),
('Marcory', 'Sainte-Thérèse', true, 'static'),
('Marcory', 'Sicogi', true, 'static'),
('Marcory', 'Zone 4', true, 'static'),
('Marcory', 'Zone 4C', true, 'static'),

-- Plateau
('Plateau', 'Cité Administrative', true, 'static'),
('Plateau', 'Commerce', true, 'static'),
('Plateau', 'Immeuble CCIA', true, 'static'),
('Plateau', 'Indénié', true, 'static'),
('Plateau', 'Ministères', true, 'static'),
('Plateau', 'Parc National du Banco', true, 'static'),
('Plateau', 'Pyramide', true, 'static'),
('Plateau', 'Quartier des Affaires', true, 'static'),
('Plateau', 'Stade Félix Houphouët-Boigny', true, 'static'),

-- Treichville
('Treichville', 'Avenue 1 à 25', true, 'static'),
('Treichville', 'Arras', true, 'static'),
('Treichville', 'Belleville', true, 'static'),
('Treichville', 'Biafra', true, 'static'),
('Treichville', 'Centre Commercial', true, 'static'),
('Treichville', 'Gare de Bassam', true, 'static'),
('Treichville', 'Habitat', true, 'static'),
('Treichville', 'Hôpital Général', true, 'static'),
('Treichville', 'Marcory 2', true, 'static'),
('Treichville', 'Palais des Sports', true, 'static'),
('Treichville', 'Port Autonome', true, 'static'),
('Treichville', 'Zone 3', true, 'static'),

-- Attécoubé
('Attécoubé', 'Abobo-Doumé', true, 'static'),
('Attécoubé', 'Agban Attié', true, 'static'),
('Attécoubé', 'Agban Village', true, 'static'),
('Attécoubé', 'Bidjante', true, 'static'),
('Attécoubé', 'Boribana', true, 'static'),
('Attécoubé', 'Cité Fairmont', true, 'static'),
('Attécoubé', 'Déconsignation', true, 'static'),
('Attécoubé', 'Fromager', true, 'static'),
('Attécoubé', 'Jérusalem', true, 'static'),
('Attécoubé', 'Locodjro', true, 'static'),
('Attécoubé', 'Santai', true, 'static'),
('Attécoubé', 'Seba', true, 'static'),
('Attécoubé', 'Zone Industrielle', true, 'static'),

-- Anyama
('Anyama', 'Anyama-Ahouabo', true, 'static'),
('Anyama', 'Anyama-Adjamé', true, 'static'),
('Anyama', 'Belle-Ville', true, 'static'),
('Anyama', 'Cité Concorde', true, 'static'),
('Anyama', 'Gare', true, 'static'),
('Anyama', 'Hôpital d''Anyama', true, 'static'),
('Anyama', 'Quartier Résidentiel', true, 'static'),
('Anyama', 'Stade Ebimpé', true, 'static'),
('Anyama', 'Zossonkoi', true, 'static'),

-- Songon
('Songon', 'Abiaté', true, 'static'),
('Songon', 'Bimbresso', true, 'static'),
('Songon', 'Gare Songon', true, 'static'),
('Songon', 'Kassemblé', true, 'static'),
('Songon', 'Songon Agban', true, 'static'),
('Songon', 'Songon Dagbé', true, 'static'),
('Songon', 'Songon Kassemblé', true, 'static'),
('Songon', 'Songon M''brathé', true, 'static'),
('Songon', 'Songon Park', true, 'static'),

-- Grand-Bassam
('Grand-Bassam', 'Ancien Bassam', true, 'static'),
('Grand-Bassam', 'Azuretti', true, 'static'),
('Grand-Bassam', 'Caféier', true, 'static'),
('Grand-Bassam', 'Cité Impériale', true, 'static'),
('Grand-Bassam', 'France', true, 'static'),
('Grand-Bassam', 'Moossou', true, 'static'),
('Grand-Bassam', 'Mockeyville', true, 'static'),
('Grand-Bassam', 'Phare', true, 'static'),
('Grand-Bassam', 'Quartier Artisanal', true, 'static'),
('Grand-Bassam', 'Rosiers', true, 'static'),
('Grand-Bassam', 'Zone Hôtelière', true, 'static')
ON CONFLICT (commune, nom) DO NOTHING;
