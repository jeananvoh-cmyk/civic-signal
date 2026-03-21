-- commune_subscriptions: allows users to follow communes beyond their own profile commune
-- Used by the send-push Edge Function to send commune-wide alerts

CREATE TABLE IF NOT EXISTS public.commune_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commune    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, commune)
);

ALTER TABLE public.commune_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users manage their own subscriptions
CREATE POLICY "Users manage own commune subscriptions"
  ON public.commune_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fast lookup by commune (used by Edge Function via service_role)
CREATE INDEX idx_commune_subscriptions_commune
  ON public.commune_subscriptions(commune);

-- RPC: get the list of communes a user is subscribed to
CREATE OR REPLACE FUNCTION get_my_commune_subscriptions()
RETURNS TEXT[]
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT ARRAY_AGG(commune ORDER BY commune)
  FROM public.commune_subscriptions
  WHERE user_id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION get_my_commune_subscriptions() TO authenticated;
