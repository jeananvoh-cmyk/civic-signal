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
    let notificationsInserted = 0;
    let archived = 0;
    let escalated = 0;

    for (const report of reports) {
      const ageMs = now - new Date(report.created_at).getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
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

      if (ageHours >= 24) {
        // T=24h: final reminder + archive or escalate
        // Count active reports in same quartier + service_type
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

          reminderTitle = "🔴 Coupure critique — 24h sans réponse";
          reminderMessage = `${serviceLabel} — ${report.commune}, ${report.quartier} • Signalement escaladé en urgence critique (${count} signalements dans la zone)`;
        } else {
          // Archive as expired
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
          archived++;

          reminderTitle = "Signalement archivé — 24h sans réponse";
          reminderMessage = `${serviceLabel} — ${report.commune}, ${report.quartier} • Votre signalement a été archivé automatiquement après 24h.`;
        }

        // Send final notification
        await supabase.from("notifications").insert({
          user_id: report.user_id,
          report_id: report.id,
          title: reminderTitle,
          message: reminderMessage,
        });
        notificationsInserted++;

        // Clean up unread neighbor notifications for archived reports
        if ((count || 0) < 10) {
          await supabase
            .from("notifications")
            .delete()
            .eq("report_id", report.id)
            .eq("read", false)
            .eq("title", "Coupure signalée dans votre quartier");
        }

        continue;
      }

      // Determine reminder schedule
      if (ageHours >= 10 && lastReminderMinutes >= 55) {
        // Hourly reminders from 10h to 24h
        shouldRemind = true;
        reminderTitle = "⏰ Coupure toujours active ?";
        reminderMessage = `${serviceLabel} — ${report.commune}, ${report.quartier} • Signalée il y a ${Math.floor(ageHours)}h. Confirmez ou marquez comme résolu.`;
      } else if (ageHours >= 6 && report.reminder_count < 2) {
        // 2nd reminder at ~6h
        shouldRemind = true;
        reminderTitle = "⏰ Toujours sans service ?";
        reminderMessage = `${serviceLabel} — ${report.commune}, ${report.quartier} • Coupure signalée il y a ~6h. Toujours affecté ?`;
      } else if (ageHours >= 3 && report.reminder_count < 1) {
        // 1st reminder at ~3h
        shouldRemind = true;
        reminderTitle = "⏰ Coupure toujours active ?";
        reminderMessage = `${serviceLabel} — ${report.commune}, ${report.quartier} • Coupure signalée il y a ~3h. Le service est-il rétabli ?`;
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
