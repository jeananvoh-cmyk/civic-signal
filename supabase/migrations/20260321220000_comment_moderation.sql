-- Comment moderation: allow admin/moderator to soft-delete comments

-- 1. Add hidden column
ALTER TABLE public.report_comments
  ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

-- 2. Allow admin/moderator to update (hide) any comment
CREATE POLICY "Admins can hide comments"
  ON public.report_comments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (true);

-- 3. Allow admin/moderator to hard-delete any comment
CREATE POLICY "Admins can delete any comment"
  ON public.report_comments FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Drop old user-only delete policy (replaced above)
DROP POLICY IF EXISTS "User can delete own comment" ON public.report_comments;

-- 4. Update RPC to exclude hidden comments
CREATE OR REPLACE FUNCTION get_report_comments(p_report_id UUID)
RETURNS TABLE (
  id               UUID,
  content          TEXT,
  created_at       TIMESTAMPTZ,
  user_id          UUID,
  display_name     TEXT,
  organization_name TEXT,
  partner_type     TEXT
)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    rc.id,
    rc.content,
    rc.created_at,
    rc.user_id,
    COALESCE(p.display_name, 'Citoyen') AS display_name,
    pp.organization_name,
    pp.partner_type
  FROM public.report_comments rc
  LEFT JOIN public.profiles      p  ON p.user_id  = rc.user_id
  LEFT JOIN public.partner_profiles pp ON pp.user_id = rc.user_id
  WHERE rc.report_id = p_report_id
    AND rc.hidden    = false
  ORDER BY rc.created_at ASC;
$$;
GRANT EXECUTE ON FUNCTION get_report_comments(UUID) TO anon, authenticated;
