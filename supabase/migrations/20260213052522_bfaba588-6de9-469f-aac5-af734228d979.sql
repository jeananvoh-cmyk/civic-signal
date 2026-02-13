-- Function to count user's reports created today
CREATE OR REPLACE FUNCTION public.count_user_daily_reports(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM public.reports
  WHERE user_id = p_user_id
    AND created_at >= (NOW() AT TIME ZONE 'Africa/Abidjan')::date::timestamptz
$$;