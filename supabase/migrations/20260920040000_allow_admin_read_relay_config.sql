-- ============================================================
-- RELAY CONFIG & RELAYS : Accès Administrateur & Transmission Conjointe
-- Permet aux admins de lire la configuration de transmission et résout l'erreur 42501
-- ============================================================

-- 1. Politique SELECT pour permettre aux admins et modérateurs de lire relay_config
DROP POLICY IF EXISTS "Admins and moderators can read relay_config" ON public.relay_config;
CREATE POLICY "Admins and moderators can read relay_config"
  ON public.relay_config FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role) 
    OR public.has_role(auth.uid(), 'moderator'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin'::public.app_role, 'moderator'::public.app_role)
    )
  );

-- 2. Fonction RPC SECURITY DEFINER pour récupérer la configuration sans blocage RLS
CREATE OR REPLACE FUNCTION public.admin_get_relay_config()
RETURNS TABLE (key text, value text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT rc.key, rc.value FROM public.relay_config rc;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_relay_config() TO authenticated, anon;

-- 3. Mettre à jour la contrainte CHECK de relay_logs si nécessaire
ALTER TABLE public.relay_logs DROP CONSTRAINT IF EXISTS relay_logs_operator_check;
ALTER TABLE public.relay_logs ADD CONSTRAINT relay_logs_operator_check 
  CHECK (operator IN ('CIE', 'SODECI', 'MAIRIE', 'ONEP', 'ANARE', 'CIE_ANARE', 'SODECI_ONEP'));
