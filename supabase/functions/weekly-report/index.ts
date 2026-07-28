/**
 * weekly-report — Rapport hebdomadaire pour les admins et modérateurs
 *
 * Déclenché chaque lundi à 8h00 via pg_cron.
 * Envoie une notification interne à chaque admin/modérateur avec :
 * - Nombre de nouveaux signalements (7 derniers jours)
 * - Signalements non pris en charge depuis +7 jours (0 corroboration)
 * - Signalements résolus cette semaine
 * - Signalements passés en "chronique" cette semaine
 * - Top 3 des communes les plus touchées
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const APP_URL = "https://signa.ci";

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // ── Récupérer les admins et modérateurs ──
    const { data: adminRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "moderator"]);

    if (rolesError) throw rolesError;
    if (!adminRoles || adminRoles.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no admins" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Stats en parallèle ──
    const [
      newReportsRes,
      resolvedRes,
      neglectedRes,
      chronicRes,
      communeRes,
    ] = await Promise.all([
      // Nouveaux signalements cette semaine
      supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo),

      // Résolus cette semaine
      supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "resolved")
        .gte("resolved_at", sevenDaysAgo),

      // Négligés : actifs, validés, 0 corroboration, >7j
      supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .in("status", ["active", "chronic"])
        .eq("validated", true)
        .eq("verifications", 0)
        .lt("created_at", sevenDaysAgo),

      // Passés en "chronique" cette semaine (14j+)
      supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "chronic")
        .gte("updated_at", sevenDaysAgo),

      // Top communes actives (non résolues)
      supabase
        .from("reports")
        .select("commune")
        .in("status", ["active", "chronic"])
        .eq("validated", true),
    ]);

    const newCount     = newReportsRes.count   ?? 0;
    const resolvedCount = resolvedRes.count    ?? 0;
    const neglectedCount = neglectedRes.count  ?? 0;
    const chronicCount  = chronicRes.count     ?? 0;

    // Top 3 communes
    const communeMap: Record<string, number> = {};
    for (const row of communeRes.data ?? []) {
      communeMap[row.commune] = (communeMap[row.commune] || 0) + 1;
    }
    const topCommunes = Object.entries(communeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => `${name} (${count})`)
      .join(", ") || "–";

    // ── Construire le message ──
    const weekLabel = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const statusIcon = neglectedCount > 5 ? "🔴" : neglectedCount > 0 ? "🟡" : "🟢";

    const title = `📊 Rapport hebdo SIGNA-CI — ${weekLabel}`;
    const message =
      `Semaine du ${new Date(sevenDaysAgo).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} :\n` +
      `• ${newCount} nouveau${newCount > 1 ? "x" : ""} signalement${newCount > 1 ? "s" : ""}\n` +
      `• ${resolvedCount} résolu${resolvedCount > 1 ? "s" : ""} ✅\n` +
      `• ${neglectedCount} négligé${neglectedCount > 1 ? "s" : ""} (+7j sans corroboration) ${statusIcon}\n` +
      `• ${chronicCount} passé${chronicCount > 1 ? "s" : ""} en état chronique 🔴\n` +
      `• Top communes actives : ${topCommunes}\n` +
      `→ Tableau admin : ${APP_URL}/admin`;

    // ── Envoyer la notification à tous les admins ──
    const adminIds = adminRoles.map((r: { user_id: string }) => r.user_id);
    await supabase.from("notifications").insert(
      adminIds.map((uid: string) => ({
        user_id: uid,
        report_id: null,
        title,
        message,
      }))
    );

    return new Response(
      JSON.stringify({
        sent: adminIds.length,
        stats: { newCount, resolvedCount, neglectedCount, chronicCount, topCommunes },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
