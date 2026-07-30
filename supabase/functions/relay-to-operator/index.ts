/**
 * relay-to-operator
 * -----------------
 * Mode : validation manuelle par l'admin uniquement.
 * L'admin sélectionne un groupe (commune + opérateur) depuis le dashboard
 * et envoie UN email consolidé listant tous les quartiers touchés.
 *
 * Supporte : CIE, SODECI, MAIRIE, ONEP, ANARE
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
  operator: "CIE" | "SODECI" | "MAIRIE" | "ONEP" | "ANARE";
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
  const isMairie = operator === "MAIRIE";
  const isCIE = operator === "CIE";
  const isSODECI = operator === "SODECI";
  const isONEP = operator === "ONEP";
  const isANARE = operator === "ANARE";

  const serviceLabel = isCIE
    ? "Coupures d'électricité"
    : isSODECI
      ? "Coupures d'eau"
      : isANARE
        ? "Qualité électricité & Éclairage public (ANARE-CI)"
        : isONEP
          ? "Régulation & Qualité d'eau potable (ONEP)"
          : "Voirie & Infrastructures urbaines";

  const serviceIcon = isCIE || isANARE ? "⚡" : isSODECI || isONEP ? "💧" : "🏗️";

  // Couleur d'accent selon opérateur
  const accentColor = isCIE
    ? "#f59e0b"
    : isSODECI
      ? "#0ea5e9"
      : isANARE
        ? "#d97706"
        : isONEP
          ? "#0284c7"
          : "#16a34a";

  const headerGradient = isCIE
    ? "linear-gradient(135deg,#f59e0b,#d97706)"
    : isSODECI
      ? "linear-gradient(135deg,#0ea5e9,#0284c7)"
      : isANARE
        ? "linear-gradient(135deg,#d97706,#b45309)"
        : isONEP
          ? "linear-gradient(135deg,#0284c7,#0369a1)"
          : "linear-gradient(135deg,#16a34a,#15803d)";

  const totalCitizens = reports.reduce((sum, r) => sum + r.verifications, 0);

  function signaleSince(createdAt: string): string {
    const diffH = Math.round((Date.now() - new Date(createdAt).getTime()) / 3_600_000);
    if (diffH < 1) return "moins d'1h";
    if (diffH < 24) return `${diffH}h`;
    const d = Math.floor(diffH / 24);
    return d === 1 ? "1 jour" : `${d} jours`;
  }

  // Fusionner les signalements par quartier
  const urgencyRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  const byQuartier = new Map<string, { reports: Report[]; maxUrgency: string; totalVerif: number }>();
  for (const r of reports) {
    if (!byQuartier.has(r.quartier)) {
      byQuartier.set(r.quartier, { reports: [], maxUrgency: r.urgency, totalVerif: 0 });
    }
    const entry = byQuartier.get(r.quartier)!;
    entry.reports.push(r);
    entry.totalVerif += r.verifications;
    if ((urgencyRank[r.urgency] ?? 0) > (urgencyRank[entry.maxUrgency] ?? 0)) {
      entry.maxUrgency = r.urgency;
    }
  }

  const citizenColLabel = isMairie
    ? "Citoyens demandant réparation"
    : isANARE || isONEP
      ? "Citoyens/Abonnés ayant réclamé"
      : "Foyers confirmant la panne";

  const reportRows = [...byQuartier.entries()]
    .map(([quartier, entry]) => {
      const oldest = entry.reports.reduce((a, b) =>
        new Date(a.created_at) < new Date(b.created_at) ? a : b,
      );
      const since = signaleSince(oldest.created_at);

      const coordReports = entry.reports.filter((r) => r.latitude && r.longitude);
      const uniqueCoords = coordReports.reduce((acc, r) => {
        const key = `${r.latitude!.toFixed(4)},${r.longitude!.toFixed(4)}`;
        if (!acc.has(key)) acc.set(key, r);
        return acc;
      }, new Map<string, Report>());

      let mapsCell = "—";
      if (uniqueCoords.size === 1) {
        const r = [...uniqueCoords.values()][0];
        mapsCell = `<a href="https://maps.google.com/?q=${r.latitude},${r.longitude}&z=18" style="color:${accentColor};text-decoration:none;font-weight:600;">📍 Voir sur la carte</a>`;
      } else if (uniqueCoords.size > 1) {
        const links = [...uniqueCoords.values()].map((r, i) =>
          `<a href="https://maps.google.com/?q=${r.latitude},${r.longitude}&z=18" style="color:${accentColor};text-decoration:none;margin-right:6px;">📍 Point ${i + 1}</a>`
        ).join("");
        mapsCell = links;
      }

      const descLines = entry.reports
        .slice(0, 2)
        .map((r) => r.description?.trim())
        .filter(Boolean)
        .map((d) => `<div style="font-size:11px;color:#6b7280;margin-top:3px;font-style:italic;">"${escapeHtml(d!.slice(0, 90))}${d!.length > 90 ? "…" : ""}"</div>`)
        .join("");

      const countBadge = entry.reports.length > 1
        ? ` <span style="font-size:11px;color:#6b7280;font-weight:400;">(${entry.reports.length} signalements)</span>`
        : "";

      const urgencyBadge = (isMairie || isANARE) && entry.maxUrgency === "critical"
        ? `<span style="display:inline-block;background:#fee2e2;color:#dc2626;font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;margin-left:6px;text-transform:uppercase;">Urgent</span>`
        : "";

      return `
      <tr style="border-top:1px solid #e5e7eb;">
        <td style="padding:10px 16px;font-size:13px;color:#111827;font-weight:600;vertical-align:top;">${escapeHtml(quartier)}${countBadge}${urgencyBadge}${descLines}</td>
        <td style="padding:10px 16px;font-size:14px;color:${accentColor};font-weight:800;vertical-align:top;text-align:center;">${entry.totalVerif}</td>
        <td style="padding:10px 16px;font-size:13px;color:#6b7280;vertical-align:top;">${since}</td>
        <td style="padding:10px 16px;font-size:13px;vertical-align:top;">${mapsCell}</td>
      </tr>`;
    })
    .join("");

  // ── Salutation et corps personnalisés ────────────────────────────────────────

  const salutation = isMairie
    ? `Monsieur le Directeur des Services Techniques,<br>Monsieur le Maire de la Commune de <strong>${escapeHtml(commune)}</strong>,`
    : isANARE
      ? `Madame, Monsieur,<br>À l'attention de la <strong>Direction de la Régulation ANARE-CI</strong> (Électricité & Éclairage Public)`
      : isONEP
        ? `Madame, Monsieur,<br>À l'attention de la <strong>Direction Générale de l'ONEP</strong> (Office National de l'Eau Potable)`
        : isCIE
          ? `Madame, Monsieur,<br>À l'attention du <strong>Service Clientèle CIE</strong> — Direction Régionale d'Abidjan`
          : `Madame, Monsieur,<br>À l'attention du <strong>Service Clientèle SODECI</strong> — Direction Régionale d'Abidjan`;

  const introBody = isMairie
    ? `
      <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.8;">
        Nous avons l'honneur de vous adresser le présent courrier électronique afin de porter à votre connaissance
        des problèmes de <strong style="color:#111827;">voirie et d'infrastructures urbaines</strong> signalés par les habitants
        de la commune de <strong style="color:#111827;">${escapeHtml(commune)}</strong> via la plateforme citoyenne <strong>SIGNA-CI</strong>.
      </p>`
    : isANARE
      ? `
      <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.8;">
        En votre qualité d'autorité de régulation du secteur de l'électricité, nous vous adressons ce rapport consolidé concernant
        des réclamations sur la <strong style="color:#111827;">qualité du service électrique et les lampadaires/éclairages publics hors service</strong>
        dans la commune de <strong style="color:#111827;">${escapeHtml(commune)}</strong>.
      </p>
      <p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.8;">
        Ces signalements citoyens permettent à l'ANARE-CI de suivre l'efficacité des interventions de rétablissement et d'exercer sa mission de contrôle de la qualité de service au bénéfice des abonnés.
      </p>`
      : isONEP
        ? `
      <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.8;">
        En votre qualité d'office national régissant l'approvisionnement en eau potable, nous vous transmettons ces réclamations citoyennes sur
        la <strong style="color:#111827;">continuité du service et la qualité de l'eau potable</strong> dans la commune de <strong style="color:#111827;">${escapeHtml(commune)}</strong>.
      </p>`
        : `
      <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.8;">
        Des habitants de la commune de <strong style="color:#111827;">${escapeHtml(commune)}</strong>
        ont signalé des ${serviceLabel.toLowerCase()} via l'application citoyenne <strong>SIGNA-CI</strong>.
      </p>`;

  const verifiedBlock = `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;margin-bottom:20px;">
      <tr><td style="padding:14px 16px;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.5px;">Garanties de fiabilité SIGNA-CI</p>
        <ul style="margin:0;padding:0 0 0 18px;font-size:13px;color:#374151;line-height:1.8;">
          <li><strong>Confirmations authentifiées :</strong> signalements vérifiés et corroborés par les habitants.</li>
          <li><strong>Dédoublonnage géographique :</strong> fusion des pannes d'une même zone.</li>
          <li><strong>Validation manuelle admin :</strong> contrôle préalable par l'équipe SIGNA-CI.</li>
        </ul>
      </td></tr>
    </table>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Inter,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.12);">

        <!-- Header bande couleur -->
        <tr>
          <td style="background:${headerGradient};padding:28px 32px;">
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:1.2px;font-weight:600;">
              Transmission d'Incident · SIGNA-CI — Côte d'Ivoire
            </p>
            <h1 style="margin:8px 0 0;font-size:23px;font-weight:800;color:#ffffff;line-height:1.2;">
              ${serviceIcon} ${serviceLabel}
            </h1>
            <p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,0.92);line-height:1.6;">
              Commune de <strong>${escapeHtml(commune)}</strong>
              &nbsp;·&nbsp;${byQuartier.size} quartier${byQuartier.size > 1 ? "s" : ""}
              &nbsp;·&nbsp;<strong>${totalCitizens}</strong> citoyen${totalCitizens > 1 ? "s" : ""} concerné${totalCitizens > 1 ? "s" : ""}
            </p>
          </td>
        </tr>

        <!-- Corps -->
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 18px;color:#374151;font-size:14px;line-height:1.8;">
            ${salutation}
          </p>
          ${introBody}
          ${verifiedBlock}

          <!-- Tableau des quartiers -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
            <tr style="background:#f9fafb;">
              <th style="padding:10px 16px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;text-align:left;letter-spacing:0.5px;">Quartier / Zone</th>
              <th style="padding:10px 16px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;text-align:center;letter-spacing:0.5px;">${citizenColLabel}</th>
              <th style="padding:10px 16px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;text-align:left;letter-spacing:0.5px;">Signalé depuis</th>
              <th style="padding:10px 16px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;text-align:left;letter-spacing:0.5px;">Localisation GPS</th>
            </tr>
            ${reportRows}
          </table>

          <p style="margin:0 0 24px;color:#374151;font-size:14px;line-height:1.8;">
            Nous restons à votre disposition pour mesurer et publier l'avancement des actions de résolution en faveur des usagers.
          </p>

          <table width="100%"><tr><td align="center" style="padding-bottom:24px;">
            <a href="https://civic-signal-ten.vercel.app/tableau-de-bord"
               style="background:${headerGradient};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:13px 30px;border-radius:8px;display:inline-block;letter-spacing:0.2px;">
              Voir le suivi en ligne →
            </a>
          </td></tr></table>

          <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.7;border-top:1px solid #e5e7eb;padding-top:20px;">
            Ce message est transmis par <strong>SIGNA-CI</strong>, plateforme citoyenne de suivi des services publics en Côte d'Ivoire.
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
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
      Deno.env.get("RELAY_FROM_EMAIL") ?? "contact@signa.ci";

    const body =
      req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const keyToUse = (body.resend_api_key || resendApiKey || "").trim();

    if (!keyToUse && body.action !== "relay") {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY non configuré" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Vérifier rôle (admin ou moderator dans user_roles ou profiles)
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const rolesSet = new Set<string>();
    if (profile?.role) rolesSet.add(profile.role);
    (userRoles ?? []).forEach((r: { role: string }) => rolesSet.add(r.role));

    const isAllowed = rolesSet.has("admin") || rolesSet.has("moderator");
    if (!isAllowed) {
      return new Response(JSON.stringify({ error: "Accès refusé : Rôle admin ou modérateur requis." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    const emailONEP   = config["email_onep"]   || "reclamation@onep.ci";
    const emailANARE  = config["email_anare"]  || "reclamation@anare.ci";

    const body =
      req.method === "POST" ? await req.json().catch(() => ({})) : {};

    // Mode direct de test de la clé Resend ou d'envoi de secours sans blocage CORS
    if (body.action === "test_email" || body.action === "test_resend_key") {
      const keyToUse = (body.resend_api_key || resendApiKey || "").trim();
      const targetTo = (body.to_email || testEmail || "jeananvoh@gmail.com").trim();
      const subjectToUse = body.subject || "[SIGNA-CI] Test de connexion API Resend";
      const htmlToUse = body.html || "<p>Test de validation de la clé API Resend réussi !</p>";

      if (!keyToUse) {
        return new Response(
          JSON.stringify({ ok: false, error: "Aucune clé API Resend fournie" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const testRes = await sendEmail({
        to: targetTo,
        subject: subjectToUse,
        html: htmlToUse,
        fromEmail,
        apiKey: keyToUse,
      });

      return new Response(
        JSON.stringify({ ok: testRes.ok, error: testRes.error }),
        { status: testRes.ok ? 200 : 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!resendApiKey && !isTestMode) {
      return new Response(
        JSON.stringify({
          error: "RESEND_API_KEY non configuré dans Supabase. Activez le Mode TEST dans l'onglet Paramètres pour simuler l'envoi d'emails.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

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

    const reportIds = (relays as RelayLog[]).map((r) => r.report_id);
    const { data: reports } = await supabase
      .from("reports")
      .select(
        "id, user_id, service_type, commune, quartier, description, verifications, urgency, latitude, longitude, created_at",
      )
      .in("id", reportIds);

    const reportMap = new Map(
      (reports ?? []).map((r: Report) => [r.id, r]),
    );

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

      let resolvedEmail: string;
      if (relay.operator === "CIE") {
        resolvedEmail = emailCIE;
      } else if (relay.operator === "SODECI") {
        resolvedEmail = emailSODECI;
      } else if (relay.operator === "ONEP") {
        resolvedEmail = emailONEP;
      } else if (relay.operator === "ANARE") {
        resolvedEmail = emailANARE;
      } else {
        const slug = report.commune
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "");
        const enabled = config[`mairie_${slug}_enabled`] === "true";
        const email   = config[`mairie_${slug}_email`] ?? "";
        resolvedEmail = (enabled && email) ? email : "";
      }

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
          : group.operator === "SODECI"
            ? "Coupure d'eau"
            : group.operator === "ANARE"
              ? "Qualité Électricité / Lampadaires (ANARE-CI)"
              : group.operator === "ONEP"
                ? "Qualité Eau / Régulation (ONEP)"
                : "Voirie / Infrastructure";
      const quartiersStr = group.reports
        .map((r) => r.quartier)
        .join(", ");
      const subject = `[SIGNA-CI] ${serviceLabel} — ${group.commune} · ${group.reports.length} quartier${group.reports.length > 1 ? "s" : ""} (${quartiersStr})`;
      const html = buildBatchEmailHtml(
        group.operator,
        group.commune,
        group.reports,
      );

      const finalTo = (isTestMode && testEmail) ? testEmail : group.email_to;
      const finalSubject = (isTestMode && testEmail)
        ? `[MODE TEST → ${group.email_to}] ${subject}`
        : `[OFFICIEL · SIGNA-CI] ${subject.replace("[SIGNA-CI] ", "")}`;

      let result: { ok: boolean; error?: string } = { ok: true };
      if (resendApiKey) {
        result = await sendEmail({
          to: finalTo,
          subject: finalSubject,
          html,
          fromEmail,
          apiKey: resendApiKey,
        });
      } else {
        console.log(`[MODE TEST SIMULÉ] Envoi simulé à ${finalTo} (${group.reports.length} signalements)`);
      }

      if (result.ok) {
        await supabase
          .from("relay_logs")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .in("id", group.relayIds);

        const operatorName =
          group.operator === "CIE"
            ? "CIE (Électricité)"
            : group.operator === "SODECI"
              ? "SODECI (Eau)"
              : group.operator === "ANARE"
                ? "ANARE-CI (Régulateur Électricité)"
                : group.operator === "ONEP"
                  ? "ONEP (Régulateur Eau)"
                  : `la Mairie de ${group.commune}`;
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
