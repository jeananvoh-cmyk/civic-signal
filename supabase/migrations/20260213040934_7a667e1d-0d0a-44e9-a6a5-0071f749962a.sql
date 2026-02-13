
-- Fonction pour marquer un signalement comme résolu avec l'heure de retour
CREATE OR REPLACE FUNCTION public.resolve_report(p_report_id uuid, p_resolved_at timestamptz)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.reports 
  SET status = 'resolved', 
      resolved_at = p_resolved_at,
      updated_at = now()
  WHERE id = p_report_id 
    AND status = 'active';
END;
$$;
