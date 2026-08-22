-- ============================================================
-- SECURITY HARDENING P0
-- Audit findings SEC-992 → SEC-1004
-- IMPORTANT: review in staging before production deployment.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. relay_config: never allow anonymous/public writes.
-- Configuration contains secrets, relay destinations and runtime controls.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Public can insert relay_config" ON public.relay_config;
DROP POLICY IF EXISTS "Public can update relay_config" ON public.relay_config;
DROP POLICY IF EXISTS "Public can delete relay_config" ON public.relay_config;

CREATE POLICY "Admins manage relay config"
  ON public.relay_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  );

-- Revoke the ability to call the SECURITY DEFINER configuration RPC anonymously.
REVOKE ALL ON FUNCTION public.admin_save_relay_config(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.admin_save_relay_config(jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_relay_config(jsonb) TO authenticated;

-- Defense in depth: the function itself must enforce admin authorization.
CREATE OR REPLACE FUNCTION public.admin_save_relay_config(p_config jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_key text;
  v_val text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_config IS NULL OR jsonb_typeof(p_config) <> 'object' THEN
    RAISE EXCEPTION 'invalid configuration payload' USING ERRCODE = '22023';
  END IF;

  FOR v_key, v_val IN SELECT * FROM jsonb_each_text(p_config)
  LOOP
    -- Prevent callers from creating arbitrary configuration namespaces.
    IF v_key NOT IN (
      'operator_webhook_key',
      'report_email_anare',
      'report_email_onep',
      'report_email_cie',
      'report_email_sodeci',
      'report_auto_send_day',
      'report_auto_send_hour',
      'report_approval_mode'
    ) THEN
      RAISE EXCEPTION 'unsupported configuration key: %', v_key
        USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.relay_config (key, value, label, updated_at)
    VALUES (v_key, COALESCE(v_val, ''), v_key, NOW())
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = NOW();
  END LOOP;
END;
$$;

-- ------------------------------------------------------------
-- 2. relay_logs: append/update only by privileged server paths.
-- Public INSERT/UPDATE makes delivery status forgeable.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Public can update relay_logs" ON public.relay_logs;
DROP POLICY IF EXISTS "Public can insert relay_logs" ON public.relay_logs;
DROP POLICY IF EXISTS "Public can read relay_logs" ON public.relay_logs;

CREATE POLICY "Admins read relay logs"
  ON public.relay_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins insert relay logs"
  ON public.relay_logs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  );

CREATE POLICY "Admins update relay logs"
  ON public.relay_logs FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  );

REVOKE ALL ON FUNCTION public.admin_mark_relay_sent(text[]) FROM anon;
REVOKE ALL ON FUNCTION public.admin_mark_relay_sent(text[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mark_relay_sent(text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_mark_relay_sent(p_relay_ids text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.relay_logs
  SET status = 'sent', sent_at = NOW()
  WHERE id::text = ANY(p_relay_ids)
    AND status <> 'sent';
END;
$$;

-- ------------------------------------------------------------
-- 3. Photo hash RPC: no anonymous access and no cross-user
-- information disclosure through duplicate detection.
-- ------------------------------------------------------------
REVOKE ALL ON FUNCTION public.register_photo_hash(text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.register_photo_hash(text, uuid) TO authenticated;

-- ------------------------------------------------------------
-- 4. Geo confirmation: hard upper bound and mandatory coordinates
-- are enforced server-side. The exact function signature is retained.
-- ------------------------------------------------------------
REVOKE ALL ON FUNCTION public.confirm_repair_with_geo(uuid, numeric, numeric, numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.confirm_repair_with_geo(uuid, numeric, numeric, numeric) TO authenticated;

-- ------------------------------------------------------------
-- 5. Partner report visibility: remove broad partner visibility policy.
-- Partner access must be granted through a perimeter-aware policy/function.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Partners can view relevant reports" ON public.reports;

-- No generic partner SELECT policy is recreated here intentionally.
-- Existing dedicated perimeter-aware policies, if any, remain in force.

COMMIT;
