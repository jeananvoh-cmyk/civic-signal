-- ============================================================
-- DAILY REPORT LIMIT TRIGGER: max 5 reports per user per day
-- (Africa/Abidjan timezone)
--
-- Complements the existing burst-rate trigger (5/minute).
-- Prevents API-bypass of the client-side DAILY_LIMIT = 5 check.
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_daily_report_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER;
  v_today DATE;
BEGIN
  v_today := (NOW() AT TIME ZONE 'Africa/Abidjan')::date;

  SELECT COUNT(*) INTO v_count
  FROM public.reports
  WHERE user_id = NEW.user_id
    AND (created_at AT TIME ZONE 'Africa/Abidjan')::date = v_today;

  IF v_count >= 5 THEN
    RAISE EXCEPTION 'daily_limit_exceeded';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER check_daily_report_limit_trigger
  BEFORE INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.check_daily_report_limit();
