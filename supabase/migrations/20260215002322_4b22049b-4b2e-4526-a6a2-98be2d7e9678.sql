
-- Table de notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  report_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Allow system inserts (trigger runs as SECURITY DEFINER)
CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Index for fast lookup
CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, read) WHERE read = false;

-- Function to notify neighbors on new report
CREATE OR REPLACE FUNCTION public.notify_neighbors()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_service_label TEXT;
  v_commune TEXT;
  v_quartier TEXT;
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

  -- Insert notifications for all users in same commune + quartier (except reporter)
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
    AND p.notifications_enabled = true;

  RETURN NEW;
END;
$$;

-- Trigger on new validated report
CREATE TRIGGER trg_notify_neighbors
AFTER INSERT ON public.reports
FOR EACH ROW
WHEN (NEW.validated = true)
EXECUTE FUNCTION public.notify_neighbors();
