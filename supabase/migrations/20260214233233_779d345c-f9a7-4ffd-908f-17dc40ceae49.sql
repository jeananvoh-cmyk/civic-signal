
-- Fix resolve_report: add owner check and validated check
CREATE OR REPLACE FUNCTION public.resolve_report(p_report_id uuid, p_resolved_at timestamp with time zone)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.reports 
  SET status = 'resolved', 
      resolved_at = p_resolved_at,
      updated_at = now()
  WHERE id = p_report_id 
    AND user_id = auth.uid()
    AND status = 'active'
    AND validated = true;
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Impossible de résoudre ce signalement.';
  END IF;
END;
$$;

-- Fix corroborate_report: prevent self-corroboration, require validated
CREATE OR REPLACE FUNCTION public.corroborate_report(p_report_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.reports 
  SET verifications = verifications + 1
  WHERE id = p_report_id 
    AND status = 'active'
    AND validated = true
    AND user_id != auth.uid();
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Impossible de confirmer ce signalement.';
  END IF;
END;
$$;
