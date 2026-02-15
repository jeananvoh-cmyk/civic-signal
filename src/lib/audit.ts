import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "report_validated"
  | "report_rejected"
  | "report_purge_user"
  | "report_purge_commune"
  | "report_purge_all"
  | "role_added"
  | "role_removed";

export type AuditTargetType = "report" | "user" | "commune" | "system";

interface AuditEntry {
  action: AuditAction;
  target_type: AuditTargetType;
  target_id?: string;
  details?: Record<string, unknown>;
}

export const logAudit = async (entry: AuditEntry) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("audit_logs").insert({
    admin_id: user.id,
    action: entry.action,
    target_type: entry.target_type,
    target_id: entry.target_id ?? null,
    details: entry.details ?? {},
  } as any);
};
