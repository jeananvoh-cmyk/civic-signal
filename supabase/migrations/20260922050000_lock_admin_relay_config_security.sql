-- ============================================================
-- SÉCURISATION STRICTE : admin_get_relay_config
-- Verrouille la fonction RPC afin que seuls les utilisateurs 
-- authentifiés disposant du rôle admin ou moderator puissent y accéder.
-- Bloque toute tentative d'appel par des utilisateurs anonymes (anon).
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_get_relay_config()
RETURNS TABLE (key text, value text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Vérification stricte : utilisateur connecté obligatoire
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Accès refusé : authentification requise.' USING ERRCODE = '42501';
  END IF;

  -- 2. Vérification stricte du rôle administrateur ou modérateur
  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role) 
    OR public.has_role(auth.uid(), 'moderator'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin'::public.app_role, 'moderator'::public.app_role)
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  ) THEN
    RAISE EXCEPTION 'Accès refusé : privilèges administrateur ou modérateur requis.' USING ERRCODE = '42501';
  END IF;

  -- 3. Renvoi des paramètres de configuration aux administrateurs autorisés
  RETURN QUERY SELECT rc.key, rc.value FROM public.relay_config rc;
END;
$$;

-- Révocation stricte des droits pour anon et public
REVOKE EXECUTE ON FUNCTION public.admin_get_relay_config() FROM anon, public;

-- Autorisation limitée aux utilisateurs authentifiés (le contrôle interne de rôle s'applique)
GRANT EXECUTE ON FUNCTION public.admin_get_relay_config() TO authenticated;
