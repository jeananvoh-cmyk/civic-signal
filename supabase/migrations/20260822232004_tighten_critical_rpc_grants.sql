-- Idempotent record of the critical RPC grant tightening.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.operator_update_ticket(text,uuid,text,text,text,text,timestamptz) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.admin_relay_report(uuid,text,text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.reopen_infrastructure_report(uuid,text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.confirm_repair(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.confirm_repair_with_geo(uuid,double precision,double precision,double precision) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.operator_update_ticket(text,uuid,text,text,text,text,timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_relay_report(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_infrastructure_report(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_repair(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_repair_with_geo(uuid,double precision,double precision,double precision) TO authenticated;
COMMIT;
