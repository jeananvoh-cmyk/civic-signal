BEGIN;
CREATE OR REPLACE FUNCTION public.public_shift_coordinate(p_report_id uuid,p_value double precision,p_axis text) RETURNS double precision LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_secret text; v_hash bytea; v_byte integer; v_magnitude double precision; v_sign double precision;
BEGIN
 IF p_value IS NULL THEN RETURN NULL; END IF;
 SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name='civic_signal_public_coordinate_pepper' LIMIT 1;
 IF v_secret IS NULL THEN RETURN round(p_value::numeric,2)::double precision; END IF;
 v_hash:=extensions.hmac(p_report_id::text||':'||coalesce(p_axis,''),v_secret,'sha256');
 v_byte:=get_byte(v_hash,0); v_magnitude:=0.0015+(get_byte(v_hash,1)::double precision/255.0)*0.0010; v_sign:=CASE WHEN (v_byte%2)=0 THEN 1 ELSE -1 END;
 RETURN round((p_value+v_sign*v_magnitude)::numeric,6)::double precision;
END; $$;
COMMIT;
