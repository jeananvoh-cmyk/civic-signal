-- ============================================================
-- RELAY LOGS — Politiques RLS (Insert/Update/Delete pour Admin & Modérateurs)
-- ============================================================

-- Activer le RLS si ce n'est pas déjà fait
ALTER TABLE public.relay_logs ENABLE ROW LEVEL SECURITY;

-- 1. Politique de lecture publique
DROP POLICY IF EXISTS "Public can read relay_logs" ON public.relay_logs;
CREATE POLICY "Public can read relay_logs"
  ON public.relay_logs FOR SELECT
  USING (true);

-- 2. Politique d'insertion pour les utilisateurs authentifiés (Admins & Modérateurs)
DROP POLICY IF EXISTS "Authenticated can insert relay_logs" ON public.relay_logs;
CREATE POLICY "Authenticated can insert relay_logs"
  ON public.relay_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. Politique de mise à jour pour les utilisateurs authentifiés (Admins & Modérateurs)
DROP POLICY IF EXISTS "Authenticated can update relay_logs" ON public.relay_logs;
CREATE POLICY "Authenticated can update relay_logs"
  ON public.relay_logs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Politique de suppression pour les utilisateurs authentifiés
DROP POLICY IF EXISTS "Authenticated can delete relay_logs" ON public.relay_logs;
CREATE POLICY "Authenticated can delete relay_logs"
  ON public.relay_logs FOR DELETE
  TO authenticated
  USING (true);
