-- ============================================================
-- RPC & RLS: Allow author to update description of their active report
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_report_description(
  p_report_id uuid,
  p_description text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF LENGTH(TRIM(p_description)) < 5 THEN
    RAISE EXCEPTION 'La description doit comporter au moins 5 caractères';
  END IF;

  UPDATE public.reports
  SET description = TRIM(p_description),
      updated_at = NOW()
  WHERE id = p_report_id
    AND (user_id = v_user_id OR public.has_role(v_user_id, 'admin') OR public.has_role(v_user_id, 'moderator'))
    AND status = 'active';

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_report_description(uuid, text) TO authenticated;

-- RLS Policy allowing authors to update their own active reports (e.g. description)
DROP POLICY IF EXISTS "Users can update own active report" ON public.reports;
CREATE POLICY "Users can update own active report"
  ON public.reports FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'active')
  WITH CHECK (auth.uid() = user_id AND status = 'active');
