-- Fix: remplacer la policy FOR ALL admin par des policies explicites par commande
-- La policy FOR ALL avec USING peut créer des ambiguïtés pour SELECT selon le client Supabase

DROP POLICY IF EXISTS "Admins can manage all quartiers" ON public.quartiers;

-- SELECT : les admins voient TOUS les quartiers (validés ou non)
CREATE POLICY "Admins can select all quartiers"
  ON public.quartiers FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- INSERT : les admins peuvent insérer
CREATE POLICY "Admins can insert quartiers"
  ON public.quartiers FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- UPDATE : les admins peuvent modifier (valider/rejeter)
CREATE POLICY "Admins can update quartiers"
  ON public.quartiers FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- DELETE : les admins peuvent supprimer
CREATE POLICY "Admins can delete quartiers"
  ON public.quartiers FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Mise à jour des populations RGPH 2021 dans la table communes (si elle existe)
UPDATE public.communes SET population = 1340083 WHERE nom = 'Abobo';
UPDATE public.communes SET population = 372978  WHERE nom = 'Adjamé';
UPDATE public.communes SET population = 412282  WHERE nom = 'Koumassi';
UPDATE public.communes SET population = 618795  WHERE nom = 'Port-Bouët';
