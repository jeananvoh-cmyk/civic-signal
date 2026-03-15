-- Mise à jour des populations selon les résultats définitifs du RGPH 2021 (source: plan.gouv.ci / INS)
-- Adjamé: 372978 → 340892
-- Bingerville: 115000 → 204656
-- Cocody: 447055 → 692583
UPDATE public.communes SET population = 340892 WHERE nom = 'Adjamé';
UPDATE public.communes SET population = 204656 WHERE nom = 'Bingerville';
UPDATE public.communes SET population = 692583 WHERE nom = 'Cocody';