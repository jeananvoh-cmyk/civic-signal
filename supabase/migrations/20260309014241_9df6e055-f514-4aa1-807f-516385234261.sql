-- Add repair_verifications to reports if it doesn't exist
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS repair_verifications integer DEFAULT 0;

-- Create repair_confirmations table
CREATE TABLE IF NOT EXISTS public.repair_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(report_id, user_id)
);

-- Enable RLS
ALTER TABLE public.repair_confirmations ENABLE ROW LEVEL SECURITY;

-- Policies for repair_confirmations
DROP POLICY IF EXISTS "Anyone can read repair confirmations" ON public.repair_confirmations;
CREATE POLICY "Anyone can read repair confirmations" 
ON public.repair_confirmations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can view all repair confirmations" ON public.repair_confirmations;
CREATE POLICY "Admins can view all repair confirmations" 
ON public.repair_confirmations FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to confirm repair
CREATE OR REPLACE FUNCTION public.confirm_repair(p_report_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_new_count integer;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.reports
    WHERE id = p_report_id AND status = 'active' AND validated = true
  ) THEN
    RAISE EXCEPTION 'Impossible de confirmer la réparation de ce signalement.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.repair_confirmations
    WHERE report_id = p_report_id AND user_id = v_caller_id
  ) THEN
    RAISE EXCEPTION 'Vous avez déjà confirmé la réparation.';
  END IF;

  -- Verify user is not confirming their own report's repair through this function if we wanted, 
  -- but actually it's fine if they do, although they could use 'Mes signalements'. Let's allow it.

  INSERT INTO public.repair_confirmations (report_id, user_id) VALUES (p_report_id, v_caller_id);

  UPDATE public.reports
  SET repair_verifications = repair_verifications + 1
  WHERE id = p_report_id
  RETURNING repair_verifications INTO v_new_count;

  -- Auto resolve if 3 confirmations
  IF v_new_count >= 3 THEN
    UPDATE public.reports 
    SET status = 'resolved', 
        resolved_at = now(),
        updated_at = now(),
        latitude = NULL,
        longitude = NULL
    WHERE id = p_report_id;
    
    DELETE FROM public.notifications
    WHERE report_id = p_report_id AND read = false AND title = 'Coupure signalée dans votre quartier';
  END IF;
END;
$$;

-- Create function for admin resolution
CREATE OR REPLACE FUNCTION public.admin_resolve_report(p_report_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL OR NOT (has_role(v_caller_id, 'admin') OR has_role(v_caller_id, 'moderator')) THEN
    RAISE EXCEPTION 'Accès refusé.';
  END IF;

  UPDATE public.reports 
  SET status = 'resolved', 
      resolved_at = now(),
      updated_at = now(),
      latitude = NULL,
      longitude = NULL
  WHERE id = p_report_id;

  DELETE FROM public.notifications
  WHERE report_id = p_report_id AND read = false AND title = 'Coupure signalée dans votre quartier';
END;
$$;
