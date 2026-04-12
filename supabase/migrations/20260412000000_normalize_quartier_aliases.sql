-- Normalisation des noms de quartiers dupliqués
-- "Blockauss (village)" → "Blockauss", "Anono village" → "Anono", etc.
-- L'objectif est d'unifier les signalements sous un nom canonique unique.

-- ─── 1. Table de correspondance alias → canonique ────────────────────────────
-- Centralise tous les alias connus pour éviter les doublons dans les stats.

CREATE TABLE IF NOT EXISTS public.quartier_aliases (
  id         serial PRIMARY KEY,
  commune    text NOT NULL,
  alias      text NOT NULL,   -- nom alternatif saisi par l'utilisateur
  canonical  text NOT NULL,   -- nom officiel canonique retenu dans l'app
  UNIQUE (commune, alias)
);

-- Index pour la recherche rapide lors de la soumission
CREATE INDEX IF NOT EXISTS quartier_aliases_lookup
  ON public.quartier_aliases (lower(alias), commune);

-- RLS : lecture publique (nécessaire pour la validation côté frontend)
ALTER TABLE public.quartier_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read quartier aliases"
  ON public.quartier_aliases FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can manage quartier aliases"
  ON public.quartier_aliases FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ─── 2. Données initiales : tous les alias connus ────────────────────────────

INSERT INTO public.quartier_aliases (commune, alias, canonical) VALUES
  -- Cocody
  ('Cocody', 'Blockauss (village)',   'Blockauss'),
  ('Cocody', 'Blockauss village',     'Blockauss'),
  ('Cocody', 'Blockauss Village',     'Blockauss'),
  ('Cocody', 'Anono village',         'Angré'),
  ('Cocody', 'Anono Village',         'Angré'),
  ('Cocody', 'Anono',                 'Angré'),
  ('Cocody', 'Riviéra',               'Riviéra 2'),
  ('Cocody', 'Riviéra Palmeraie',     'Palmeraie'),
  ('Cocody', 'Deux Plateaux Vallon',  'Deux Plateaux'),
  ('Cocody', '2 Plateaux',            'Deux Plateaux'),
  ('Cocody', 'Deux-Plateaux',         'Deux Plateaux'),
  ('Cocody', 'Angré Château',         'Angré'),
  ('Cocody', 'Angré 7ème Tranche',    'Angré'),
  ('Cocody', 'Angré 8ème Tranche',    '8e et 9e tranche'),
  -- Yopougon
  ('Yopougon', 'Kouté village',       'Kouté'),
  ('Yopougon', 'Kouté Village',       'Kouté'),
  ('Yopougon', 'Niangon',             'Niangon'),
  ('Yopougon', 'Niangon nord',        'Niangon nord'),
  ('Yopougon', 'Wassakara village',   'Wassakara'),
  ('Yopougon', 'Wassakara Village',   'Wassakara'),
  ('Yopougon', 'Gesco village',       'Gesco'),
  -- Abobo
  ('Abobo', 'Abobo baoulé',           'Abobo Baoulé'),
  ('Abobo', 'N dotré',                'N''dotré'),
  ('Abobo', 'Ndotré',                 'N''dotré'),
  -- Port-Bouët
  ('Port-Bouët', 'Port-Bouët Village','Port-Bouët Village'),
  ('Port-Bouët', 'Gonzague',          'Gonzagueville'),
  ('Port-Bouët', 'Gonzagueville village', 'Gonzagueville'),
  -- Adjamé
  ('Adjamé', 'Williamsville village', 'Williamsville'),
  -- Bingerville
  ('Bingerville', 'Abatta village',   'Abatta'),
  ('Bingerville', 'Eloka village',    'Eloka'),
  -- Koumassi
  ('Koumassi', 'Koumassi village',    'Koumassi Campement')
ON CONFLICT (commune, alias) DO NOTHING;

-- ─── 3. Fonction de normalisation ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.normalize_quartier(
  p_quartier text,
  p_commune  text
)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_canonical text;
BEGIN
  -- Lookup exact alias (case-insensitive)
  SELECT canonical INTO v_canonical
  FROM public.quartier_aliases
  WHERE commune = p_commune
    AND lower(alias) = lower(trim(p_quartier))
  LIMIT 1;

  IF v_canonical IS NOT NULL THEN
    RETURN v_canonical;
  END IF;

  -- Pattern : "X (village)" ou "X village" → "X" si pas d'alias explicite
  -- Retire le suffixe village et retourne le nom de base nettoyé
  v_canonical := trim(regexp_replace(p_quartier, '\s*\(?\s*[Vv]illage\s*\)?\s*$', '', 'i'));
  IF v_canonical <> trim(p_quartier) AND v_canonical <> '' THEN
    RETURN v_canonical;
  END IF;

  -- Aucun alias trouvé → retourner tel quel (trimmé)
  RETURN trim(p_quartier);
END;
$$;

GRANT EXECUTE ON FUNCTION public.normalize_quartier TO anon, authenticated;

-- ─── 4. Mettre à jour les rapports existants ─────────────────────────────────
-- Applique la normalisation sur tous les rapports actifs et résolus.

UPDATE public.reports
SET quartier = public.normalize_quartier(quartier, commune)
WHERE quartier IS NOT NULL
  AND quartier <> ''
  AND quartier <> public.normalize_quartier(quartier, commune);

-- ─── 5. Mettre à jour la table quartiers (aliases + suppression doublons) ────

-- Ajouter les aliases dans la table quartiers existants
UPDATE public.quartiers q
SET aliases = ARRAY['Blockauss (village)', 'Blockauss village']
WHERE nom = 'Blockauss' AND commune = 'Cocody';

-- Supprimer les entrées dupliquées validées qui ont été normalisées
DELETE FROM public.quartiers
WHERE (lower(nom) LIKE '%village%' OR nom LIKE '% (%)')
  AND EXISTS (
    SELECT 1 FROM public.quartier_aliases
    WHERE lower(alias) = lower(quartiers.nom)
      AND commune = quartiers.commune
  );

-- ─── 6. Trigger : normaliser automatiquement à chaque INSERT/UPDATE ──────────

CREATE OR REPLACE FUNCTION public.auto_normalize_quartier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.quartier IS NOT NULL AND NEW.quartier <> '' THEN
    NEW.quartier := public.normalize_quartier(NEW.quartier, NEW.commune);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_quartier ON public.reports;
CREATE TRIGGER trg_normalize_quartier
  BEFORE INSERT OR UPDATE OF quartier, commune
  ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_normalize_quartier();

-- ─── 7. Vérification : voir les quartiers normalisés ─────────────────────────
-- Décommenter pour vérifier le résultat :
-- SELECT commune, quartier, COUNT(*) FROM public.reports
-- WHERE quartier IS NOT NULL GROUP BY commune, quartier ORDER BY commune, quartier;
