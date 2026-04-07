import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch all active outage reports with age in hours
    const { data: reports, error } = await supabase
      .from("reports")
      .select("id, user_id, service_type, commune, quartier, created_at, reminder_count, last_reminder_at, report_category")
      .eq("status", "active")
      .eq("report_category", "outage");

    if (error) throw error;
    if (!reports || reports.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = Date.now();
    const APP_URL = "https://signa.ci";
    let notificationsInserted = 0;
    let archived = 0;
    let escalated = 0;
    let expired14d = 0;

    for (const report of reports) {
      const ageMs = now - new Date(report.created_at).getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      const ageDays = ageHours / 24;
      const lastReminderMs = report.last_reminder_at
        ? now - new Date(report.last_reminder_at).getTime()
        : Infinity;
      const lastReminderMinutes = lastReminderMs / (1000 * 60);

      // Determine if we should send a reminder
      let shouldRemind = false;
      let reminderTitle = "";
      let reminderMessage = "";
      const serviceLabel =
        report.service_type === "electricity" ? "⚡ Électricité" : "💧 Eau";
      const detailUrl = `${APP_URL}/signalement/${report.id}`;

      // Format age for display
      const ageDisplay = ageHours < 24
        ? `${Math.floor(ageHours)}h`
        : `${Math.floor(ageDays)}j`;

      // ============ 14-DAY AUTO-EXPIRATION ============
      if (ageDays >= 14) {
        await supabase
          .from("reports")
          .update({
            status: "expired",
            last_reminder_at: new Date().toISOString(),
            reminder_count: report.reminder_count + 1,
            latitude: null,
            longitude: null,
          })
          .eq("id", report.id);
        expired14d++;

        await supabase.from("notifications").insert({
          user_id: report.user_id,
          report_id: report.id,
          title: "⚫ Signalement expiré automatiquement",
          message: `${serviceLabel} — ${report.commune}, ${report.quartier} · 14 jours sans résolution. Si la coupure persiste, faites un nouveau signalement. → ${detailUrl}`,
        });
        notificationsInserted++;

        // Clean up unread neighbor notifications
        await supabase
          .from("notifications")
          .delete()
          .eq("report_id", report.id)
          .eq("read", false)
          .eq("title", "Coupure signalée dans votre quartier");

        continue;
      }

      // ============ 24h+ : alerte critique + CTA résolution (toutes les heures) ============
      if (ageHours >= 24 && lastReminderMinutes >= 55) {
        const { count } = await supabase
          .from("reports")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .eq("quartier", report.quartier)
          .eq("service_type", report.service_type)
          .eq("report_category", "outage");

        if ((count || 0) >= 10) {
          // Escalate to critical
          await supabase
            .from("reports")
            .update({ urgency: "critical", last_reminder_at: new Date().toISOString(), reminder_count: report.reminder_count + 1 })
            .eq("id", report.id);
          escalated++;

          reminderTitle = `🔴 Coupure critique — ${ageDisplay} sans rétablissement`;
          reminderMessage = `${serviceLabel} — ${report.commune}, ${report.quartier} · ${count} signalements dans la zone. Urgence escaladée. Le service est-il rétabli ? → ${detailUrl}`;
        } else {
          await supabase
            .from("reports")
            .update({
              last_reminder_at: new Date().toISOString(),
              reminder_count: report.reminder_count + 1,
            })
            .eq("id", report.id);

          reminderTitle = `🔴 ${ageDisplay} de coupure — service rétabli ?`;
          reminderMessage = `${serviceLabel} — ${report.commune}, ${report.quartier} · La coupure dure depuis ${ageDisplay}. Ouvrez votre signalement pour indiquer si le service est rétabli ou toujours coupé. → ${detailUrl}`;
        }

        await supabase.from("notifications").insert({
          user_id: report.user_id,
          report_id: report.id,
          title: reminderTitle,
          message: reminderMessage,
        });
        notificationsInserted++;

        continue;
      }

      // ============ 10h–24h : rappel toutes les 3 heures ============
      if (ageHours >= 10 && ageHours < 24 && lastReminderMinutes >= 175) {
        shouldRemind = true;
        reminderTitle = `🟠 ${ageDisplay} de coupure — toujours actif ?`;
        reminderMessage = `${serviceLabel} — ${report.commune}, ${report.quartier} · Signalée il y a ${ageDisplay}. Confirmez si la coupure continue ou marquez comme résolu. → ${detailUrl}`;

      // ============ 6h : 2e rappel ============
      } else if (ageHours >= 6 && ageHours < 10 && report.reminder_count < 2) {
        shouldRemind = true;
        reminderTitle = "🟠 Toujours sans service ?";
        reminderMessage = `${serviceLabel} — ${report.commune}, ${report.quartier} · Coupure signalée il y a ~6h. Toujours affecté ? → ${detailUrl}`;

      // ============ 3h : 1er rappel ============
      } else if (ageHours >= 3 && ageHours < 6 && report.reminder_count < 1) {
        shouldRemind = true;
        reminderTitle = "⏰ Coupure toujours active ?";
        reminderMessage = `${serviceLabel} — ${report.commune}, ${report.quartier} · Signalée il y a ~3h. Le service est-il rétabli ? → ${detailUrl}`;
      }

      if (shouldRemind) {
        await supabase.from("notifications").insert({
          user_id: report.user_id,
          report_id: report.id,
          title: reminderTitle,
          message: reminderMessage,
        });

        await supabase
          .from("reports")
          .update({
            last_reminder_at: new Date().toISOString(),
            reminder_count: report.reminder_count + 1,
          })
          .eq("id", report.id);

        notificationsInserted++;
      }
    }

    return new Response(
      JSON.stringify({
        processed: reports.length,
        notifications: notificationsInserted,
        archived,
        escalated,
        expired14d,
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
