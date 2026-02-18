
-- 1. Fix get_reports_time_series: validate p_days and use make_interval
CREATE OR REPLACE FUNCTION public.get_reports_time_series(p_days integer DEFAULT 90)
RETURNS TABLE(report_date date, commune text, service_type text, actifs bigint, resolus bigint, total bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_days < 1 OR p_days > 365 THEN
    RAISE EXCEPTION 'p_days must be between 1 and 365';
  END IF;

  RETURN QUERY
  SELECT 
    d.report_date,
    c.nom AS commune,
    COALESCE(r.service_type, 'electricity') AS service_type,
    COUNT(r.id) FILTER (WHERE r.status = 'active') AS actifs,
    COUNT(r.id) FILTER (WHERE r.status = 'resolved') AS resolus,
    COUNT(r.id) AS total
  FROM generate_series(
    (CURRENT_DATE - make_interval(days => p_days))::date,
    CURRENT_DATE,
    '1 day'::interval
  ) AS d(report_date)
  CROSS JOIN public.communes c
  LEFT JOIN public.reports r 
    ON r.created_at::date = d.report_date 
    AND LOWER(r.commune) = LOWER(c.nom)
    AND r.validated = true
  GROUP BY d.report_date, c.nom, r.service_type
  ORDER BY d.report_date ASC, c.nom ASC;
END;
$function$;

-- 2. Fix get_commune_quartier_stats: validate p_commune length
CREATE OR REPLACE FUNCTION public.get_commune_quartier_stats(p_commune text)
RETURNS TABLE(quartier text, electricite_actifs bigint, electricite_resolus bigint, electricite_total bigint, eau_actifs bigint, eau_resolus bigint, eau_total bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_commune IS NULL OR LENGTH(p_commune) < 1 OR LENGTH(p_commune) > 100 THEN
    RAISE EXCEPTION 'Invalid commune name';
  END IF;

  RETURN QUERY
  SELECT
    r.quartier,
    COUNT(*) FILTER (WHERE r.service_type = 'electricity' AND r.status = 'active') AS electricite_actifs,
    COUNT(*) FILTER (WHERE r.service_type = 'electricity' AND r.status = 'resolved') AS electricite_resolus,
    COUNT(*) FILTER (WHERE r.service_type = 'electricity') AS electricite_total,
    COUNT(*) FILTER (WHERE r.service_type = 'water' AND r.status = 'active') AS eau_actifs,
    COUNT(*) FILTER (WHERE r.service_type = 'water' AND r.status = 'resolved') AS eau_resolus,
    COUNT(*) FILTER (WHERE r.service_type = 'water') AS eau_total
  FROM reports r
  WHERE LOWER(r.commune) = LOWER(p_commune)
    AND r.validated = true
    AND r.quartier <> ''
  GROUP BY r.quartier
  ORDER BY (COUNT(*) FILTER (WHERE r.status = 'active')) DESC, r.quartier;
END;
$function$;

-- 3. Fix get_quartier_vulnerable_stats: validate p_commune length
CREATE OR REPLACE FUNCTION public.get_quartier_vulnerable_stats(p_commune text)
RETURNS TABLE(quartier text, total_actifs bigint, total_impacted bigint, total_babies bigint, total_pregnant bigint, total_elderly bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_commune IS NULL OR LENGTH(p_commune) < 1 OR LENGTH(p_commune) > 100 THEN
    RAISE EXCEPTION 'Invalid commune name';
  END IF;

  RETURN QUERY
  SELECT
    r.quartier,
    COUNT(r.id) FILTER (WHERE r.status = 'active') AS total_actifs,
    COALESCE(SUM(r.impacted_people) FILTER (WHERE r.status = 'active'), 0) AS total_impacted,
    COALESCE(SUM(r.babies) FILTER (WHERE r.status = 'active'), 0) AS total_babies,
    COALESCE(SUM(r.pregnant) FILTER (WHERE r.status = 'active'), 0) AS total_pregnant,
    COALESCE(SUM(r.elderly) FILTER (WHERE r.status = 'active'), 0) AS total_elderly
  FROM reports r
  WHERE LOWER(r.commune) = LOWER(p_commune)
    AND r.validated = true
    AND r.quartier <> ''
  GROUP BY r.quartier
  ORDER BY COALESCE(SUM(r.babies), 0) + COALESCE(SUM(r.pregnant), 0) + COALESCE(SUM(r.elderly), 0) DESC, r.quartier;
END;
$function$;

-- 4. Fix broadcast_admin_message: add length validation on title/message
CREATE OR REPLACE FUNCTION public.broadcast_admin_message(
  target_commune text,
  target_quartier text DEFAULT ''::text,
  p_title text DEFAULT 'Information'::text,
  p_message text DEFAULT ''::text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sender_id uuid;
  v_count integer;
BEGIN
  v_sender_id := auth.uid();
  
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié.';
  END IF;

  IF NOT (has_role(v_sender_id, 'admin') OR has_role(v_sender_id, 'moderator')) THEN
    RAISE EXCEPTION 'Accès refusé.';
  END IF;

  IF LENGTH(target_commune) < 1 OR LENGTH(target_commune) > 100 THEN
    RAISE EXCEPTION 'Nom de commune invalide.';
  END IF;

  IF LENGTH(p_title) > 200 THEN
    RAISE EXCEPTION 'Titre trop long (max 200 caractères).';
  END IF;

  IF LENGTH(p_message) > 1000 THEN
    RAISE EXCEPTION 'Message trop long (max 1000 caractères).';
  END IF;

  INSERT INTO public.admin_messages (sender_id, commune, quartier, title, message)
  VALUES (v_sender_id, target_commune, target_quartier, p_title, p_message);

  INSERT INTO public.notifications (user_id, report_id, title, message)
  SELECT
    p.user_id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    p_title,
    '📢 ' || p_message
  FROM public.profiles p
  WHERE LOWER(p.commune) = LOWER(target_commune)
    AND (target_quartier = '' OR LOWER(p.quartier) = LOWER(target_quartier))
    AND p.notifications_enabled = true
    AND p.user_id != v_sender_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;
