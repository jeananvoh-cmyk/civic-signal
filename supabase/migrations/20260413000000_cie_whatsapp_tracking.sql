-- Migration: CIE WhatsApp tracking
-- Adds meter number, contract type, and CIE ticket tracking to reports

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS meter_number        TEXT,
  ADD COLUMN IF NOT EXISTS contract_type       TEXT CHECK (contract_type IN ('prepaid', 'postpaid')),
  ADD COLUMN IF NOT EXISTS cie_ticket_number   TEXT,
  ADD COLUMN IF NOT EXISTS cie_ticket_submitted_at TIMESTAMPTZ;

-- Index for looking up reports by CIE ticket number
CREATE INDEX IF NOT EXISTS idx_reports_cie_ticket
  ON reports (cie_ticket_number)
  WHERE cie_ticket_number IS NOT NULL;

-- Allow users to update their own report's CIE ticket number
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'reports'
      AND policyname = 'users_update_own_cie_ticket'
  ) THEN
    EXECUTE '
      CREATE POLICY "users_update_own_cie_ticket" ON reports
        FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id)
    ';
  END IF;
END
$$;

COMMENT ON COLUMN reports.meter_number IS 'Numéro de compteur CIE/SODECI fourni par l''utilisateur';
COMMENT ON COLUMN reports.contract_type IS 'Type de contrat : prepaid (Prépayé) ou postpaid (Postpayé)';
COMMENT ON COLUMN reports.cie_ticket_number IS 'Numéro de sollicitation CIE reçu par WhatsApp (ex: DEP-BT 043 04 2026 1219)';
COMMENT ON COLUMN reports.cie_ticket_submitted_at IS 'Date à laquelle le ticket CIE a été soumis par l''utilisateur';
