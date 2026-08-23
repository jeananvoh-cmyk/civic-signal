CREATE OR REPLACE FUNCTION public.get_report_comments(p_report_id uuid)
RETURNS TABLE(id uuid, content text, created_at timestamptz, user_id uuid, display_name text, organization_name text, partner_type text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT c.id,c.content,c.created_at,NULL::uuid,COALESCE(p.display_name,'Utilisateur'),pp.organization_name,pp.partner_type
  FROM public.report_comments c
  JOIN public.reports r ON r.id=c.report_id
  LEFT JOIN public.profiles p ON p.user_id=c.user_id
  LEFT JOIN public.partner_profiles pp ON pp.user_id=c.user_id
  WHERE c.report_id=p_report_id
    AND r.validated=true
    AND r.status IN ('active','chronic','in_progress','open','verified','resolved')
  ORDER BY c.created_at ASC;
END;
$function$;
