-- Security hardening: photo fingerprint registration
-- The fingerprint RPC must be callable only by authenticated users and only for reports they own.

CREATE OR REPLACE FUNCTION public.register_photo_hash(
  p_hash text,
  p_report_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_existing_report_id uuid;
  v_duplicate boolean := false;
BEGIN
  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_hash IS NULL OR LENGTH(TRIM(p_hash)) < 16 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Hash invalide');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.reports
    WHERE id = p_report_id
      AND user_id = v_caller_id
  ) THEN
    RAISE EXCEPTION 'Report ownership check failed';
  END IF;

  SELECT report_id
    INTO v_existing_report_id
  FROM public.photo_fingerprints
  WHERE hash = p_hash
    AND report_id <> p_report_id
  LIMIT 1;

  IF v_existing_report_id IS NOT NULL THEN
    v_duplicate := true;
  ELSE
    INSERT INTO public.photo_fingerprints (hash, report_id, user_id)
    SELECT p_hash, p_report_id, v_caller_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.photo_fingerprints
      WHERE hash = p_hash
        AND report_id = p_report_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', v_duplicate,
    'existing_report_id', v_existing_report_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.register_photo_hash(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.register_photo_hash(text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.register_photo_hash(text, uuid) TO authenticated;
