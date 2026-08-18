-- ══════════════════════════════════════════════════════════════════════════════
-- NETTOYAGE, DÉDOUBLONNAGE ET SYNCHRONISATION DU RÉFÉRENTIEL PADA
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Nettoyage préventif des espaces superflus et normalisation de la casse
UPDATE public.quartiers 
SET nom = trim(regexp_replace(nom, '\s+', ' ', 'g'))
WHERE nom IS NOT NULL;

-- 2. Suppression des doublons stricts (même commune + même nom insensible aux majuscules)
-- Ne conserve que l'identifiant le plus ancien / validé
DELETE FROM public.quartiers a
USING public.quartiers b
WHERE a.id > b.id
  AND lower(trim(a.commune)) = lower(trim(b.commune))
  AND lower(trim(a.nom)) = lower(trim(b.nom));

-- 3. Ajout / Mise à jour des quartiers officiels PADA des 14 Communes
INSERT INTO public.quartiers (commune, nom, validated, hidden, source) VALUES
-- Cocody
('Cocody', '150 Logements', true, false, 'pada'),
('Cocody', '1ere Tranche', true, false, 'pada'),
('Cocody', '2e Tranche', true, false, 'pada'),
('Cocody', '7e Tranche', true, false, 'pada'),
('Cocody', '8e Tranche', true, false, 'pada'),
('Cocody', '9e Tranche', true, false, 'pada'),
('Cocody', 'Adjamé Village', true, false, 'pada'),
('Cocody', 'Aghien', true, false, 'pada'),
('Cocody', 'Akouedo - Abatta Village', true, false, 'pada'),
('Cocody', 'Akouédo Extension Nord', true, false, 'pada'),
('Cocody', 'Ambassade', true, false, 'pada'),
('Cocody', 'Angré', true, false, 'pada'),
('Cocody', 'Angré Extension', true, false, 'pada'),
('Cocody', 'Anono Village', true, false, 'pada'),
('Cocody', 'ATCI', true, false, 'pada'),
('Cocody', 'Attoban', true, false, 'pada'),
('Cocody', 'Belle Ville', true, false, 'pada'),
('Cocody', 'Bessikoi - Djorogobité', true, false, 'pada'),
('Cocody', 'Blockauss', true, false, 'pada'),
('Cocody', 'CIAD Primo', true, false, 'pada'),
('Cocody', 'Cité des arts', true, false, 'pada'),
('Cocody', 'Cité EECI', true, false, 'pada'),
('Cocody', 'Cocody centre', true, false, 'pada'),
('Cocody', 'Cocody Village', true, false, 'pada'),
('Cocody', 'Colombie', true, false, 'pada'),
('Cocody', 'Commandant Sanon', true, false, 'pada'),
('Cocody', 'Danga Nord', true, false, 'pada'),
('Cocody', 'Danga Sud', true, false, 'pada'),
('Cocody', 'Deux Plateaux', true, false, 'pada'),
('Cocody', 'Djibi', true, false, 'pada'),
('Cocody', 'Dokui', true, false, 'pada'),
('Cocody', 'Djorogobité', true, false, 'pada'),
('Cocody', 'Ephrata', true, false, 'pada'),
('Cocody', 'Faya', true, false, 'pada'),
('Cocody', 'Jardin de la Riviera', true, false, 'pada'),
('Cocody', 'Le Vallon', true, false, 'pada'),
('Cocody', 'Les Perles', true, false, 'pada'),
('Cocody', 'Les Versants', true, false, 'pada'),
('Cocody', 'Mbadon - Akouédo', true, false, 'pada'),
('Cocody', 'Mpouto Village', true, false, 'pada'),
('Cocody', 'Nouveau Camp', true, false, 'pada'),
('Cocody', 'Palmeraie', true, false, 'pada'),
('Cocody', 'Palmeraie Triangle', true, false, 'pada'),
('Cocody', 'Riviera 2', true, false, 'pada'),
('Cocody', 'Riviera 3', true, false, 'pada'),
('Cocody', 'Riviera 4', true, false, 'pada'),
('Cocody', 'Riviera 5', true, false, 'pada'),
('Cocody', 'Riviera Allabra', true, false, 'pada'),
('Cocody', 'Riviera Bonoumin', true, false, 'pada'),
('Cocody', 'Riviera Golf', true, false, 'pada'),
('Cocody', 'Riviera Sideci', true, false, 'pada'),
('Cocody', 'RTI', true, false, 'pada'),
('Cocody', 'SICOGI', true, false, 'pada'),
('Cocody', 'SODEFOR', true, false, 'pada'),
('Cocody', 'SYNATRESOR', true, false, 'pada'),
('Cocody', 'TF 233', true, false, 'pada'),
('Cocody', 'Université', true, false, 'pada'),
('Cocody', 'Villa cadre', true, false, 'pada'),
('Cocody', 'Wedouwel', true, false, 'pada'),

-- Abobo
('Abobo', 'Abbé-Broukoi', true, false, 'pada'),
('Abobo', 'Abobo Baoulé', true, false, 'pada'),
('Abobo', 'Abobo Sud 1ère Tranche', true, false, 'pada'),
('Abobo', 'Abobo Sud 2ème Tranche', true, false, 'pada'),
('Abobo', 'Abobo Sud 3ème Tranche', true, false, 'pada'),
('Abobo', 'Agbékoi', true, false, 'pada'),
('Abobo', 'Agnissankoi', true, false, 'pada'),
('Abobo', 'Agriparc', true, false, 'pada'),
('Abobo', 'Akeikoi-Djibi', true, false, 'pada'),
('Abobo', 'Akeikoi Extension', true, false, 'pada'),
('Abobo', 'Akou Noé', true, false, 'pada'),
('Abobo', 'Allokozo', true, false, 'pada'),
('Abobo', 'Anador', true, false, 'pada'),
('Abobo', 'Anonkoi Kouté Village', true, false, 'pada'),
('Abobo', 'Anyama Adjamé PK 18', true, false, 'pada'),
('Abobo', 'Avocatier Sainte Foi', true, false, 'pada'),
('Abobo', 'Ayéby', true, false, 'pada'),
('Abobo', 'Banco 1', true, false, 'pada'),
('Abobo', 'Banco 2 Mobil', true, false, 'pada'),
('Abobo', 'Belle Ville', true, false, 'pada'),
('Abobo', 'Biabou', true, false, 'pada'),
('Abobo', 'Bocabo', true, false, 'pada'),
('Abobo', 'Bouguinisso', true, false, 'pada'),
('Abobo', 'Cent Douze Hectares', true, false, 'pada'),
('Abobo', 'Cité Forest', true, false, 'pada'),
('Abobo', 'Clouétcha', true, false, 'pada'),
('Abobo', 'CNPS', true, false, 'pada'),
('Abobo', 'Colatier', true, false, 'pada'),
('Abobo', 'Desert', true, false, 'pada'),
('Abobo', 'Etage Noir', true, false, 'pada'),
('Abobo', 'Forêt Classée du Banco', true, false, 'pada'),
('Abobo', 'Haute Tension', true, false, 'pada'),
('Abobo', 'Houphouet Boigny', true, false, 'pada'),
('Abobo', 'Japon', true, false, 'pada'),
('Abobo', 'Kennedy', true, false, 'pada'),
('Abobo', 'Koffi Jean', true, false, 'pada'),
('Abobo', 'Les 4 Etages', true, false, 'pada'),
('Abobo', 'M''Ponon', true, false, 'pada'),
('Abobo', 'Monastère', true, false, 'pada'),
('Abobo', 'N''Guessankoi Village', true, false, 'pada'),
('Abobo', 'N''Guessankro', true, false, 'pada'),
('Abobo', 'OCPV', true, false, 'pada'),
('Abobo', 'Pailliet', true, false, 'pada'),
('Abobo', 'PK 18 (Campement)', true, false, 'pada'),
('Abobo', 'PK 18 Résidentiel', true, false, 'pada'),
('Abobo', 'Plaque 1', true, false, 'pada'),
('Abobo', 'Plaque 2', true, false, 'pada'),
('Abobo', 'Plateau Dokui', true, false, 'pada'),
('Abobo', 'Quartier Agni', true, false, 'pada'),
('Abobo', 'Quartier Célestre', true, false, 'pada'),
('Abobo', 'Quartier Résidentiel', true, false, 'pada'),
('Abobo', 'Sagbé Antenne', true, false, 'pada'),
('Abobo', 'Sagbé Nord', true, false, 'pada'),
('Abobo', 'Sagbé Sud', true, false, 'pada'),
('Abobo', 'Sétu', true, false, 'pada'),
('Abobo', 'Village Aboboté', true, false, 'pada'),
('Abobo', 'Zone Ouest', true, false, 'pada'),

-- Adjamé
('Adjamé', '220 Logements', true, false, 'pada'),
('Adjamé', 'Adjamé-Nord', true, false, 'pada'),
('Adjamé', 'Adjamé Village', true, false, 'pada'),
('Adjamé', 'Bracodi', true, false, 'pada'),
('Adjamé', 'Bromakoté', true, false, 'pada'),
('Adjamé', 'Dallas', true, false, 'pada'),
('Adjamé', 'Ebrié', true, false, 'pada'),
('Adjamé', 'Habitat extension', true, false, 'pada'),
('Adjamé', 'Indénié - Adjamé', true, false, 'pada'),
('Adjamé', 'Mairie 2', true, false, 'pada'),
('Adjamé', 'Marie Thérèse', true, false, 'pada'),
('Adjamé', 'Mirador', true, false, 'pada'),
('Adjamé', 'Pailliet', true, false, 'pada'),
('Adjamé', 'Saint Michel', true, false, 'pada'),
('Adjamé', 'Sodeci - Filtisac', true, false, 'pada'),
('Adjamé', 'Williamsville 1', true, false, 'pada'),
('Adjamé', 'Williamsville 2', true, false, 'pada'),
('Adjamé', 'Williamsville 3', true, false, 'pada'),

-- Marcory
('Marcory', 'Abia Abéti', true, false, 'pada'),
('Marcory', 'Adaimin', true, false, 'pada'),
('Marcory', 'Alliodan', true, false, 'pada'),
('Marcory', 'Anoumabo', true, false, 'pada'),
('Marcory', 'Biétry', true, false, 'pada'),
('Marcory', 'Champroux', true, false, 'pada'),
('Marcory', 'Gnanzoua', true, false, 'pada'),
('Marcory', 'Hibiscus', true, false, 'pada'),
('Marcory', 'Jean Baptiste Mockey', true, false, 'pada'),
('Marcory', 'Kablan Brou Fulgence', true, false, 'pada'),
('Marcory', 'Marie Koré', true, false, 'pada'),
('Marcory', 'Marcory Résidentiel', true, false, 'pada'),
('Marcory', 'Sicogi', true, false, 'pada'),
('Marcory', 'Zone 4C', true, false, 'pada'),

-- Plateau
('Plateau', 'Cité Administrative', true, false, 'pada'),
('Plateau', 'Cité Esculape', true, false, 'pada'),
('Plateau', 'Commerce', true, false, 'pada'),
('Plateau', 'Gare Lagune', true, false, 'pada'),
('Plateau', 'Indénié', true, false, 'pada'),
('Plateau', 'Plateau Centre', true, false, 'pada'),
('Plateau', 'Quatre Villas', true, false, 'pada'),
('Plateau', 'Présidence', true, false, 'pada'),

-- Treichville
('Treichville', 'Arras 1', true, false, 'pada'),
('Treichville', 'Arras 2', true, false, 'pada'),
('Treichville', 'Arras 3', true, false, 'pada'),
('Treichville', 'Biafra', true, false, 'pada'),
('Treichville', 'Boa Kassi', true, false, 'pada'),
('Treichville', 'Ezan Pascal', true, false, 'pada'),
('Treichville', 'George Kassi', true, false, 'pada'),
('Treichville', 'Habitat Belleville', true, false, 'pada'),
('Treichville', 'Nanan Yamousso', true, false, 'pada'),
('Treichville', 'Notre Dame', true, false, 'pada'),
('Treichville', 'Sococé', true, false, 'pada'),
('Treichville', 'Zone Portuaire', true, false, 'pada'),

-- Koumassi
('Koumassi', 'Abia Koumassi', true, false, 'pada'),
('Koumassi', 'Campement', true, false, 'pada'),
('Koumassi', 'Divo', true, false, 'pada'),
('Koumassi', 'Grand Marché', true, false, 'pada'),
('Koumassi', 'Progrès', true, false, 'pada'),
('Koumassi', 'Remblais', true, false, 'pada'),
('Koumassi', 'SICOGI 1', true, false, 'pada'),
('Koumassi', 'SICOGI 2', true, false, 'pada'),
('Koumassi', 'SICOGI 3', true, false, 'pada'),
('Koumassi', 'SOGEFIHA - Zone Industrielle', true, false, 'pada'),
('Koumassi', 'Zoé Bruno', true, false, 'pada'),

-- Port-Bouët
('Port-Bouët', 'Zone Aéroportuaire', true, false, 'pada'),
('Port-Bouët', 'Adjahui-Coubé', true, false, 'pada'),
('Port-Bouët', 'Adjouffou', true, false, 'pada'),
('Port-Bouët', 'Gonzagueville', true, false, 'pada'),
('Port-Bouët', 'Jean Folly', true, false, 'pada'),
('Port-Bouët', 'Phare Littoral', true, false, 'pada'),
('Port-Bouët', 'Vridi 3 Foyers', true, false, 'pada'),
('Port-Bouët', 'Vridi Gendarmerie', true, false, 'pada'),

-- Attécoubé
('Attécoubé', 'Abidjan Agban', true, false, 'pada'),
('Attécoubé', 'Abobodoumé', true, false, 'pada'),
('Attécoubé', 'Cité Fairmont', true, false, 'pada'),
('Attécoubé', 'Jérusalem', true, false, 'pada'),
('Attécoubé', 'La Paix', true, false, 'pada'),
('Attécoubé', 'Locodjro', true, false, 'pada'),
('Attécoubé', 'Santé Village', true, false, 'pada'),

-- Anyama
('Anyama', 'Abohoin', true, false, 'pada'),
('Anyama', 'Anyama Adjamé', true, false, 'pada'),
('Anyama', 'Belle-Ville', true, false, 'pada'),
('Anyama', 'Quartier Résidentiel', true, false, 'pada'),
('Anyama', 'Stade Ebimpé', true, false, 'pada'),

-- Bingerville
('Bingerville', 'Centre Ville', true, false, 'pada'),
('Bingerville', 'Akouédo - Abatta Village', true, false, 'pada'),
('Bingerville', 'Bagba', true, false, 'pada'),
('Bingerville', 'Gbagba', true, false, 'pada'),
('Bingerville', 'Jardin Botanique', true, false, 'pada'),
('Bingerville', 'SCI Carrière', true, false, 'pada'),

-- Songon
('Songon', 'Abiaté', true, false, 'pada'),
('Songon', 'Bimbresso', true, false, 'pada'),
('Songon', 'Songon Agban', true, false, 'pada'),
('Songon', 'Songon Dagbé', true, false, 'pada'),
('Songon', 'Songon Kassemblé', true, false, 'pada'),

-- Grand-Bassam
('Grand-Bassam', 'Ancien Bassam', true, false, 'pada'),
('Grand-Bassam', 'France', true, false, 'pada'),
('Grand-Bassam', 'Mockeyville', true, false, 'pada'),
('Grand-Bassam', 'Moossou', true, false, 'pada'),
('Grand-Bassam', 'Phare', true, false, 'pada'),
('Grand-Bassam', 'Zone Hôtelière', true, false, 'pada')

ON CONFLICT (commune, nom) 
DO UPDATE SET 
  validated = true, 
  hidden = false, 
  source = 'pada';

-- 4. Création de la table de référence des voies PADA (pada_roads) pour requêtes d'adresses
CREATE TABLE IF NOT EXISTS public.pada_roads (
  id VARCHAR(64) PRIMARY KEY,
  type_voie VARCHAR(30) NOT NULL,
  nom_officiel VARCHAR(255) NOT NULL,
  ancien_nom VARCHAR(255),
  commune VARCHAR(100) NOT NULL,
  quartier VARCHAR(100),
  longueur_m INT,
  code_pada VARCHAR(64),
  statut VARCHAR(50) DEFAULT 'OFFICIEL_PADA',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour recherche textuelle ultra-rapide
CREATE INDEX IF NOT EXISTS idx_pada_roads_commune ON public.pada_roads(commune);
CREATE INDEX IF NOT EXISTS idx_pada_roads_nom ON public.pada_roads(nom_officiel);
CREATE INDEX IF NOT EXISTS idx_pada_roads_ancien ON public.pada_roads(ancien_nom);

-- Activation RLS en lecture publique
ALTER TABLE public.pada_roads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture publique pada_roads" ON public.pada_roads;
CREATE POLICY "Lecture publique pada_roads" ON public.pada_roads FOR SELECT USING (true);
