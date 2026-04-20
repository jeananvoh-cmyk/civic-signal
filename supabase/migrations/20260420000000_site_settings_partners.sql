-- Migration: add partners_enabled and forwarded_to_operator_at
-- partners_enabled : admin toggle pour masquer/afficher la page Partenaires
-- forwarded_to_operator_at : timestamp quand un signalement est transmis à l'opérateur

-- Insert partners_enabled setting (default: true = visible)
INSERT INTO site_settings (key, value)
VALUES ('partners_enabled', true)
ON CONFLICT (key) DO NOTHING;

-- Insert forwarded_to_operator_at column on reports
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS forwarded_to_operator_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS forwarded_to_operator_by UUID REFERENCES auth.users(id);

COMMENT ON COLUMN reports.forwarded_to_operator_at IS 'Date à laquelle le signalement a été transmis à l''opérateur (CIE, SODECI, Mairie) par un admin';
COMMENT ON COLUMN reports.forwarded_to_operator_by IS 'Admin qui a marqué le signalement comme transmis';
