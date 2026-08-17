-- ── Migration de Durcissement de Sécurité & Confidentialité Citoyenne ─────────
-- 1. Verrouillage de la lecture anonyme directe sur la table reports brute
--    pour empêcher l'extraction de l'UUID de l'auteur (user_id) et des coordonnées GPS exactes.
--    Toutes les consultations anonymes doivent impérativement passer par les RPCs floutées.

-- Supprimer l'ancienne politique permettant le SELECT direct sur infrastructure aux anonymes
DROP POLICY IF EXISTS "Public can read infrastructure reports" ON public.reports;
DROP POLICY IF EXISTS "Anyone can view reports" ON public.reports;
DROP POLICY IF EXISTS "Anon can read public reports view" ON public.reports;

-- S'assurer que RLS est bien activé
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Politique RESTRICTIVE : Bloquer tout SELECT direct anonyme sur la table brute reports
DROP POLICY IF EXISTS "Deny direct anon select on reports" ON public.reports;
CREATE POLICY "Deny direct anon select on reports"
  ON public.reports AS RESTRICTIVE FOR SELECT
  TO anon
  USING (false);

-- Politique PERMISSIVE : Les utilisateurs connectés peuvent voir leurs propres signalements
DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Politique PERMISSIVE : Les administrateurs et modérateurs peuvent lire tous les signalements
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
CREATE POLICY "Admins can view all reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'moderator')
  );

-- Politique PERMISSIVE : Les régies et partenaires peuvent voir les signalements de leur périmètre
DROP POLICY IF EXISTS "Partners can view relevant reports" ON public.reports;
CREATE POLICY "Partners can view relevant reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_profiles pp
      WHERE pp.user_id = auth.uid()
    )
  );

-- 2. Garantir que les RPCs publiques floutées sont accessibles à tous (anon et authenticated)
GRANT EXECUTE ON FUNCTION public.get_public_infrastructure_reports(text, integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_reports() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_landing_stats() TO anon, authenticated;
