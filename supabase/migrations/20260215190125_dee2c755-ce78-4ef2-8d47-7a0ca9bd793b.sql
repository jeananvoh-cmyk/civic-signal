
-- ============================================================
-- 1. COMPOSITE INDEXES for RPC performance
-- ============================================================

-- Main index used by get_commune_stats, get_commune_service_stats, 
-- get_commune_duration_stats, get_commune_vulnerable_stats
CREATE INDEX IF NOT EXISTS idx_reports_commune_validated_status 
  ON public.reports (commune, validated, status);

-- Used by get_commune_quartier_stats, notify_neighbors
CREATE INDEX IF NOT EXISTS idx_reports_quartier_validated_status 
  ON public.reports (quartier, validated, status);

-- Used by get_public_reports, get_reports_time_series
CREATE INDEX IF NOT EXISTS idx_reports_validated_created 
  ON public.reports (validated, created_at DESC);

-- Used by count_user_daily_reports
CREATE INDEX IF NOT EXISTS idx_reports_user_created 
  ON public.reports (user_id, created_at DESC);

-- Used by notify_neighbors to find neighbors efficiently
CREATE INDEX IF NOT EXISTS idx_profiles_commune_quartier_notif 
  ON public.profiles (commune, quartier) 
  WHERE notifications_enabled = true;

-- Used by notifications realtime + queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
  ON public.notifications (user_id, created_at DESC);

-- ============================================================
-- 2. OPTIMIZED notify_neighbors with fan-out cap (max 1000)
-- ============================================================

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
BEGIN
  v_commune := NEW.commune;
  v_quartier := NEW.quartier;

  -- Skip if commune or quartier is empty
  IF v_commune = '' OR v_quartier = '' THEN
    RETURN NEW;
  END IF;

  IF NEW.service_type = 'electricity' THEN
    v_service_label := '⚡ Électricité';
  ELSE
    v_service_label := '💧 Eau';
  END IF;

  -- Insert notifications with a cap of 1000 recipients to prevent fan-out explosion
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

  -- Log if cap was hit (useful for monitoring)
  IF v_inserted = 1000 THEN
    RAISE LOG 'notify_neighbors: fan-out cap reached for report % in %/%', NEW.id, v_commune, v_quartier;
  END IF;

  RETURN NEW;
END;
$function$;
