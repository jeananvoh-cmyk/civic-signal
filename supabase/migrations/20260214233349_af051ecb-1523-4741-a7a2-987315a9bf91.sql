
-- Table to track corroborations (one per user per report)
CREATE TABLE public.corroborations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_id, user_id)
);

ALTER TABLE public.corroborations ENABLE ROW LEVEL SECURITY;

-- Users can see their own corroborations
CREATE POLICY "Users can view own corroborations"
  ON public.corroborations FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all corroborations"
  ON public.corroborations FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- No direct insert/update/delete — managed via RPC only

-- Update corroborate_report to prevent duplicates
CREATE OR REPLACE FUNCTION public.corroborate_report(p_report_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check: active, validated, not own report
  IF NOT EXISTS (
    SELECT 1 FROM public.reports
    WHERE id = p_report_id AND status = 'active' AND validated = true AND user_id != auth.uid()
  ) THEN
    RAISE EXCEPTION 'Impossible de confirmer ce signalement.';
  END IF;

  -- Check: not already corroborated by this user
  IF EXISTS (
    SELECT 1 FROM public.corroborations
    WHERE report_id = p_report_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Vous avez déjà confirmé ce signalement.';
  END IF;

  -- Record corroboration
  INSERT INTO public.corroborations (report_id, user_id) VALUES (p_report_id, auth.uid());

  -- Increment counter
  UPDATE public.reports
  SET verifications = verifications + 1
  WHERE id = p_report_id;
END;
$$;
