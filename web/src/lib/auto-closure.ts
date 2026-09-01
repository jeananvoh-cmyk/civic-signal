import { supabase } from "@/integrations/supabase/client";

/**
 * Service d'auto-clôture des incidents de coupure obsolètes (>7 jours).
 * Si un incident de type coupure (eau/électricité) n'a reçu aucune confirmation ou mise à jour après 7 jours,
 * il passe automatiquement en statut 'resolved' (Présumé rétabli par délai).
 */
export async function runAutoClosureCheck(daysCutoff: number = 7): Promise<{ closedCount: number }> {
  try {
    // 1. Tenter via la fonction RPC sécurisée
    const { data: rpcCount, error: rpcError } = await (supabase as any).rpc("auto_close_stale_outage_reports", {
      p_days: daysCutoff,
    });

    if (!rpcError && typeof rpcCount === "number") {
      return { closedCount: rpcCount };
    }

    // 2. Fallback direct via table reports si RPC non dispo
    const cutoffDate = new Date(Date.now() - daysCutoff * 24 * 60 * 60 * 1000).toISOString();
    const { data: eligibleReports, error } = await supabase
      .from("reports")
      .select("id, commune, service_type, created_at, user_id")
      .eq("status", "active")
      .eq("report_category", "outage")
      .lte("created_at", cutoffDate);

    if (error || !eligibleReports || eligibleReports.length === 0) {
      return { closedCount: 0 };
    }

    const reportIdsToClose = eligibleReports.map((r) => r.id);

    const { error: updateError } = await supabase
      .from("reports")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .in("id", reportIdsToClose);

    if (updateError) {
      console.error("Erreur lors de l'auto-clôture :", updateError);
      return { closedCount: 0 };
    }

    return { closedCount: reportIdsToClose.length };
  } catch (err) {
    console.error("Erreur exécution auto-clôture :", err);
    return { closedCount: 0 };
  }
}
