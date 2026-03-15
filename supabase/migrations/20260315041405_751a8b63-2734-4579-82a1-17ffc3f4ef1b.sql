
-- Table pour stocker les abonnements push (Web Push API)
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

-- Table de throttle pour limiter les push à 1/heure/quartier/service
CREATE TABLE public.push_throttle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quartier text NOT NULL,
  commune text NOT NULL,
  service_type text NOT NULL,
  event_type text NOT NULL DEFAULT 'outage',
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (commune, quartier, service_type, event_type)
);

-- RLS sur push_subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push subscriptions"
  ON public.push_subscriptions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can read all subscriptions"
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS sur push_throttle (admin only + edge function via service role)
ALTER TABLE public.push_throttle ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage push_throttle"
  ON public.push_throttle FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
