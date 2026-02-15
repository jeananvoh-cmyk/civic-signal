
-- Table pour historiser les suppressions de signalements
CREATE TABLE public.report_deletions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid NOT NULL,
  user_id uuid NOT NULL,
  reason text NOT NULL,
  service_type text NOT NULL,
  commune text NOT NULL DEFAULT '',
  quartier text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.report_deletions ENABLE ROW LEVEL SECURITY;

-- Seul l'utilisateur peut insérer sa propre suppression
CREATE POLICY "Users can insert own deletions"
ON public.report_deletions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Seul l'utilisateur peut voir ses propres suppressions
CREATE POLICY "Users can view own deletions"
ON public.report_deletions FOR SELECT
USING (auth.uid() = user_id);

-- Les admins peuvent tout voir
CREATE POLICY "Admins can view all deletions"
ON public.report_deletions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
