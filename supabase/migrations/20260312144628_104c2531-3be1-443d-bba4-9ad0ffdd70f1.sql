
-- 1. RPC to find existing similar reports in same quartier (for duplicate detection)
CREATE OR REPLACE FUNCTION public.find_similar_reports(
  p_commune text,
  p_quartier text,
  p_service_type text,
  p_report_category text DEFAULT 'outage'
)
RETURNS TABLE(
  id uuid,
  service_type text,
  description text,
  verifications integer,
  created_at timestamptz,
  start_time timestamptz,
  user_id uuid
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    r.id,
    r.service_type,
    LEFT(r.description, 120) AS description,
    r.verifications,
    r.created_at,
    r.start_time,
    r.user_id
  FROM public.reports r
  WHERE r.status = 'active'
    AND r.validated = true
    AND LOWER(r.commune) = LOWER(p_commune)
    AND LOWER(r.quartier) = LOWER(p_quartier)
    AND r.service_type = p_service_type
    AND r.report_category = p_report_category
    AND r.created_at > (NOW() - INTERVAL '24 hours')
  ORDER BY r.verifications DESC, r.created_at DESC
  LIMIT 5;
$$;

-- 2. Update corroborate_report to send commune-wide notifications at 3+ confirmations
CREATE OR REPLACE FUNCTION public.corroborate_report(p_report_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_author_id uuid;
  v_service_type text;
  v_commune text;
  v_quartier text;
  v_new_count integer;
  v_service_label text;
  v_caller_id uuid;
BEGIN
  v_caller_id := auth.uid();
  
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié.';
  END IF;

  -- Check: active, validated, not own report
  IF NOT EXISTS (
    SELECT 1 FROM public.reports
    WHERE id = p_report_id AND status = 'active' AND validated = true AND user_id != v_caller_id
  ) THEN
    RAISE EXCEPTION 'Impossible de confirmer ce signalement.';
  END IF;

  -- Check: not already corroborated by this user
  IF EXISTS (
    SELECT 1 FROM public.corroborations
    WHERE report_id = p_report_id AND user_id = v_caller_id
  ) THEN
    RAISE EXCEPTION 'Vous avez déjà confirmé ce signalement.';
  END IF;

  -- Get report info
  SELECT user_id, service_type, commune, quartier, verifications + 1
  INTO v_author_id, v_service_type, v_commune, v_quartier, v_new_count
  FROM public.reports
  WHERE id = p_report_id;

  -- Record corroboration
  INSERT INTO public.corroborations (report_id, user_id) VALUES (p_report_id, v_caller_id);

  -- Increment counter
  UPDATE public.reports
  SET verifications = v_new_count
  WHERE id = p_report_id;

  -- Build service label
  IF v_service_type = 'electricity' THEN
    v_service_label := '⚡ Électricité';
  ELSE
    v_service_label := '💧 Eau';
  END IF;

  -- Notify the report author
  INSERT INTO public.notifications (user_id, report_id, title, message)
  VALUES (
    v_author_id,
    p_report_id,
    'Un voisin confirme votre signalement',
    v_service_label || ' — ' || v_commune || ', ' || v_quartier || ' • ' || v_new_count || ' confirmation(s)'
  );

  -- Threshold: after 3 confirmations, auto-escalate to critical urgency
  IF v_new_count >= 3 THEN
    UPDATE public.reports
    SET urgency = 'critical'
    WHERE id = p_report_id AND urgency != 'critical';
  END IF;

  -- NEW: At exactly 3 confirmations, send commune-wide alert (not just quartier)
  IF v_new_count = 3 THEN
    INSERT INTO public.notifications (user_id, report_id, title, message)
    SELECT
      p.user_id,
      p_report_id,
      '🔴 Coupure confirmée dans votre commune',
      v_service_label || ' — ' || v_commune || ', ' || v_quartier || ' • Coupure confirmée par ' || v_new_count || ' voisins. Vérifiez si vous êtes aussi affecté(e).'
    FROM public.profiles p
    WHERE LOWER(p.commune) = LOWER(v_commune)
      AND p.user_id != v_caller_id
      AND p.user_id != v_author_id
      AND p.notifications_enabled = true
      -- Exclude users already notified for this report (quartier neighbors)
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = p.user_id
          AND n.report_id = p_report_id
      )
    LIMIT 2000;
  END IF;
END;
$$;
