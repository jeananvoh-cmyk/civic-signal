
-- Update resolve_report to also clean up unread neighbor notifications
CREATE OR REPLACE FUNCTION public.resolve_report(p_report_id uuid, p_resolved_at timestamp with time zone)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Delete unread neighbor notifications for this report
  DELETE FROM public.notifications
  WHERE report_id = p_report_id
    AND read = false
    AND title = 'Coupure signalée dans votre quartier';
END;
$$;

-- Create function to clean up notifications when a report is deleted
CREATE OR REPLACE FUNCTION public.cleanup_report_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete all unread neighbor notifications for the deleted report
  DELETE FROM public.notifications
  WHERE report_id = OLD.id
    AND read = false
    AND title = 'Coupure signalée dans votre quartier';
  RETURN OLD;
END;
$$;

-- Create trigger for report deletion
DROP TRIGGER IF EXISTS cleanup_notifications_on_delete ON public.reports;
CREATE TRIGGER cleanup_notifications_on_delete
BEFORE DELETE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_report_notifications();
