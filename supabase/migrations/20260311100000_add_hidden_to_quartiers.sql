-- Ajoute le champ hidden pour masquer des quartiers sans les supprimer
ALTER TABLE public.quartiers
  ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

-- Mise à jour de la policy publique pour exclure les quartiers masqués
DROP POLICY IF EXISTS "Public can read validated quartiers" ON public.quartiers;

CREATE POLICY "Public can read validated quartiers"
  ON public.quartiers FOR SELECT
  TO anon
  USING (validated = true AND hidden = false);
