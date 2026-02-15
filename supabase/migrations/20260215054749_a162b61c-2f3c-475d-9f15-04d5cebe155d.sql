
-- =============================================
-- 1. Table admin_messages pour le broadcast
-- =============================================
CREATE TABLE public.admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  commune text NOT NULL DEFAULT '',
  quartier text NOT NULL DEFAULT '',
  title text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

-- Admins/mods can insert
CREATE POLICY "Admins and mods can insert admin_messages"
  ON public.admin_messages FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Admins/mods can view all
CREATE POLICY "Admins and mods can view admin_messages"
  ON public.admin_messages FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- No update/delete for anyone
CREATE POLICY "No updates on admin_messages"
  ON public.admin_messages FOR UPDATE USING (false);

CREATE POLICY "Only admins can delete admin_messages"
  ON public.admin_messages FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 2. RPC to broadcast a message to users by commune/quartier
-- =============================================
CREATE OR REPLACE FUNCTION public.broadcast_admin_message(
  p_commune text,
  p_quartier text DEFAULT '',
  p_title text DEFAULT 'Information',
  p_message text DEFAULT ''
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id uuid;
  v_count integer;
BEGIN
  v_sender_id := auth.uid();
  
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié.';
  END IF;

  -- Check admin or moderator
  IF NOT (has_role(v_sender_id, 'admin') OR has_role(v_sender_id, 'moderator')) THEN
    RAISE EXCEPTION 'Accès refusé.';
  END IF;

  -- Save the admin message
  INSERT INTO public.admin_messages (sender_id, commune, quartier, title, message)
  VALUES (v_sender_id, p_commune, p_quartier, p_title, p_message);

  -- Insert notifications for targeted users
  INSERT INTO public.notifications (user_id, report_id, title, message)
  SELECT
    p.user_id,
    '00000000-0000-0000-0000-000000000000'::uuid, -- placeholder report_id
    p_title,
    '📢 ' || p_message
  FROM public.profiles p
  WHERE LOWER(p.commune) = LOWER(p_commune)
    AND (p_quartier = '' OR LOWER(p.quartier) = LOWER(p_quartier))
    AND p.notifications_enabled = true
    AND p.user_id != v_sender_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- =============================================
-- 3. Update resolve_report to notify confirmants without active reports
-- =============================================
CREATE OR REPLACE FUNCTION public.resolve_report(p_report_id uuid, p_resolved_at timestamptz)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service_type text;
  v_commune text;
  v_quartier text;
  v_service_label text;
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
$$;
