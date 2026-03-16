/**
 * relay-to-operator
 * -----------------
 * Mode : validation manuelle par l'admin uniquement.
 * L'admin sélectionne un groupe (commune + opérateur) depuis le dashboard
 * et envoie UN email consolidé listant tous les quartiers touchés.
 *
 * Body attendu : { relay_ids: string[] }
 *
 * Variables d'environnement requises (Supabase Secrets) :
 *   RESEND_API_KEY        — clé API Resend (resend.com)
 *   RELAY_FROM_EMAIL      — ex: onboarding@resend.dev
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface RelayLog {
  id: string;
  report_id: string;
  operator: "CIE" | "SODECI" | "MAIRIE";
  email_to: string;
}

interface Report {
  id: string;
  user_id: string;
  service_type: string;
  commune: string;
  quartier: string;
  description: string;
  verifications: number;
  urgency: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

// ── Email HTML consolidé par commune ─────────────────────────────────────────

function buildBatchEmailHtml(
  operator: string,
  commune: string,
  reports: Report[],
): string {
  const serviceLabel =
    operator === "CIE" ? "Coupures d'électricité" : "Coupures d'eau";
  const serviceIcon = operator === "CIE" ? "⚡" : "💧";

  const urgencyLabel: Record<string, string> = {
    low: "Faible",
    medium: "Moyenne",
    high: "Élevée",
    critical: "🔴 CRITIQUE",
  };

  const totalConfirmations = reports.reduce(
    (sum, r) => sum + r.verifications,
    0,
  );
  const hasCritical = reports.some((r) => r.urgency === "critical");

  const reportRows = reports
    .map((r) => {
      const dateStr = new Date(r.created_at).toLocaleString("fr-FR", {
        timeZone: "Africa/Abidjan",
        dateStyle: "short",
        timeStyle: "short",
      });
      const mapsLink =
        r.latitude && r.longitude
          ? `<a href="https://maps.google.com/?q=${r.latitude},${r.longitude}" style="color:#0ea5e9;text-decoration:none;">Voir →</a>`
          : "—";
      const urgColor =
        r.urgency === "critical"
          ? "#dc2626"
          : r.urgency === "high"
            ? "#ea580c"
            : "#374151";
      return `
      <tr style="border-top:1px solid #e5e7eb;">
        <td style="padding:10px 16px;font-size:13px;color:#111827;font-weight:600;">${escapeHtml(r.quartier)}</td>
        <td style="padding:10px 16px;font-size:13px;color:#16a34a;font-weight:700;">${r.verifications}</td>
        <td style="padding:10px 16px;font-size:13px;color:${urgColor};font-weight:${r.urgency === "critical" ? "700" : "400"};">${urgencyLabel[r.urgency] ?? r.urgency}</td>
        <td style="padding:10px 16px;font-size:13px;color:#6b7280;">${dateStr}</td>
        <td style="padding:10px 16px;font-size:13px;">${mapsLink}</td>
      </tr>`;
    })
    .join("");

  const criticalBanner = hasCritical
    ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
        <p style="margin:0;color:#dc2626;font-weight:700;font-size:13px;">
          🔴 Situation CRITIQUE — Intervention urgente requise
        </p>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Inter,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0ea5e9,#f59e0b);padding:28px 32px;">
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:1px;">
              Signalements citoyens vérifiés — SIGNA-CI
            </p>
            <h1 style="margin:6px 0 0;font-size:22px;font-weight:800;color:#ffffff;">
              ${serviceIcon} ${serviceLabel}
            </h1>
            <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.9);">
              Commune de <strong>${escapeHtml(commune)}</strong>
              &nbsp;·&nbsp;${reports.length} quartier${reports.length > 1 ? "s" : ""} touché${reports.length > 1 ? "s" : ""}
              &nbsp;·&nbsp;${totalConfirmations} confirmation${totalConfirmations > 1 ? "s" : ""} citoyennes
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr><td style="padding:28px 32px;">

          ${criticalBanner}

          <p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:1.6;">
            Les signalements ci-dessous ont été <strong style="color:#16a34a;">confirmés par plusieurs citoyens</strong>
            dans la commune de <strong>${escapeHtml(commune)}</strong> via la plateforme SIGNA-CI
            et ont été validés par l'équipe d'administration avant transmission.
          </p>

          <!-- Tableau des quartiers -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
            <tr style="background:#f9fafb;">
              <th style="padding:10px 16px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;text-align:left;">Quartier</th>
              <th style="padding:10px 16px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;text-align:left;">Citoyens</th>
              <th style="padding:10px 16px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;text-align:left;">Urgence</th>
              <th style="padding:10px 16px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;text-align:left;">Signalé le</th>
              <th style="padding:10px 16px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;text-align:left;">GPS</th>
            </tr>
            ${reportRows}
          </table>

          <!-- Bouton -->
          <table width="100%"><tr><td align="center" style="padding-bottom:24px;">
            <a href="https://civic-signal-ten.vercel.app/tableau-de-bord"
               style="background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;display:inline-block;">
              Voir tous les signalements →
            </a>
          </td></tr></table>

          <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;border-top:1px solid #e5e7eb;padding-top:20px;">
            Ce message est envoyé par <strong>SIGNA-CI</strong>, plateforme citoyenne de signalement
            des services publics à Abidjan. Il a été validé manuellement par l'équipe SIGNA-CI
            avant transmission.
          </p>

        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── Envoi via Resend ──────────────────────────────────────────────────────────

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

// ── Handler principal ─────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail =
      Deno.env.get("RELAY_FROM_EMAIL") ?? "onboarding@resend.dev";

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY non configuré" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Lire la config depuis relay_config
    const { data: configRows } = await supabase
      .from("relay_config")
      .select("key, value");
    const config = Object.fromEntries(
      (configRows ?? []).map((r: { key: string; value: string }) => [r.key, r.value]),
    );
    const isTestMode  = config["test_mode"]   === "true";
    const testEmail   = config["test_email"]  ?? "";
    const emailCIE    = config["email_cie"]    || "reclamation@cie.ci";
    const emailSODECI = config["email_sodeci"] || "reclamation@sodeci.ci";

    // relay_ids obligatoires : mode manuel uniquement
    const body =
      req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const { relay_ids } = body as { relay_ids?: string[] };

    if (!relay_ids || relay_ids.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            "relay_ids requis. L'envoi est en mode manuel uniquement — utilisez le dashboard admin.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 1. Charger les relay_logs sélectionnés (pending uniquement)
    const { data: relays, error: relayErr } = await supabase
      .from("relay_logs")
      .select("id, report_id, operator, email_to")
      .in("id", relay_ids)
      .eq("status", "pending");

    if (relayErr) throw relayErr;
    if (!relays || relays.length === 0) {
      return new Response(
        JSON.stringify({
          processed: 0,
          message: "Aucun relay pending trouvé pour ces IDs",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Charger les signalements associés
    const reportIds = (relays as RelayLog[]).map((r) => r.report_id);
    const { data: reports } = await supabase
      .from("reports")
      .select(
        "id, user_id, service_type, commune, quartier, description, verifications, urgency, latitude, longitude, created_at",
      )
      .in("id", reportIds);

    const reportMap = new Map(
      (reports ?? []).map((r: any) => [r.id, r as Report]),
    );

    // 3. Grouper par operator + commune → 1 email par groupe
    type Group = {
      operator: string;
      commune: string;
      email_to: string;
      relayIds: string[];
      reports: Report[];
    };
    const groups = new Map<string, Group>();

    for (const relay of relays as RelayLog[]) {
      const report = reportMap.get(relay.report_id);
      if (!report) continue;

      // Résoudre l'email réel depuis la config
      let resolvedEmail: string;
      if (relay.operator === "CIE") {
        resolvedEmail = emailCIE;
      } else if (relay.operator === "SODECI") {
        resolvedEmail = emailSODECI;
      } else {
        // MAIRIE — email par commune pilote
        const slug = report.commune
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "");
        const enabled = config[`mairie_${slug}_enabled`] === "true";
        const email   = config[`mairie_${slug}_email`] ?? "";
        resolvedEmail = (enabled && email) ? email : "";
      }

      // Mairie non configurée → ignorer ce relay
      if (!resolvedEmail) continue;

      const key = `${relay.operator}::${report.commune}`;
      if (!groups.has(key)) {
        groups.set(key, {
          operator: relay.operator,
          commune: report.commune,
          email_to: resolvedEmail,
          relayIds: [],
          reports: [],
        });
      }
      const g = groups.get(key)!;
      g.relayIds.push(relay.id);
      g.reports.push(report);
    }

    let sent = 0;
    let errors = 0;

    for (const [, group] of groups) {
      const serviceLabel =
        group.operator === "CIE"
          ? "Coupure d'électricité"
          : "Coupure d'eau";
      const quartiersStr = group.reports
        .map((r) => r.quartier)
        .join(", ");
      const subject = `[SIGNA-CI] ${serviceLabel} — ${group.commune} · ${group.reports.length} quartier${group.reports.length > 1 ? "s" : ""} (${quartiersStr})`;
      const html = buildBatchEmailHtml(
        group.operator,
        group.commune,
        group.reports,
      );

      // Mode test : rediriger vers testEmail, sinon email opérateur réel
      const finalTo = (isTestMode && testEmail) ? testEmail : group.email_to;
      const finalSubject = (isTestMode && testEmail)
        ? `[TEST → ${group.email_to}] ${subject}`
        : subject;

      const result = await sendEmail({
        to: finalTo,
        subject: finalSubject,
        html,
        fromEmail,
        apiKey: resendApiKey,
      });

      if (result.ok) {
        // Marquer comme envoyés
        await supabase
          .from("relay_logs")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .in("id", group.relayIds);

        // Notifier automatiquement chaque citoyen concerné
        const operatorName =
          group.operator === "CIE" ? "CIE (Électricité)" : "SODECI (Eau)";
        const notifs = group.reports.map((r) => ({
          user_id: r.user_id,
          report_id: r.id,
          title: `Transmis à ${operatorName}`,
          message: `Votre signalement à ${r.commune} (${r.quartier}) a été validé et transmis à ${operatorName} par l'équipe SIGNA-CI.`,
        }));
        await supabase.from("notifications").insert(notifs);

        sent += group.relayIds.length;
      } else {
        await supabase
          .from("relay_logs")
          .update({ status: "error", error_message: result.error })
          .in("id", group.relayIds);
        errors += group.relayIds.length;
      }
    }

    return new Response(
      JSON.stringify({
        processed: relays.length,
        sent,
        errors,
        groups: groups.size,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
