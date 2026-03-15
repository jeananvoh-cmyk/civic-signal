-- ============================================================
-- RELAY LOGS — traçabilité des transmissions vers CIE/SODECI
-- ============================================================

CREATE TABLE public.relay_logs (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id     UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  operator      TEXT NOT NULL CHECK (operator IN ('CIE', 'SODECI', 'MAIRIE')),
  email_to      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'error')),
  error_message TEXT,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at       TIMESTAMP WITH TIME ZONE,
  CONSTRAINT relay_logs_report_unique UNIQUE (report_id)
);

-- Index pour les relays en attente (traitement par la cron)
CREATE INDEX idx_relay_logs_pending ON public.relay_logs (status) WHERE status = 'pending';

-- RLS : lecture publique (compteur dashboard), écriture service role uniquement
ALTER TABLE public.relay_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read relay_logs"
  ON public.relay_logs FOR SELECT
  USING (true);

-- ============================================================
-- TRIGGER — insère un relay_log quand verifications atteint 2
-- ============================================================

CREATE OR REPLACE FUNCTION public.trigger_relay_on_verification()
RETURNS TRIGGER AS $$
DECLARE
  v_operator TEXT;
  v_email    TEXT;
BEGIN
  -- Déclencher uniquement quand on passe le seuil de 2 vérifications
  -- et seulement pour les signalements de type 'outage'
  IF NEW.verifications >= 2
     AND OLD.verifications < 2
     AND NEW.report_category = 'outage'
  THEN
    -- Déterminer l'opérateur et l'email destinataire
    IF NEW.service_type = 'electricity' THEN
      v_operator := 'CIE';
      v_email    := 'reclamation@cie.ci';
    ELSE
      v_operator := 'SODECI';
      v_email    := 'reclamation@sodeci.ci';
    END IF;

    -- Insérer en ignorant si déjà existant (sécurité doublon)
    INSERT INTO public.relay_logs (report_id, operator, email_to, status)
    VALUES (NEW.id, v_operator, v_email, 'pending')
    ON CONFLICT (report_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_report_verified
  AFTER UPDATE OF verifications ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_relay_on_verification();

-- ============================================================
-- CRON — traiter les relays en attente toutes les 5 minutes
-- ============================================================

SELECT cron.schedule(
  'process-relay-queue',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url     := current_setting('app.settings.supabase_url') || '/functions/v1/relay-to-operator',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body    := '{}'::jsonb
    );
  $$
);
