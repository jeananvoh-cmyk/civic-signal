/**
 * relay-to-operator
 * -----------------
 * Traite les relay_logs en statut 'pending' et envoie un email
 * formaté à CIE (électricité) ou SODECI (eau) via Resend.
 *
 * Appelé automatiquement toutes les 5 min par pg_cron.
 * Peut aussi être déclenché manuellement via HTTP POST.
 *
 * Variables d'environnement requises (Supabase Secrets) :
 *   RESEND_API_KEY        — clé API Resend (resend.com)
 *   RELAY_FROM_EMAIL      — ex: signaci@civic-signal-ten.vercel.app
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Types ────────────────────────────────────────────────────────────────────

interface RelayLog {
  id: string;
  report_id: string;
  operator: "CIE" | "SODECI" | "MAIRIE";
  email_to: string;
}

interface Report {
  id: string;
  service_type: string;
  report_category: string;
  commune: string;
  quartier: string;
  description: string;
  verifications: number;
  urgency: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

// ── Email builder ─────────────────────────────────────────────────────────────

function buildEmailHtml(report: Report, operator: string): string {
  const serviceLabel = report.service_type === "electricity"
    ? "⚡ Coupure d'électricité"
    : "💧 Coupure d'eau";

  const urgencyLabel: Record<string, string> = {
    low: "Faible",
    medium: "Moyenne",
    high: "Élevée",
    critical: "🔴 CRITIQUE",
  };

  const dateStr = new Date(report.created_at).toLocaleString("fr-FR", {
    timeZone: "Africa/Abidjan",
    dateStyle: "long",
    timeStyle: "short",
  });

  const mapsLink = report.latitude && report.longitude
    ? `https://maps.google.com/?q=${report.latitude},${report.longitude}`
    : null;

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Inter,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0ea5e9,#f59e0b);padding:28px 32px;">
            <table width="100%"><tr>
              <td>
                <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:1px;">
                  Signalement citoyen vérifié — SIGNA-CI
                </p>
                <h1 style="margin:6px 0 0;font-size:22px;font-weight:800;color:#ffffff;">
                  ${serviceLabel}
                </h1>
              </td>
              <td align="right">
                <span style="background:rgba(255,255,255,0.2);color:#fff;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;white-space:nowrap;">
                  ${operator}
                </span>
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- Body -->
        <tr><td style="padding:28px 32px;">

          <p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:1.6;">
            Ce signalement a été <strong style="color:#16a34a;">confirmé par 2 citoyens ou plus</strong>
            dans le même quartier via la plateforme SIGNA-CI.
            Il nécessite votre intervention.
          </p>

          <!-- Details table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
            <tr style="background:#f9fafb;">
              <td colspan="2" style="padding:12px 16px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">
                Détails du signalement
              </td>
            </tr>
            ${row("Commune", `<strong>${report.commune}</strong>`)}
            ${row("Quartier", report.quartier)}
            ${row("Signalé le", dateStr)}
            ${row("Confirmations voisins", `<strong style="color:#16a34a;">${report.verifications} citoyens</strong>`)}
            ${row("Urgence", `<strong>${urgencyLabel[report.urgency] ?? report.urgency}</strong>`)}
            ${report.description ? row("Description", escapeHtml(report.description)) : ""}
            ${mapsLink ? row("Localisation GPS", `<a href="${mapsLink}" style="color:#0ea5e9;">Voir sur la carte →</a>`) : ""}
          </table>

          <!-- Action button -->
          <table width="100%"><tr><td align="center" style="padding-bottom:24px;">
            <a href="https://civic-signal-ten.vercel.app/tableau-de-bord"
               style="background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;display:inline-block;">
              Voir tous les signalements →
            </a>
          </td></tr></table>

          <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;border-top:1px solid #e5e7eb;padding-top:20px;">
            Ce message est envoyé automatiquement par <strong>SIGNA-CI</strong>, plateforme citoyenne de signalement
            des services publics à Abidjan.<br>
            Réf. signalement : <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:11px;">${report.id}</code>
          </p>

        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function row(label: string, value: string): string {
  return `
    <tr style="border-top:1px solid #e5e7eb;">
      <td style="padding:10px 16px;font-size:13px;color:#6b7280;white-space:nowrap;width:40%;">${label}</td>
      <td style="padding:10px 16px;font-size:13px;color:#111827;">${value}</td>
    </tr>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Send via Resend ───────────────────────────────────────────────────────────

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  fromEmail: string;
  apiKey: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      from: `SIGNA-CI <${opts.fromEmail}>`,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: body };
  }
  return { ok: true };
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl      = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey     = Deno.env.get("RESEND_API_KEY");
    const fromEmail        = Deno.env.get("RELAY_FROM_EMAIL") ?? "signaci@civic-signal-ten.vercel.app";

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY non configuré" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Récupérer tous les relays en attente
    const { data: pending, error: fetchErr } = await supabase
      .from("relay_logs")
      .select("id, report_id, operator, email_to")
      .eq("status", "pending")
      .limit(20);

    if (fetchErr) throw fetchErr;
    if (!pending || pending.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: "Aucun relay en attente" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    let errors = 0;

    for (const relay of pending as RelayLog[]) {
      // 2. Charger le signalement
      const { data: report } = await supabase
        .from("reports")
        .select("id, service_type, report_category, commune, quartier, description, verifications, urgency, latitude, longitude, created_at")
        .eq("id", relay.report_id)
        .single();

      if (!report) {
        await supabase
          .from("relay_logs")
          .update({ status: "error", error_message: "Signalement introuvable" })
          .eq("id", relay.id);
        errors++;
        continue;
      }

      const r = report as Report;
      const subject = `[SIGNA-CI] ${r.service_type === "electricity" ? "Coupure d'électricité" : "Coupure d'eau"} — ${r.commune}, ${r.verifications} signalements confirmés`;
      const html = buildEmailHtml(r, relay.operator);

      // 3. Envoyer l'email
      const result = await sendEmail({
        to: relay.email_to,
        subject,
        html,
        fromEmail,
        apiKey: resendApiKey,
      });

      if (result.ok) {
        // 4a. Marquer comme envoyé
        await supabase
          .from("relay_logs")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", relay.id);

        // 4b. Notifier le citoyen
        const operatorName = relay.operator === "CIE" ? "CIE (Électricité)" : "SODECI (Eau)";
        await supabase.from("notifications").insert({
          user_id: r.service_type, // sera remplacé par user_id réel ci-dessous
          report_id: relay.report_id,
          title: `✅ Transmis à ${operatorName}`,
          message: `Votre signalement à ${r.commune} a été transmis automatiquement à ${operatorName} après confirmation par vos voisins.`,
        });

        // Corriger le user_id de la notification (requête séparée pour avoir l'ID)
        const { data: rFull } = await supabase
          .from("reports")
          .select("user_id")
          .eq("id", relay.report_id)
          .single();

        if (rFull) {
          await supabase
            .from("notifications")
            .update({ user_id: rFull.user_id })
            .eq("report_id", relay.report_id)
            .eq("title", `✅ Transmis à ${operatorName}`);
        }

        sent++;
      } else {
        // 4b. Marquer en erreur
        await supabase
          .from("relay_logs")
          .update({ status: "error", error_message: result.error })
          .eq("id", relay.id);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({ processed: pending.length, sent, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
