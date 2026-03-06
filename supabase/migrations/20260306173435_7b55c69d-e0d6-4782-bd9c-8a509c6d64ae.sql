
-- Table des quartiers dynamique
CREATE TABLE public.quartiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commune text NOT NULL,
  nom text NOT NULL,
  validated boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'static',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(commune, nom)
);

ALTER TABLE public.quartiers ENABLE ROW LEVEL SECURITY;

-- Lecture publique des quartiers validés
CREATE POLICY "Anyone can read validated quartiers"
  ON public.quartiers FOR SELECT
  USING (validated = true);

-- Admins gèrent tous les quartiers
CREATE POLICY "Admins can manage all quartiers"
  ON public.quartiers FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed: Yopougon
INSERT INTO public.quartiers (commune, nom, source) VALUES
('Yopougon','Abiatrana','static'),('Yopougon','Académie','static'),('Yopougon','Académie résidentiel','static'),('Yopougon','Ananeraie','static'),('Yopougon','Andokoi','static'),
('Yopougon','Atchi','static'),('Yopougon','Attié','static'),('Yopougon','Azito Village','static'),('Yopougon','Bagouda','static'),('Yopougon','Banco 2','static'),
('Yopougon','Batim 2','static'),('Yopougon','Béago','static'),('Yopougon','Bel Air','static'),('Yopougon','Boissy','static'),('Yopougon','Bonikro','static'),
('Yopougon','Camp militaire','static'),('Yopougon','Chevaux','static'),('Yopougon','Cité Bracodi','static'),('Yopougon','Cité Caféiers','static'),('Yopougon','Cité CNPS','static'),
('Yopougon','Cité Élisée','static'),('Yopougon','Cité marine','static'),('Yopougon','Cité Nawa','static'),('Yopougon','Cité Ngouan 1','static'),('Yopougon','Cité Saco II','static'),
('Yopougon','Cité SGBCI','static'),('Yopougon','Cité Sodefor Lauriers 11 & 12','static'),('Yopougon','Cité Sotra','static'),('Yopougon','Cité Verte','static'),('Yopougon','Complexe','static'),
('Yopougon','Coprim Zenith','static'),('Yopougon','Deuxième tranche','static'),('Yopougon','Diop','static'),('Yopougon','Doukouré','static'),('Yopougon','Fanny','static'),
('Yopougon','Figayo','static'),('Yopougon','Fin goudron','static'),('Yopougon','Gabriel Gare','static'),('Yopougon','Galilée','static'),('Yopougon','Gbamnan Djidan 1','static'),
('Yopougon','Gesco','static'),('Yopougon','GFCI','static'),('Yopougon','Hôpital','static'),('Yopougon','Île Boulay','static'),('Yopougon','Issamboua','static'),
('Yopougon','Judée','static'),('Yopougon','Keneya','static'),('Yopougon','Kouté','static'),('Yopougon','Kouté village','static'),('Yopougon','Koweit','static'),
('Yopougon','Lauriers 2','static'),('Yopougon','Lauriers Sacos','static'),('Yopougon','Le corridor','static'),('Yopougon','Les Pays-Bas','static'),('Yopougon','Lezou Aman','static'),
('Yopougon','Lièvre rouge','static'),('Yopougon','Lokoa extension','static'),('Yopougon','Mamie Adjoua','static'),('Yopougon','Mbakré','static'),('Yopougon','Micao','static'),
('Yopougon','N''zimakro','static'),('Yopougon','Niaba','static'),('Yopougon','Niangon','static'),('Yopougon','Niangon Adjamé','static'),('Yopougon','Niangon à droite','static'),
('Yopougon','Niangon à gauche','static'),('Yopougon','Niangon Lokoa','static'),('Yopougon','Niangon nord','static'),('Yopougon','Niangon Sicogi Canal','static'),('Yopougon','Niangon sud','static'),
('Yopougon','Niangon Sud Sicogi','static'),('Yopougon','Nouveau quartier','static'),('Yopougon','Port-Bouët II','static'),('Yopougon','Quartier LEM','static'),('Yopougon','Quartier Maroc','static'),
('Yopougon','Quartier Millionnaire','static'),('Yopougon','Sable','static'),('Yopougon','Saint Hubert','static'),('Yopougon','Score','static'),('Yopougon','Selmer','static'),
('Yopougon','Selmer ponty','static'),('Yopougon','Sicogi','static'),('Yopougon','Sideci','static'),('Yopougon','Sikasso','static'),('Yopougon','Siporex','static'),
('Yopougon','Sogefiha Solic 1 & 2','static'),('Yopougon','Sopim','static'),('Yopougon','Toit vert','static'),('Yopougon','Wassakara','static'),('Yopougon','Yao Séhi','static'),
('Yopougon','Yesso','static'),('Yopougon','Yopougon-Santé','static'),('Yopougon','Zone Industrielle','static');

-- Seed: Cocody
INSERT INTO public.quartiers (commune, nom, source) VALUES
('Cocody','8e et 9e tranche','static'),('Cocody','Abobo Té','static'),('Cocody','Aghien','static'),('Cocody','Akouédo','static'),('Cocody','Ambassade','static'),
('Cocody','Angré','static'),('Cocody','Blockauss','static'),('Cocody','Bonoumin','static'),('Cocody','Caféier','static'),('Cocody','Camp Militaire','static'),
('Cocody','Deux Plateaux','static'),('Cocody','Djibi','static'),('Cocody','Djorogobité','static'),('Cocody','Gendarmerie Agban','static'),('Cocody','Genie 2000','static'),
('Cocody','Lycée Technique','static'),('Cocody','M''Badon','static'),('Cocody','M''pouto','static'),('Cocody','Palmeraie','static'),('Cocody','Port Royal','static'),
('Cocody','Riviéra 1','static'),('Cocody','Riviéra 2','static'),('Cocody','Riviéra 3','static'),('Cocody','Riviéra 4','static'),('Cocody','Riviéra 6','static'),
('Cocody','Riviéra Bonoumin','static'),('Cocody','RTI','static'),('Cocody','Vieux Cocody','static');

-- Seed: Abobo
INSERT INTO public.quartiers (commune, nom, source) VALUES
('Abobo','4 Etages','static'),('Abobo','Abobo Baoulé','static'),('Abobo','Abobo Nord','static'),('Abobo','Abobo RTI','static'),('Abobo','Abobo Sud','static'),
('Abobo','Aboua','static'),('Abobo','Agbekoi','static'),('Abobo','Akeikoi','static'),('Abobo','Aman','static'),('Abobo','Anador','static'),
('Abobo','Anonkoua','static'),('Abobo','Anonkoua-Kouté','static'),('Abobo','Atsin','static'),('Abobo','Avocatier','static'),('Abobo','Banco','static'),
('Abobo','Belleville','static'),('Abobo','Biabou','static'),('Abobo','Boussake','static'),('Abobo','Broukoua','static'),('Abobo','Cité Ado','static'),
('Abobo','Cité de la Grâce','static'),('Abobo','Cité Universitaire Abobo 1','static'),('Abobo','Cité Universitaire Abobo 2','static'),('Abobo','Cobakro','static'),
('Abobo','Étoile','static'),('Abobo','Kennedy','static'),('Abobo','Kouadjo Kouakou','static'),('Abobo','L''habitat','static'),('Abobo','Moni','static'),
('Abobo','N''dotré','static'),('Abobo','Palmafrique V2','static'),('Abobo','PK 18','static'),('Abobo','Sagbé','static'),('Abobo','Sagbé celeste','static'),
('Abobo','Sagbé Nord','static'),('Abobo','Sagbé Sud','static'),('Abobo','Sapa','static'),('Abobo','Sofaica','static'),('Abobo','Sos Abobo','static'),
('Abobo','Tamini','static'),('Abobo','Yapi','static');

-- Seed: Adjamé
INSERT INTO public.quartiers (commune, nom, source) VALUES
('Adjamé','220 logements','static'),('Adjamé','Abobo Adjamé','static'),('Adjamé','Bidonville','static'),('Adjamé','Bracodi','static'),('Adjamé','Bromakoté','static'),
('Adjamé','Habitat','static'),('Adjamé','Humici','static'),('Adjamé','Latin','static'),('Adjamé','Liberté','static'),('Adjamé','Macaci','static'),
('Adjamé','Pailler','static'),('Adjamé','Quartier Manguier','static'),('Adjamé','Saint Michel','static'),('Adjamé','Williamsville','static');

-- Seed: Bingerville
INSERT INTO public.quartiers (commune, nom, source) VALUES
('Bingerville','Abatta','static'),('Bingerville','Abatta BCEAO','static'),('Bingerville','Abatta Cité Police','static'),('Bingerville','Abatta Sicta','static'),('Bingerville','Achokoi','static'),
('Bingerville','Agban','static'),('Bingerville','Aguien','static'),('Bingerville','Akakro','static'),('Bingerville','Akandjé','static'),('Bingerville','Akoué Santé','static'),
('Bingerville','Akoue Santé 2','static'),('Bingerville','Akouédo Attié','static'),('Bingerville','Akoyaté','static'),('Bingerville','Akwè Djèmin','static'),('Bingerville','Ana','static'),
('Bingerville','Angoran','static'),('Bingerville','Blanchon','static'),('Bingerville','Bokate','static'),('Bingerville','Brégbo','static'),('Bingerville','Cité CIE','static'),
('Bingerville','Cité Olympe Promogim','static'),('Bingerville','Cité Promogim Athena','static'),('Bingerville','Domouégo','static'),('Bingerville','Ebrah','static'),('Bingerville','Eloka','static'),
('Bingerville','Eloka-Té','static'),('Bingerville','Eloka-To','static'),('Bingerville','Faya Riviéra 5','static'),('Bingerville','Feh Kessé','static'),('Bingerville','Figuier','static'),
('Bingerville','Gbagba','static'),('Bingerville','Gbagba Extension','static'),('Bingerville','Île Bassigbo','static'),('Bingerville','Kouassi Kakou','static'),('Bingerville','Lauriers 9','static'),
('Bingerville','M''batto-Bouaké','static'),('Bingerville','Mobio','static'),('Bingerville','Ogriville','static'),('Bingerville','Palmafrique Éloka','static'),
('Bingerville','Quartier Scierie GIB','static'),('Bingerville','Riviéra 6','static'),('Bingerville','Sebia Yao','static');

-- Trigger: auto-ajouter un quartier quand un report est créé avec un quartier inconnu
CREATE OR REPLACE FUNCTION public.auto_add_quartier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.quartier <> '' AND NEW.commune <> '' THEN
    INSERT INTO public.quartiers (commune, nom, validated, source)
    VALUES (NEW.commune, NEW.quartier, false, 'user')
    ON CONFLICT (commune, nom) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_add_quartier
AFTER INSERT ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.auto_add_quartier();
