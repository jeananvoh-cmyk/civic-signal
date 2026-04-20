-- Migration: WhatsApp relay tracking on relay_logs
-- SIGNA acts as intermediary between citizens and CIE/SODECI via WhatsApp

ALTER TABLE relay_logs
  ADD COLUMN IF NOT EXISTS wa_sent_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cie_ticket_number   TEXT,
  ADD COLUMN IF NOT EXISTS cie_ticket_at       TIMESTAMPTZ;

-- Status check: allows 'wa_sent' implicit via wa_sent_at column (no enum change needed)

COMMENT ON COLUMN relay_logs.wa_sent_at        IS 'Horodatage de l''envoi WhatsApp à la CIE/SODECI par l''admin SIGNA-CI';
COMMENT ON COLUMN relay_logs.cie_ticket_number IS 'Numéro de ticket reçu en réponse de la CIE (ex: DEP-BT 043 04 2026 1219)';
COMMENT ON COLUMN relay_logs.cie_ticket_at     IS 'Date d''enregistrement du ticket CIE';
