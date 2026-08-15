import { supabase } from "@/integrations/supabase/client";

/**
 * Service d'auto-clôture des incidents de coupure après 24h.
 * Si un incident de type coupure (eau/électricité) n'a reçu aucune mise à jour depuis 24h,
 * il passe automatiquement en statut 'auto_closed' (Présumé résolu par délai).
 */
export async function runAutoClosureCheck(): Promise<{ closedCount: number }> {
  try {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 1. Récupérer les signalements de coupures actifs créés il y a +24h
    const { data: eligibleReports, error } = await supabase
      .from("reports")
      .select("id, commune, service_type, created_at, user_id")
      .eq("status", "active")
      .lte("created_at", cutoffDate);

    if (error || !eligibleReports || eligibleReports.length === 0) {
      return { closedCount: 0 };
    }

    const reportIdsToClose = eligibleReports.map((r) => r.id);

    // 2. Mettre à jour les statuts en 'auto_closed'
    const { error: updateError } = await supabase
      .from("reports")
      .update({ status: "auto_closed" } as any)
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
