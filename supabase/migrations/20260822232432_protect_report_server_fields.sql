BEGIN;
CREATE OR REPLACE FUNCTION public.protect_report_server_fields() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'moderator'::app_role) THEN RETURN NEW; END IF;
  NEW.id:=OLD.id; NEW.user_id:=OLD.user_id; NEW.status:=OLD.status; NEW.validated:=OLD.validated; NEW.validated_by:=OLD.validated_by; NEW.validated_at:=OLD.validated_at;
  NEW.verifications:=OLD.verifications; NEW.repair_verifications:=OLD.repair_verifications; NEW.support_count:=OLD.support_count; NEW.urgency:=OLD.urgency; NEW.resolved_at:=OLD.resolved_at; NEW.created_at:=OLD.created_at; NEW.updated_at:=now();
  NEW.last_reminder_at:=OLD.last_reminder_at; NEW.reminder_count:=OLD.reminder_count; NEW.forwarded_to_operator_at:=OLD.forwarded_to_operator_at; NEW.forwarded_to_operator_by:=OLD.forwarded_to_operator_by;
  NEW.j3_author_notified:=OLD.j3_author_notified; NEW.j7_author_notified:=OLD.j7_author_notified; NEW.h24_author_notified:=OLD.h24_author_notified; NEW.whatsapp_reminder_needed_at:=OLD.whatsapp_reminder_needed_at;
  NEW.operator_name:=OLD.operator_name; NEW.operator_reference:=OLD.operator_reference; NEW.operator_last_note:=OLD.operator_last_note; NEW.estimated_resolution_time:=OLD.estimated_resolution_time;
  NEW.cie_ticket_number:=OLD.cie_ticket_number; NEW.cie_ticket_submitted_at:=OLD.cie_ticket_submitted_at; NEW.ticket_code:=OLD.ticket_code;
  NEW.pada_commune_code:=OLD.pada_commune_code; NEW.pada_id_voie:=OLD.pada_id_voie; NEW.pada_street_name:=OLD.pada_street_name; NEW.pada_formatted_address:=OLD.pada_formatted_address; NEW.geom:=OLD.geom;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS protect_report_server_fields ON public.reports;
CREATE TRIGGER protect_report_server_fields BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.protect_report_server_fields();
COMMIT;
