-- ============================================================
-- FIX RELAY LOGS RLS & RPC UPDATE
-- Permet la mise à jour sans restriction RLS du statut des relais envoyés
-- ============================================================

-- 1. Autoriser l'update et l'insert sur relay_logs pour tous les rôles
DROP POLICY IF EXISTS "Public can update relay_logs" ON public.relay_logs;
CREATE POLICY "Public can update relay_logs"
  ON public.relay_logs FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can insert relay_logs" ON public.relay_logs;
CREATE POLICY "Public can insert relay_logs"
  ON public.relay_logs FOR INSERT
  WITH CHECK (true);

-- 2. RPC SECURITY DEFINER pour marquer les relais comme "sent"
CREATE OR REPLACE FUNCTION public.admin_mark_relay_sent(p_relay_ids text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.relay_logs
  SET status = 'sent',
      sent_at = NOW()
  WHERE id::text = ANY(p_relay_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_mark_relay_sent(text[]) TO authenticated, anon;
