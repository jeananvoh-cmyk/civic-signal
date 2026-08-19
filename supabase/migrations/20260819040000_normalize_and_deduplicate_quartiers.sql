-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION : DÉDOUBLONNAGE ET NORMALISATION CANONIQUE DES QUARTIERS (14 COMMUNES)
-- + RELANCE PRÉVENTIVE H+24 AVANT AUTO-CLÔTURE H+48
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Ajout de la colonne de relance H+24 pour les coupures temporaires
ALTER TABLE public.reports 
  ADD COLUMN IF NOT EXISTS h24_author_notified BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.reports.h24_author_notified IS 'TRUE quand la notification de relance H+24 avant auto-clôture H+48 a été envoyée à l''auteur';

-- 2. Mise à jour des signalements existants pour harmoniser les variantes vers les noms canoniques PADA
-- Adjamé
UPDATE public.reports SET quartier = 'Williamsville 1' WHERE lower(commune) = 'adjamé' AND lower(trim(quartier)) IN ('williamsville', 'williamsville 1', 'williamsville i', 'adjame williamsville', 'adjamé williamsville');
UPDATE public.reports SET quartier = 'Williamsville 2' WHERE lower(commune) = 'adjamé' AND lower(trim(quartier)) IN ('williamsville 2', 'williamsville ii');
UPDATE public.reports SET quartier = 'Williamsville 3' WHERE lower(commune) = 'adjamé' AND lower(trim(quartier)) IN ('williamsville 3', 'williamsville iii');
UPDATE public.reports SET quartier = 'Ebrié' WHERE lower(commune) = 'adjamé' AND lower(trim(quartier)) IN ('ebrié', 'ebrie', 'quartier ebrié', 'quartier ébrié', 'village ebrié', 'village ébrié');
UPDATE public.reports SET quartier = 'Indénié' WHERE lower(commune) = 'adjamé' AND lower(trim(quartier)) IN ('indénié', 'indenie', 'indénié - adjamé', 'indénie - adjame');
UPDATE public.reports SET quartier = 'Mairie 1' WHERE lower(commune) = 'adjamé' AND lower(trim(quartier)) IN ('mairie', 'mairie 1', 'mairie i');
UPDATE public.reports SET quartier = 'Mairie 2' WHERE lower(commune) = 'adjamé' AND lower(trim(quartier)) IN ('mairie 2', 'mairie ii');
UPDATE public.reports SET quartier = 'Marie Thérèse' WHERE lower(commune) = 'adjamé' AND lower(trim(quartier)) IN ('marie therese', 'marie-therese', 'marie thérèse', 'marie-thérèse');
UPDATE public.reports SET quartier = 'Saint Michel' WHERE lower(commune) = 'adjamé' AND lower(trim(quartier)) IN ('saint michel', 'saint-michel');
UPDATE public.reports SET quartier = 'Sodeci - Filtisac' WHERE lower(commune) = 'adjamé' AND lower(trim(quartier)) IN ('sodeci - filtisac', 'sodeci filtisac', 'sodeci-filtisac');
UPDATE public.reports SET quartier = 'Pailliet' WHERE lower(commune) = 'adjamé' AND lower(trim(quartier)) IN ('pailler', 'pallier', 'pailliet');
UPDATE public.reports SET quartier = 'Habitat Extension' WHERE lower(commune) = 'adjamé' AND lower(trim(quartier)) IN ('habitat', 'habitat extension', 'latin');

-- Treichville
UPDATE public.reports SET quartier = 'Arras 1' WHERE lower(commune) = 'treichville' AND lower(trim(quartier)) IN ('arras 1', 'arras i');
UPDATE public.reports SET quartier = 'Arras 2' WHERE lower(commune) = 'treichville' AND lower(trim(quartier)) IN ('arras 2', 'arras ii');
UPDATE public.reports SET quartier = 'Arras 3' WHERE lower(commune) = 'treichville' AND lower(trim(quartier)) IN ('arras 3', 'arras iii');

-- Cocody
UPDATE public.reports SET quartier = 'Blockauss' WHERE lower(commune) = 'cocody' AND lower(trim(quartier)) IN ('blockauss', 'blockauss (village)', 'blockauss village');
UPDATE public.reports SET quartier = 'Anono Village' WHERE lower(commune) = 'cocody' AND lower(trim(quartier)) IN ('anono', 'anono village');
UPDATE public.reports SET quartier = 'Riviera 2' WHERE lower(commune) = 'cocody' AND lower(trim(quartier)) IN ('riviéra', 'riviera', 'riviera 1', 'riviera i', 'riviera ii', 'riviera 2');
UPDATE public.reports SET quartier = 'Riviera 3' WHERE lower(commune) = 'cocody' AND lower(trim(quartier)) IN ('riviera 3', 'riviera iii');
UPDATE public.reports SET quartier = 'Riviera 4' WHERE lower(commune) = 'cocody' AND lower(trim(quartier)) IN ('riviera 4', 'riviera iv');
UPDATE public.reports SET quartier = 'Riviera 5' WHERE lower(commune) = 'cocody' AND lower(trim(quartier)) IN ('riviera 5', 'riviera v');
UPDATE public.reports SET quartier = 'Riviera Bonoumin' WHERE lower(commune) = 'cocody' AND lower(trim(quartier)) IN ('bonoumin', 'riviera bonoumin');
UPDATE public.reports SET quartier = 'Riviera Golf' WHERE lower(commune) = 'cocody' AND lower(trim(quartier)) IN ('golf', 'riviera golf');
UPDATE public.reports SET quartier = 'Riviera Allabra' WHERE lower(commune) = 'cocody' AND lower(trim(quartier)) IN ('allabra', 'riviera allabra');
UPDATE public.reports SET quartier = 'Deux Plateaux' WHERE lower(commune) = 'cocody' AND lower(trim(quartier)) IN ('deux plateaux', '2 plateaux', 'deux-plateaux');
UPDATE public.reports SET quartier = 'Angré' WHERE lower(commune) = 'cocody' AND lower(trim(quartier)) IN ('angré', 'angre', 'angré château', 'angre chateau');

-- Yopougon
UPDATE public.reports SET quartier = 'Port-Bouët 2' WHERE lower(commune) = 'yopougon' AND lower(trim(quartier)) IN ('port-bouët ii', 'port-bouet ii', 'port bouet 2', 'port-bouët 2');
UPDATE public.reports SET quartier = 'Cité Saco 2' WHERE lower(commune) = 'yopougon' AND lower(trim(quartier)) IN ('cité saco ii', 'cite saco 2', 'cité saco 2');
UPDATE public.reports SET quartier = 'Kouté' WHERE lower(commune) = 'yopougon' AND lower(trim(quartier)) IN ('kouté', 'koute', 'kouté village', 'koute village');
UPDATE public.reports SET quartier = 'Wassakara' WHERE lower(commune) = 'yopougon' AND lower(trim(quartier)) IN ('wassakara', 'wassakara village');
UPDATE public.reports SET quartier = 'Gesco' WHERE lower(commune) = 'yopougon' AND lower(trim(quartier)) IN ('gesco', 'gesco village');

-- Abobo
UPDATE public.reports SET quartier = 'Abobo Baoulé' WHERE lower(commune) = 'abobo' AND lower(trim(quartier)) IN ('abobo baoulé', 'abobo baoule', 'abobo centre');
UPDATE public.reports SET quartier = 'N''Dotré' WHERE lower(commune) = 'abobo' AND lower(trim(quartier)) IN ('n dotré', 'ndotré', 'ndotre', 'n''dotre', 'n''dotré');
UPDATE public.reports SET quartier = 'Plaque 1' WHERE lower(commune) = 'abobo' AND lower(trim(quartier)) IN ('plaque 1', 'plaque i');
UPDATE public.reports SET quartier = 'Plaque 2' WHERE lower(commune) = 'abobo' AND lower(trim(quartier)) IN ('plaque 2', 'plaque ii');

-- Grand-Bassam
UPDATE public.reports SET quartier = 'Vitré 1' WHERE lower(commune) = 'grand-bassam' AND lower(trim(quartier)) IN ('vitré 1', 'vitre 1', 'vitré i');
UPDATE public.reports SET quartier = 'Vitré 2' WHERE lower(commune) = 'grand-bassam' AND lower(trim(quartier)) IN ('vitré 2', 'vitre 2', 'vitré ii');

-- Élimination des mentions __other / other / Autre
UPDATE public.reports 
SET quartier = CASE 
  WHEN lower(commune) = 'cocody' THEN 'Cocody Centre'
  WHEN lower(commune) = 'adjamé' THEN '220 Logements'
  WHEN lower(commune) = 'abobo' THEN 'Abobo Baoulé'
  WHEN lower(commune) = 'treichville' THEN 'Arras 1'
  WHEN lower(commune) = 'koumassi' THEN 'Grand Marché'
  WHEN lower(commune) = 'marcory' THEN 'Marcory Résidentiel'
  WHEN lower(commune) = 'plateau' THEN 'Plateau Centre'
  WHEN lower(commune) = 'port-bouët' THEN 'Centre Ville'
  WHEN lower(commune) = 'yopougon' THEN 'Nouveau Quartier'
  WHEN lower(commune) = 'anyama' THEN 'Anyama Centre'
  WHEN lower(commune) = 'bingerville' THEN 'Centre Ville'
  WHEN lower(commune) = 'grand-bassam' THEN 'Centre Ville'
  WHEN lower(commune) = 'attecoube' THEN 'Cité Fairmont'
  WHEN lower(commune) = 'songon' THEN 'Songon Centre'
  ELSE 'Secteur Principal'
END
WHERE lower(trim(quartier)) IN ('__other', 'other', 'autre', 'autre quartier', 'non spécifié', 'n/a', '');

-- 3. Nettoyage et purge des doublons dans la table `public.quartiers`
-- Suppression des variantes obsolètes et doublons de chiffres romains
DELETE FROM public.quartiers 
WHERE lower(commune) = 'adjamé' AND lower(trim(nom)) IN (
  'williamsville', 'williamsville i', 'williamsville ii', 'williamsville iii', 'adjame williamsville',
  'quartier ebrié', 'village ebrié', 'quartier ébrié', 'village ébrié',
  'indénié - adjamé', 'mairie i', 'mairie ii', 'marie-thérèse', 'saint-michel',
  'pailler', 'pallier', 'sodeci-filtisac', 'bidonville', 'latin', 'humici', 'quartier manguier'
);

DELETE FROM public.quartiers 
WHERE lower(commune) = 'treichville' AND lower(trim(nom)) IN ('arras i', 'arras ii', 'arras iii');

DELETE FROM public.quartiers 
WHERE lower(commune) = 'yopougon' AND lower(trim(nom)) IN ('port-bouët ii', 'port-bouet ii', 'cité saco ii');

DELETE FROM public.quartiers 
WHERE lower(commune) = 'abobo' AND lower(trim(nom)) IN ('plaque i', 'plaque ii');

DELETE FROM public.quartiers 
WHERE lower(commune) = 'grand-bassam' AND lower(trim(nom)) IN ('vitré i', 'vitré ii');

-- Suppression des doublons stricts résiduels
DELETE FROM public.quartiers a
USING public.quartiers b
WHERE a.id > b.id
  AND lower(trim(a.commune)) = lower(trim(b.commune))
  AND lower(trim(a.nom)) = lower(trim(b.nom));

-- 4. Insertion / Vérification des quartiers canoniques officiels pour Adjamé
INSERT INTO public.quartiers (commune, nom, validated, hidden, source) VALUES
('Adjamé', '220 Logements', true, false, 'pada'),
('Adjamé', 'Adjamé Village', true, false, 'pada'),
('Adjamé', 'Adjamé-Nord', true, false, 'pada'),
('Adjamé', 'Bracodi', true, false, 'pada'),
('Adjamé', 'Bromakoté', true, false, 'pada'),
('Adjamé', 'Dallas', true, false, 'pada'),
('Adjamé', 'Ebrié', true, false, 'pada'),
('Adjamé', 'Habitat Extension', true, false, 'pada'),
('Adjamé', 'Indénié', true, false, 'pada'),
('Adjamé', 'Mairie 1', true, false, 'pada'),
('Adjamé', 'Mairie 2', true, false, 'pada'),
('Adjamé', 'Marie Thérèse', true, false, 'pada'),
('Adjamé', 'Mirador', true, false, 'pada'),
('Adjamé', 'Pailliet', true, false, 'pada'),
('Adjamé', 'Saint Michel', true, false, 'pada'),
('Adjamé', 'Sodeci - Filtisac', true, false, 'pada'),
('Adjamé', 'Williamsville 1', true, false, 'pada'),
('Adjamé', 'Williamsville 2', true, false, 'pada'),
('Adjamé', 'Williamsville 3', true, false, 'pada')
ON CONFLICT DO NOTHING;

-- 5. Mise à jour de la fonction RPC `get_commune_quartier_stats` pour exclure les faux quartiers
CREATE OR REPLACE FUNCTION public.get_commune_quartier_stats(p_commune text)
 RETURNS TABLE(
    quartier text, 
    electricite_actifs bigint, 
    electricite_resolus bigint, 
    electricite_total bigint, 
    eau_actifs bigint, 
    eau_resolus bigint, 
    eau_total bigint,
    mairie_actifs bigint,
    mairie_resolus bigint,
    mairie_total bigint
)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_commune IS NULL OR LENGTH(p_commune) < 1 OR LENGTH(p_commune) > 100 THEN
    RAISE EXCEPTION 'Invalid commune name';
  END IF;

  RETURN QUERY
  SELECT
    r.quartier,
    COUNT(*) FILTER (WHERE r.service_type = 'electricity' AND r.status = 'active') AS electricite_actifs,
    COUNT(*) FILTER (WHERE r.service_type = 'electricity' AND r.status = 'resolved') AS electricite_resolus,
    COUNT(*) FILTER (WHERE r.service_type = 'electricity') AS electricite_total,
    
    COUNT(*) FILTER (WHERE r.service_type = 'water' AND r.status = 'active') AS eau_actifs,
    COUNT(*) FILTER (WHERE r.service_type = 'water' AND r.status = 'resolved') AS eau_resolus,
    COUNT(*) FILTER (WHERE r.service_type = 'water') AS eau_total,
    
    COUNT(*) FILTER (WHERE r.service_type = 'mairie' AND r.status = 'active') AS mairie_actifs,
    COUNT(*) FILTER (WHERE r.service_type = 'mairie' AND r.status = 'resolved') AS mairie_resolus,
    COUNT(*) FILTER (WHERE r.service_type = 'mairie') AS mairie_total
  FROM reports r
  WHERE LOWER(r.commune) = LOWER(p_commune)
    AND r.validated = true
    AND r.quartier <> ''
    AND LOWER(r.quartier) NOT IN ('__other', 'other', 'autre')
  GROUP BY r.quartier
  ORDER BY (COUNT(*) FILTER (WHERE r.status = 'active')) DESC, r.quartier;
END;
$function$;
