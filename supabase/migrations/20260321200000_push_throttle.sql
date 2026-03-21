-- push_throttle: rate-limit commune-level push alerts (1 per hour per commune/quartier/service/event)
-- Referenced by the send-push Edge Function

CREATE TABLE IF NOT EXISTS public.push_throttle (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commune       text NOT NULL,
  quartier      text NOT NULL DEFAULT '',
  service_type  text NOT NULL DEFAULT '',
  event_type    text NOT NULL DEFAULT 'outage',
  last_sent_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(commune, quartier, service_type, event_type)
);

-- No RLS — only accessed via service_role key from Edge Functions
