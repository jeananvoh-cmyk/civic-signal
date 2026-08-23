-- SIGNA-CI security hardening — Blocks B to E
-- Production was updated before this file was committed. Keep this migration
-- aligned with the already-applied production state.

-- B: partner report projection; no direct report-table SELECT for partners.
REVOKE ALL ON FUNCTION public.get_partner_reports() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_partner_reports() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_partner_reports() TO authenticated;

-- B: similarity search must never be anonymous.
REVOKE ALL ON FUNCTION public.find_similar_reports(text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.find_similar_reports(text,text,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.find_similar_reports(text,text,text,text) TO authenticated;

-- B/D: idempotency for offline report submissions.
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS client_submission_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS reports_client_submission_id_uidx
  ON public.reports(client_submission_id)
  WHERE client_submission_id IS NOT NULL;

-- D: HEIC originals are not accepted by the client upload bucket until a
-- server-side EXIF-cleaning pipeline exists. This prevents the client fallback
-- path from storing raw EXIF-bearing HEIC originals.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/gif','image/webp']
WHERE id='report-photos';

-- C: atomic public-data deletion function, called only by the authenticated
-- user's delete-account Edge Function. Audit records are retained.
CREATE OR REPLACE FUNCTION public.delete_user_account_data(
  p_user_id uuid,
  p_reason text DEFAULT 'Non spécifié'
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  DELETE FROM public.corroborations WHERE user_id=p_user_id;
  DELETE FROM public.repair_confirmations WHERE user_id=p_user_id;
  DELETE FROM public.report_comments WHERE user_id=p_user_id;
  DELETE FROM public.report_support_votes WHERE user_id=p_user_id;
  DELETE FROM public.photo_fingerprints WHERE user_id=p_user_id;
  DELETE FROM public.push_subscriptions WHERE user_id=p_user_id;
  DELETE FROM public.commune_subscriptions WHERE user_id=p_user_id;
  DELETE FROM public.electricity_readings WHERE user_id=p_user_id;
  DELETE FROM public.electricity_recharges WHERE user_id=p_user_id;
  DELETE FROM public.electricity_meters WHERE user_id=p_user_id;
  DELETE FROM public.ux_events WHERE user_id=p_user_id;
  DELETE FROM public.notifications WHERE user_id=p_user_id;
  DELETE FROM public.partner_profiles WHERE user_id=p_user_id;
  DELETE FROM public.reports WHERE user_id=p_user_id;
  INSERT INTO public.report_deletions(report_id,user_id,reason,service_type,description)
  VALUES ('00000000-0000-0000-0000-000000000000',p_user_id,
    '[SUPPRESSION COMPTE] '||left(coalesce(p_reason,'Non spécifié'),500),
    'account','Suppression complète du compte utilisateur');
  DELETE FROM public.profiles WHERE user_id=p_user_id;
  DELETE FROM public.user_roles WHERE user_id=p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_user_account_data(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account_data(uuid,text) TO authenticated;

-- C: daily OCR quota, default 20 requests/user/day.
CREATE TABLE IF NOT EXISTS public.meter_ocr_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  request_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY(user_id,usage_date),
  CHECK(request_count >= 0)
);
ALTER TABLE public.meter_ocr_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.meter_ocr_usage FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.consume_meter_ocr_quota(p_daily_limit integer DEFAULT 20)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE
  v_user uuid:=auth.uid();
  v_count integer;
BEGIN
  IF v_user IS NULL THEN RETURN false; END IF;
  INSERT INTO public.meter_ocr_usage(user_id,usage_date,request_count)
  VALUES(v_user,CURRENT_DATE,1)
  ON CONFLICT(user_id,usage_date)
  DO UPDATE SET request_count=public.meter_ocr_usage.request_count+1
  RETURNING request_count INTO v_count;
  IF v_count > greatest(1,least(p_daily_limit,100)) THEN
    UPDATE public.meter_ocr_usage SET request_count=request_count-1
    WHERE user_id=v_user AND usage_date=CURRENT_DATE;
    RETURN false;
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_meter_ocr_quota(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.consume_meter_ocr_quota(integer) TO authenticated;
