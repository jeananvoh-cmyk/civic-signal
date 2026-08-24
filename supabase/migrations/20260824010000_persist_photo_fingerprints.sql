-- Persist client-computed fingerprints without changing the existing report/photo API.
-- The client stores a short-lived pending record keyed by the private Storage path.
-- An AFTER INSERT trigger on reports consumes those records and records fingerprints.

CREATE TABLE IF NOT EXISTS public.photo_fingerprint_pending (
  storage_path text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT photo_fingerprint_pending_hash_check CHECK (hash ~ '^[0-9a-f]{64}$')
);

ALTER TABLE public.photo_fingerprint_pending ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.photo_fingerprint_pending FROM anon;
REVOKE ALL ON TABLE public.photo_fingerprint_pending FROM authenticated;

DROP POLICY IF EXISTS "Users can stage their own photo fingerprints" ON public.photo_fingerprint_pending;
CREATE POLICY "Users can stage their own photo fingerprints"
  ON public.photo_fingerprint_pending
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = user_id
    AND split_part(storage_path, '/', 1) = user_id::text
  );

CREATE OR REPLACE FUNCTION public.consume_pending_photo_fingerprints()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_path text;
  v_hash text;
  v_existing_report_id uuid;
BEGIN
  IF NEW.photo_urls IS NULL THEN
    RETURN NEW;
  END IF;

  FOREACH v_path IN ARRAY NEW.photo_urls LOOP
    SELECT p.hash
      INTO v_hash
    FROM public.photo_fingerprint_pending p
    WHERE p.storage_path = v_path
      AND p.user_id = NEW.user_id
    FOR UPDATE;

    IF v_hash IS NULL THEN
      CONTINUE;
    END IF;

    SELECT pf.report_id
      INTO v_existing_report_id
    FROM public.photo_fingerprints pf
    WHERE pf.hash = v_hash
      AND pf.report_id <> NEW.id
    LIMIT 1;

    IF v_existing_report_id IS NULL THEN
      INSERT INTO public.photo_fingerprints (hash, report_id, user_id)
      VALUES (v_hash, NEW.id, NEW.user_id)
      ON CONFLICT DO NOTHING;
    END IF;

    DELETE FROM public.photo_fingerprint_pending
    WHERE storage_path = v_path
      AND user_id = NEW.user_id;
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_pending_photo_fingerprints() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_pending_photo_fingerprints() FROM anon;
REVOKE ALL ON FUNCTION public.consume_pending_photo_fingerprints() FROM authenticated;

DROP TRIGGER IF EXISTS reports_consume_pending_photo_fingerprints ON public.reports;
CREATE TRIGGER reports_consume_pending_photo_fingerprints
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.consume_pending_photo_fingerprints();

-- Pending rows are intentionally short-lived. They are consumed by the report
-- trigger; stale rows are harmless and can be cleaned by a future scheduled job.
