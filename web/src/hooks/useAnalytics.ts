import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type EventName =
  | "type_selected"
  | "report_submitted"
  | "verification_resolved"
  | "verification_ongoing"
  | "report_deleted";

export function useAnalytics() {
  const { user } = useAuth();

  const track = useCallback(
    (event: EventName, properties?: Record<string, unknown>) => {
      supabase
        .from("ux_events")
        .insert({ event, user_id: user?.id ?? null, properties: properties ?? {} })
        .then(() => {});
    },
    [user],
  );

  return { track };
}
