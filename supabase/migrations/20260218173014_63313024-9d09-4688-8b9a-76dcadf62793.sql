
DROP FUNCTION IF EXISTS public.broadcast_admin_message(text, text, text, text);

CREATE OR REPLACE FUNCTION public.broadcast_admin_message(
  target_commune text,
  target_quartier text DEFAULT ''::text,
  p_title text DEFAULT 'Information'::text,
  p_message text DEFAULT ''::text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sender_id uuid;
  v_count integer;
BEGIN
  v_sender_id := auth.uid();
  
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié.';
  END IF;

  IF NOT (has_role(v_sender_id, 'admin') OR has_role(v_sender_id, 'moderator')) THEN
    RAISE EXCEPTION 'Accès refusé.';
  END IF;

  INSERT INTO public.admin_messages (sender_id, commune, quartier, title, message)
  VALUES (v_sender_id, target_commune, target_quartier, p_title, p_message);

  INSERT INTO public.notifications (user_id, report_id, title, message)
  SELECT
    p.user_id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    p_title,
    '📢 ' || p_message
  FROM public.profiles p
  WHERE LOWER(p.commune) = LOWER(target_commune)
    AND (target_quartier = '' OR LOWER(p.quartier) = LOWER(target_quartier))
    AND p.notifications_enabled = true
    AND p.user_id != v_sender_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;
