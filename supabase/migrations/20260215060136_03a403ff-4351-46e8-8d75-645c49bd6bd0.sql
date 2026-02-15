-- Update resolve_report to automatically delete GPS coordinates when a report is resolved
CREATE OR REPLACE FUNCTION public.resolve_report(p_report_id uuid, p_resolved_at timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_service_type text;
  v_commune text;
  v_quartier text;
  v_service_label text;
BEGIN
  UPDATE public.reports 
  SET status = 'resolved', 
      resolved_at = p_resolved_at,
      updated_at = now(),
      latitude = NULL,
      longitude = NULL
  WHERE id = p_report_id 
    AND user_id = auth.uid()
    AND status = 'active'
    AND validated = true;
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Impossible de résoudre ce signalement.';
  END IF;

  -- Get report info for notification
  SELECT service_type, commune, quartier INTO v_service_type, v_commune, v_quartier
  FROM public.reports WHERE id = p_report_id;

  IF v_service_type = 'electricity' THEN
    v_service_label := '⚡ Électricité';
  ELSE
    v_service_label := '💧 Eau';
  END IF;

  -- Delete unread neighbor notifications for this report
  DELETE FROM public.notifications
  WHERE report_id = p_report_id
    AND read = false
    AND title = 'Coupure signalée dans votre quartier';

  -- Notify confirmants who don't have their own active reports
  INSERT INTO public.notifications (user_id, report_id, title, message)
  SELECT
    c.user_id,
    p_report_id,
    'Service rétabli dans votre quartier',
    v_service_label || ' — ' || v_commune || ', ' || v_quartier || ' • Le service a été rétabli !'
  FROM public.corroborations c
  WHERE c.report_id = p_report_id
    AND NOT EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.user_id = c.user_id
        AND r.status = 'active'
        AND r.validated = true
    );
END;
$function$;

-- Also clean GPS from already-resolved reports (retroactive)
UPDATE public.reports 
SET latitude = NULL, longitude = NULL 
WHERE status = 'resolved' AND (latitude IS NOT NULL OR longitude IS NOT NULL);