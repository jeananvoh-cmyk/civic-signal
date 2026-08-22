-- Security hardening applied to production on 2026-08-22.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.operator_update_ticket(text,uuid,text,text,text,text,timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_relay_report(uuid,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reopen_infrastructure_report(uuid,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.confirm_repair(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.confirm_repair_with_geo(uuid,double precision,double precision,double precision) FROM anon;
COMMIT;
