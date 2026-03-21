-- RPC SECURITY DEFINER : retourne les commentaires d'un signalement
-- avec infos auteur (display_name) et badge partenaire si applicable.
-- Contourne le RLS de partner_profiles sans exposer de données sensibles.

CREATE OR REPLACE FUNCTION get_report_comments(p_report_id UUID)
RETURNS TABLE (
  id            UUID,
  content       TEXT,
  created_at    TIMESTAMPTZ,
  user_id       UUID,
  display_name  TEXT,
  organization_name TEXT,
  partner_type  TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    rc.id,
    rc.content,
    rc.created_at,
    rc.user_id,
    COALESCE(p.display_name, 'Citoyen') AS display_name,
    pp.organization_name,
    pp.partner_type
  FROM public.report_comments rc
  LEFT JOIN public.profiles p       ON p.user_id  = rc.user_id
  LEFT JOIN public.partner_profiles pp ON pp.user_id = rc.user_id
  WHERE rc.report_id = p_report_id
  ORDER BY rc.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION get_report_comments(UUID) TO anon, authenticated;
