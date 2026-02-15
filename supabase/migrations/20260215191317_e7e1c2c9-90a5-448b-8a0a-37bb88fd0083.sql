
-- ============================================================
-- 1. RATE LIMITING TRIGGER: max 5 reports per minute per user
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_report_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  -- Count reports from this user in the last 60 seconds
  SELECT COUNT(*) INTO v_count
  FROM public.reports
  WHERE user_id = NEW.user_id
    AND created_at > (NOW() - INTERVAL '1 minute');

  IF v_count >= 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded: maximum 5 reports per minute per user.';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER check_report_rate_limit_trigger
  BEFORE INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.check_report_rate_limit();

-- ============================================================
-- 2. NOTIFICATION DEDUP: skip if same quartier notified < 2min ago
-- ============================================================

-- Replace notify_neighbors with dedup logic
CREATE OR REPLACE FUNCTION public.notify_neighbors()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_service_label TEXT;
  v_commune TEXT;
  v_quartier TEXT;
  v_inserted INT;
  v_recent_count INT;
BEGIN
  v_commune := NEW.commune;
  v_quartier := NEW.quartier;

  -- Skip if commune or quartier is empty
  IF v_commune = '' OR v_quartier = '' THEN
    RETURN NEW;
  END IF;

  -- DEDUP: Skip notification if same service_type in same quartier was notified < 2min ago
  SELECT COUNT(*) INTO v_recent_count
  FROM public.notifications n
  WHERE n.title = 'Coupure signalée dans votre quartier'
    AND n.created_at > (NOW() - INTERVAL '2 minutes')
    AND n.message LIKE '%' || v_quartier || '%'
    AND n.message LIKE CASE WHEN NEW.service_type = 'electricity' THEN '%Électricité%' ELSE '%Eau%' END
  LIMIT 1;

  IF v_recent_count > 0 THEN
    -- Skip: neighbors already notified recently for same type in same quartier
    RETURN NEW;
  END IF;

  IF NEW.service_type = 'electricity' THEN
    v_service_label := '⚡ Électricité';
  ELSE
    v_service_label := '💧 Eau';
  END IF;

  -- Insert notifications with a cap of 1000 recipients
  INSERT INTO public.notifications (user_id, report_id, title, message)
  SELECT
    p.user_id,
    NEW.id,
    'Coupure signalée dans votre quartier',
    v_service_label || ' — ' || v_commune || ', ' || v_quartier
  FROM public.profiles p
  WHERE LOWER(p.commune) = LOWER(v_commune)
    AND LOWER(p.quartier) = LOWER(v_quartier)
    AND p.user_id != NEW.user_id
    AND p.notifications_enabled = true
  LIMIT 1000;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted = 1000 THEN
    RAISE LOG 'notify_neighbors: fan-out cap reached for report % in %/%', NEW.id, v_commune, v_quartier;
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================
-- 3. INDEX for rate limit check performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_reports_user_created_recent
  ON public.reports (user_id, created_at DESC);
