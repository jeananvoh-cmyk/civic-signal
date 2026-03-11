
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS electricity_client_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS electricity_meter_ref text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS electricity_meter_number text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS water_client_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS water_meter_ref text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS water_meter_number text NOT NULL DEFAULT '';
