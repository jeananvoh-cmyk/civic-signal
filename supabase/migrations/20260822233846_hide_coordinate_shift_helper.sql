BEGIN;
REVOKE EXECUTE ON FUNCTION public.public_shift_coordinate(uuid,double precision,text) FROM public,anon,authenticated;
COMMIT;
