BEGIN;

-- relay_config is operational configuration, not a client-side secret store.
DROP POLICY IF EXISTS "Public can read relay_config" ON public.relay_config;
DROP POLICY IF EXISTS "Public can insert relay_config" ON public.relay_config;
DROP POLICY IF EXISTS "Public can update relay_config" ON public.relay_config;
DROP POLICY IF EXISTS "Service role can update relay_config" ON public.relay_config;
DROP POLICY IF EXISTS "Admin can read relay_config" ON public.relay_config;
DROP POLICY IF EXISTS "Admin can write relay_config" ON public.relay_config;

CREATE POLICY "Public can read safe relay_config"
  ON public.relay_config FOR SELECT
  TO anon, authenticated
  USING (key NOT IN ('resend_api_key','notify_partner_internal_key'));

CREATE POLICY "Admins can read relay_config"
  ON public.relay_config FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert relay_config"
  ON public.relay_config FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND key NOT IN ('resend_api_key','notify_partner_internal_key')
  );

CREATE POLICY "Admins can update relay_config"
  ON public.relay_config FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND key NOT IN ('resend_api_key','notify_partner_internal_key')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND key NOT IN ('resend_api_key','notify_partner_internal_key')
  );

CREATE OR REPLACE FUNCTION public.admin_save_relay_config(p_config jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_val text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Accès refusé.' USING ERRCODE = '42501';
  END IF;

  FOR v_key, v_val IN SELECT * FROM jsonb_each_text(COALESCE(p_config, '{}'::jsonb))
  LOOP
    IF v_key IN ('resend_api_key','notify_partner_internal_key') THEN
      RAISE EXCEPTION 'Les secrets doivent être gérés via les secrets des Edge Functions.';
    END IF;

    INSERT INTO public.relay_config (key, value, label, updated_at, updated_by)
    VALUES (v_key, COALESCE(v_val, ''), v_key, NOW(), auth.uid())
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = NOW(),
        updated_by = auth.uid();
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_relay_config(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_relay_config(jsonb) TO authenticated;

DELETE FROM public.relay_config
WHERE key IN ('resend_api_key','notify_partner_internal_key');

COMMIT;
