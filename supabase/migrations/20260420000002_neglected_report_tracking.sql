-- Suivi des jalons de notification auteur (J+3 et J+7)
-- et marquage pour contact WhatsApp par l'admin

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS j3_author_notified   BOOLEAN      DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS j7_author_notified   BOOLEAN      DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS whatsapp_reminder_needed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.reports.j3_author_notified   IS 'TRUE quand la notification de confirmation J+3 a été envoyée à l''auteur';
COMMENT ON COLUMN public.reports.j7_author_notified   IS 'TRUE quand la notification de confirmation J+7 a été envoyée à l''auteur';
COMMENT ON COLUMN public.reports.whatsapp_reminder_needed_at IS 'Non nul quand l''auteur a un numéro enregistré et doit être contacté par WhatsApp — visible dans le tableau admin "Négligés"';
