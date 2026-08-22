BEGIN;
REVOKE EXECUTE ON FUNCTION public.trigger_notify_partners() FROM public,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_report_server_fields() FROM public,anon,authenticated;
COMMIT;
