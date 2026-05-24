-- ============================================================
-- UX EVENTS: table de mesure du funnel citoyen
-- Événements : type_selected, report_submitted, verification_resolved,
--              verification_ongoing, report_deleted
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ux_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event       text NOT NULL,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  properties  jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index pour requêtes analytiques courantes
CREATE INDEX ux_events_event_idx      ON public.ux_events (event);
CREATE INDEX ux_events_created_at_idx ON public.ux_events (created_at DESC);
CREATE INDEX ux_events_user_id_idx    ON public.ux_events (user_id);

-- RLS : tout le monde peut insérer, seuls les admins peuvent lire
ALTER TABLE public.ux_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ux_events_insert"
  ON public.ux_events FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "ux_events_select_admin"
  ON public.ux_events FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );
