-- ============================================================
-- RPC : recherche d'utilisateur par email (admin seulement)
-- Permet à l'admin de retrouver l'UUID d'un utilisateur
-- depuis son adresse email pour lui attribuer un rôle.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_find_user_by_email(p_email text)
RETURNS TABLE(
  user_id uuid,
  email text,
  first_name text,
  last_name text,
  display_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Accès refusé — rôle admin requis';
  END IF;

  IF p_email IS NULL OR length(trim(p_email)) < 3 THEN
    RAISE EXCEPTION 'Email trop court';
  END IF;

  RETURN QUERY
  SELECT
    u.id         AS user_id,
    u.email      AS email,
    p.first_name AS first_name,
    p.last_name  AS last_name,
    p.display_name AS display_name
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE u.email ILIKE '%' || trim(p_email) || '%'
  ORDER BY u.created_at DESC
  LIMIT 10;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_find_user_by_email(text) TO authenticated;
