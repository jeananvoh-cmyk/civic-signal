-- ============================================================
-- RPC: admin_mark_relay_sent
-- Permet de marquer les relais comme "sent" avec SECURITY DEFINER
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_mark_relay_sent(p_relay_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  UPDATE public.relay_logs
  SET status = 'sent',
      sent_at = NOW()
  WHERE id = ANY(p_relay_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_mark_relay_sent(uuid[]) TO authenticated, anon;
