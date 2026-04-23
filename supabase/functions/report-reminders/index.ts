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

    // Fetch all active reports — outages + infra CIE/SODECI (pas Mairie, traité séparément)
    const { data: reports, error } = await supabase
      .from("reports")
      .select(`
        id, user_id, service_type, commune, quartier, created_at,
        reminder_count, last_reminder_at, report_category, status,
        j3_author_notified, j7_author_notified, description
      `)
      .in("status", ["active", "chronic"])
      .or("report_category.eq.outage,and(report_category.eq.infrastructure,service_type.in.(electricity,water))");

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
    let j3Sent = 0;
    let j7Sent = 0;

    for (const report of reports) {
      const ageMs = now - new Date(report.created_at).getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      const ageDays = ageHours / 24;
      const lastReminderMs = report.last_reminder_at
        ? now - new Date(report.last_reminder_at).getTime()
        : Infinity;
      const lastReminderMinutes = lastReminderMs / (1000 * 60);

      const isInfra = report.report_category === "infrastructure";
      const isElec = report.service_type === "electricity";
      const isWater = report.service_type === "water";

      // Label selon le type réel (coupure vs infra CIE/SODECI)
      const serviceLabel = isInfra
        ? (isElec ? "💡 Infra. CIE" : "🚿 Infra. SODECI")
        : (isElec ? "⚡ Électricité" : "💧 Eau");
      const operatorName = isElec ? "CIE" : "SODECI";

      // Termes adaptés outage vs infra
      const categoryLabel = isInfra ? "problème" : "coupure";
      const actionVerb = isInfra ? "résolu" : "rétabli";
      const verifyVerb = isInfra ? "Confirmez si le problème persiste ou a été résolu" : "Le service est-il rétabli ?";
      const detailUrl = `${APP_URL}/signalement/${report.id}`;
      const verificationUrl = `${APP_URL}/verification`;

      // Format age for display
      const ageDisplay = ageHours < 24
        ? `${Math.floor(ageHours)}h`
        : `${Math.floor(ageDays)}j`;

      const createdDateFr = new Date(report.created_at).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
      });

      // ============================================================
      // JALONS AUTEUR — J+3 et J+7 (envoi unique, indépendant du flux récurrent)
      // ============================================================

      // ── J+3 (72h) : première confirmation auteur ──
      if (ageDays >= 3 && !report.j3_author_notified) {
        // Récupérer le profil du rapporteur pour avoir son numéro
        const { data: profile } = await supabase
          .from("profiles")
          .select("phone, first_name")
          .eq("user_id", report.user_id)
          .maybeSingle();

        const phone = profile?.phone?.replace(/\D/g, "") || null;
        const hasPhone = !!(phone && phone.length >= 8);

        await supabase.from("notifications").insert({
          user_id: report.user_id,
          report_id: report.id,
          title: "⏰ J+3 — Votre signalement est-il toujours d'actualité ?",
          message:
            `${serviceLabel} — ${report.commune}, ${report.quartier} · ` +
            `Votre signalement du ${createdDateFr} n'a pas encore été pris en charge. ` +
            `La ${categoryLabel} est-elle toujours en cours ? ` +
            `Confirmez ou marquez comme résolu → ${verificationUrl}`,
        });
        notificationsInserted++;
        j3Sent++;

        // Marquer J+3 envoyé + flaguer pour contact WhatsApp admin si numéro disponible
        await supabase
          .from("reports")
          .update({
            j3_author_notified: true,
            whatsapp_reminder_needed_at: hasPhone ? new Date().toISOString() : null,
            last_reminder_at: new Date().toISOString(),
            reminder_count: report.reminder_count + 1,
          })
          .eq("id", report.id);

        // Continuer le loop sans déclencher les autres blocs pour ce cycle
        continue;
      }

      // ── J+7 (168h) : deuxième confirmation auteur, plus urgente ──
      if (ageDays >= 7 && !report.j7_author_notified) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("phone, first_name")
          .eq("user_id", report.user_id)
          .maybeSingle();

        const phone = profile?.phone?.replace(/\D/g, "") || null;
        const hasPhone = !!(phone && phone.length >= 8);

        await supabase.from("notifications").insert({
          user_id: report.user_id,
          report_id: report.id,
          title: "🔔 J+7 — Votre signalement sans réponse depuis une semaine",
          message:
            `${serviceLabel} — ${report.commune}, ${report.quartier} · ` +
            `Une semaine s'est écoulée sans prise en charge. ` +
            `Partagez votre signalement pour mobiliser votre quartier, ` +
            `ou marquez-le comme résolu si la situation s'est améliorée → ${verificationUrl}`,
        });
        notificationsInserted++;
        j7Sent++;

        await supabase
          .from("reports")
          .update({
            j7_author_notified: true,
            // Rafraîchir le marquage WhatsApp à J+7 si pas encore traité
            whatsapp_reminder_needed_at: hasPhone ? new Date().toISOString() : null,
            last_reminder_at: new Date().toISOString(),
            reminder_count: report.reminder_count + 1,
          })
          .eq("id", report.id);

        continue;
      }

      // ============================================================
      // FLUX RÉCURRENT (inchangé)
      // ============================================================

      // ── 14 jours → CHRONIC ──
      if (ageDays >= 14 && report.status !== "chronic") {
        await supabase
          .from("reports")
          .update({
            status: "chronic",
            urgency: "critical",
            last_reminder_at: new Date().toISOString(),
            reminder_count: report.reminder_count + 1,
          })
          .eq("id", report.id);
        expired14d++;

        // Notifier l'auteur
        await supabase.from("notifications").insert({
          user_id: report.user_id,
          report_id: report.id,
          title: "🔴 Problème chronique — 14 jours sans intervention",
          message:
            `${serviceLabel} — ${report.commune}, ${report.quartier} · ` +
            `Ce ${categoryLabel} dure depuis 14 jours sans intervention de ${operatorName}. ` +
            `Il est désormais classé "Problème chronique" et reste visible publiquement ` +
            `pour maintenir la pression. → ${detailUrl}`,
        });
        notificationsInserted++;

        // Notifier tous les admins et modérateurs — escalade automatique
        const { data: adminRoles } = await supabase
          .from("user_roles")
          .select("user_id")
          .in("role", ["admin", "moderator"]);

        if (adminRoles && adminRoles.length > 0) {
          const adminIds = adminRoles.map((r: any) => r.user_id).filter((uid: string) => uid !== report.user_id);
          if (adminIds.length > 0) {
            const categoryFull = isInfra ? `problème d'infrastructure` : `coupure de ${isElec ? "courant" : "d'eau"}`;
            await supabase.from("notifications").insert(
              adminIds.map((uid: string) => ({
                user_id: uid,
                report_id: report.id,
                title: "🚨 Escalade J+14 — Intervention requise",
                message:
                  `${serviceLabel} — ${report.commune}, ${report.quartier}\n` +
                  `📅 14 jours sans intervention · Classé "Problème chronique"\n` +
                  `⚠️ Opérateur responsable : ${operatorName}\n` +
                  `📋 Type : ${categoryFull}\n` +
                  `→ Actions disponibles dans le dashboard admin (onglet Escalades)\n` +
                  `→ Signalement : ${detailUrl}`,
              }))
            );
            notificationsInserted += adminIds.length;
          }
        }

        // Notifier les voisins du même quartier
        const { data: neighbors } = await supabase
          .from("reports")
          .select("user_id")
          .eq("quartier", report.quartier)
          .eq("service_type", report.service_type)
          .eq("report_category", report.report_category)
          .in("status", ["active", "chronic"])
          .neq("id", report.id)
          .neq("user_id", report.user_id);

        if (neighbors && neighbors.length > 0) {
          const uniqueNeighborIds = [...new Set(neighbors.map((n: any) => n.user_id))];
          await supabase.from("notifications").insert(
            uniqueNeighborIds.map((uid) => ({
              user_id: uid,
              report_id: report.id,
              title: "⚠️ Problème chronique dans votre quartier",
              message:
                `${serviceLabel} — ${report.quartier}, ${report.commune} · ` +
                `Un ${categoryLabel} dure depuis 14 jours sans intervention de ${operatorName}. ` +
                `Partagez-le pour amplifier la pression collective. → ${detailUrl}`,
            }))
          );
          notificationsInserted += uniqueNeighborIds.length;
        }

        continue;
      }

      // Ignorer les signalements déjà chroniques (flux récurrent)
      if (report.status === "chronic") continue;

      // ── 24h+ : alerte critique + CTA résolution (toutes les heures) ──
      let shouldRemind = false;
      let reminderTitle = "";
      let reminderMessage = "";

      if (ageHours >= 24 && lastReminderMinutes >= 55) {
        const { count } = await supabase
          .from("reports")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .eq("quartier", report.quartier)
          .eq("service_type", report.service_type)
          .eq("report_category", report.report_category);

        if ((count || 0) >= 10) {
          await supabase
            .from("reports")
            .update({
              urgency: "critical",
              last_reminder_at: new Date().toISOString(),
              reminder_count: report.reminder_count + 1,
            })
            .eq("id", report.id);
          escalated++;

          reminderTitle = isInfra
            ? `🔴 Infra. ${operatorName} — ${ageDisplay} sans intervention`
            : `🔴 Coupure critique — ${ageDisplay} sans rétablissement`;
          reminderMessage =
            `${serviceLabel} — ${report.commune}, ${report.quartier} · ` +
            `${count} signalements dans la zone. Urgence escaladée. ` +
            `${verifyVerb} → ${detailUrl}`;
        } else {
          await supabase
            .from("reports")
            .update({
              last_reminder_at: new Date().toISOString(),
              reminder_count: report.reminder_count + 1,
            })
            .eq("id", report.id);

          reminderTitle = isInfra
            ? `🔴 ${ageDisplay} — problème ${operatorName} toujours présent ?`
            : `🔴 ${ageDisplay} de coupure — service rétabli ?`;
          reminderMessage =
            `${serviceLabel} — ${report.commune}, ${report.quartier} · ` +
            `Le ${categoryLabel} dure depuis ${ageDisplay}. ` +
            `${verifyVerb} → ${detailUrl}`;
        }

        shouldRemind = true;

      // ── 10h–24h : rappel toutes les 3 heures ──
      } else if (ageHours >= 10 && ageHours < 24 && lastReminderMinutes >= 175) {
        shouldRemind = true;
        reminderTitle = isInfra
          ? `🟠 ${ageDisplay} — problème ${operatorName} toujours présent ?`
          : `🟠 ${ageDisplay} de coupure — toujours actif ?`;
        reminderMessage =
          `${serviceLabel} — ${report.commune}, ${report.quartier} · ` +
          `Signalé il y a ${ageDisplay}. ` +
          `${verifyVerb} → ${detailUrl}`;

      // ── 6h : 2e rappel ──
      } else if (ageHours >= 6 && ageHours < 10 && report.reminder_count < 2) {
        shouldRemind = true;
        reminderTitle = isInfra ? `🟠 Problème ${operatorName} — toujours présent ?` : "🟠 Toujours sans service ?";
        reminderMessage =
          `${serviceLabel} — ${report.commune}, ${report.quartier} · ` +
          `Signalé il y a ~6h. ${verifyVerb} → ${detailUrl}`;

      // ── 3h : 1er rappel ──
      } else if (ageHours >= 3 && ageHours < 6 && report.reminder_count < 1) {
        shouldRemind = true;
        reminderTitle = isInfra ? `⏰ Problème ${operatorName} — résolu ?` : "⏰ Coupure toujours active ?";
        reminderMessage =
          `${serviceLabel} — ${report.commune}, ${report.quartier} · ` +
          `Signalé il y a ~3h. ${verifyVerb} → ${detailUrl}`;
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
        chronicified: expired14d,
        j3_sent: j3Sent,
        j7_sent: j7Sent,
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
