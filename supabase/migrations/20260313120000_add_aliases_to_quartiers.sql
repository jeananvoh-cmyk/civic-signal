-- Ajoute le champ aliases pour gérer les noms alternatifs / noms populaires
-- Exemple : "Soweto" (nom populaire) est un alias de "Zoé Bruno" (nom officiel)
-- ou l'inverse selon le nom canonique retenu dans l'app.

ALTER TABLE public.quartiers
  ADD COLUMN IF NOT EXISTS aliases text[] NOT NULL DEFAULT '{}';

-- Index GIN pour permettre une recherche rapide sur les alias
CREATE INDEX IF NOT EXISTS quartiers_aliases_gin
  ON public.quartiers USING gin(aliases);
