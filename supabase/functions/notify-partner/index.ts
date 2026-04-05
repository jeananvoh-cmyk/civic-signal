/**
 * notify-partner
 * --------------
 * Déclenché automatiquement par un trigger PostgreSQL après INSERT dans `reports`.
 * Recherche les comptes partenaires dont le périmètre correspond au signalement,
 * puis envoie un email de notification à chacun via Resend.
 *
 * Body attendu : { report_id: string }
 *
 * Règles de correspondance partenaire → signalement :
 *   - partner_type = 'cie'    → service_type = 'electricity'
 *   - partner_type = 'sodeci' → service_type = 'water'
 *   - partner_type = 'mairie' → report_category = 'infrastructure' ET commune = partner.commune
 *   - partner_type = 'ong'    → tous les signalements
 *
 * Variables d'environnement requises :
 *   RESEND_API_KEY
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

interface Report {
  id: string;
  user_id: string;
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

interface PartnerProfile {
  id: string;
  user_id: string;
  org_name: string;
  partner_type: "cie" | "sodeci" | "mairie" | "ong" | "autre";
  commune: string | null;
  email: string; // joined from auth.users via the view
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return (str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function urgencyLabel(urgency: string): string {
  const map: Record<string, string> = {
    critical: "🔴 Critique",
    high: "🟠 Élevée",
    medium: "🟡 Moyenne",
    low: "🟢 Faible",
  };
  return map[urgency] ?? urgency;
}

function serviceTypeLabel(serviceType: string): string {
  const map: Record<string, string> = {
    electricity: "Électricité",
    water: "Eau",
    road: "Voirie",
    sanitation: "Assainissement",
    lighting: "Éclairage public",
    other: "Autre",
  };
  return map[serviceType] ?? serviceType;
}

// ── Template email ─────────────────────────────────────────────────────────────

function buildNotificationEmail(report: Report, partner: PartnerProfile): string {
  const mapsLink =
    report.latitude && report.longitude
      ? `<a href="https://maps.google.com/?q=${report.latitude},${report.longitude}"
            style="color:#0ea5e9;text-decoration:none;font-weight:600;">
            📍 Voir sur la carte →
         </a>`
      : "";

  const dashboardUrl = "https://civic-signal-ten.vercel.app/partner/dashboard";

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Inter,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0ea5e9,#f59e0b);padding:28px 32px;">
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:1px;">
              Nouveau signalement citoyen — SIGNA-CI
            </p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;color:#ffffff;">
              🏗️ ${escapeHtml(serviceTypeLabel(report.service_type))}
            </h1>
            <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.9);">
              Commune de <strong>${escapeHtml(report.commune)}</strong>
              &nbsp;·&nbsp;Quartier <strong>${escapeHtml(report.quartier)}</strong>
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr><td style="padding:28px 32px;">

          <p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.7;">
            Bonjour <strong>${escapeHtml(partner.org_name)}</strong>,<br><br>
            Un nouveau signalement relevant de votre périmètre vient d'être enregistré
            sur la plateforme <strong>SIGNA-CI</strong>.
          </p>

          <!-- Fiche signalement -->
          <table width="100%" cellpadding="0" cellspacing="0"
                 style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
            <tr style="background:#f9fafb;">
              <td colspan="2" style="padding:12px 16px;font-size:11px;font-weight:700;color:#6b7280;
                                     text-transform:uppercase;letter-spacing:0.5px;">
                Détails du signalement
              </td>
            </tr>
            <tr style="border-top:1px solid #e5e7eb;">
              <td style="padding:10px 16px;font-size:12px;color:#6b7280;width:140px;">Commune</td>
              <td style="padding:10px 16px;font-size:13px;color:#111827;font-weight:600;">${escapeHtml(report.commune)}</td>
            </tr>
            <tr style="border-top:1px solid #e5e7eb;">
              <td style="padding:10px 16px;font-size:12px;color:#6b7280;">Quartier</td>
              <td style="padding:10px 16px;font-size:13px;color:#111827;font-weight:600;">${escapeHtml(report.quartier)}</td>
            </tr>
            <tr style="border-top:1px solid #e5e7eb;">
              <td style="padding:10px 16px;font-size:12px;color:#6b7280;">Type</td>
              <td style="padding:10px 16px;font-size:13px;color:#111827;">${escapeHtml(serviceTypeLabel(report.service_type))}</td>
            </tr>
            <tr style="border-top:1px solid #e5e7eb;">
              <td style="padding:10px 16px;font-size:12px;color:#6b7280;">Urgence</td>
              <td style="padding:10px 16px;font-size:13px;">${urgencyLabel(report.urgency)}</td>
            </tr>
            ${report.description ? `
            <tr style="border-top:1px solid #e5e7eb;">
              <td style="padding:10px 16px;font-size:12px;color:#6b7280;vertical-align:top;">Description</td>
              <td style="padding:10px 16px;font-size:13px;color:#374151;line-height:1.6;">
                ${escapeHtml(report.description)}
              </td>
            </tr>` : ""}
            ${mapsLink ? `
            <tr style="border-top:1px solid #e5e7eb;">
              <td style="padding:10px 16px;font-size:12px;color:#6b7280;">Localisation</td>
              <td style="padding:10px 16px;font-size:13px;">${mapsLink}</td>
            </tr>` : ""}
          </table>

          <!-- CTA -->
          <table width="100%"><tr><td align="center" style="padding-bottom:28px;">
            <a href="${dashboardUrl}"
               style="background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#ffffff;
                      text-decoration:none;font-weight:700;font-size:14px;
                      padding:12px 28px;border-radius:8px;display:inline-block;">
              Accéder à mon tableau de bord →
            </a>
          </td></tr></table>

          <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;
                    border-top:1px solid #e5e7eb;padding-top:20px;">
            Vous recevez cet email parce que votre organisation est enregistrée comme partenaire
            SIGNA-CI pour ce type de signalement. Pour gérer vos préférences, connectez-vous
            à votre tableau de bord partenaire.
          </p>

        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
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

// ── Matching partenaire → signalement ─────────────────────────────────────────

function partnerMatchesReport(partner: PartnerProfile, report: Report): boolean {
  switch (partner.partner_type) {
    case "cie":
      return report.service_type === "electricity";
    case "sodeci":
      return report.service_type === "water";
    case "mairie":
      return (
        report.report_category === "infrastructure" &&
        (partner.commune === null ||
          partner.commune.toLowerCase() === report.commune.toLowerCase())
      );
    case "ong":
    case "autre":
      return true;
    default:
      return false;
  }
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
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { report_id } = body as { report_id?: string };

    if (!report_id) {
      return new Response(
        JSON.stringify({ error: "report_id requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Charger le signalement
    const { data: report, error: reportErr } = await supabase
      .from("reports")
      .select(
        "id, user_id, service_type, report_category, commune, quartier, description, verifications, urgency, latitude, longitude, created_at",
      )
      .eq("id", report_id)
      .single();

    if (reportErr || !report) {
      return new Response(
        JSON.stringify({ error: "Signalement introuvable", detail: reportErr?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Charger les partenaires actifs avec leur email (via partner_profiles + auth.users)
    //    On utilise la vue partner_profiles_with_email si elle existe,
    //    sinon on joint manuellement via service role.
    const { data: partners, error: partnerErr } = await supabase
      .from("partner_profiles")
      .select(`
        id,
        user_id,
        org_name,
        partner_type,
        commune
      `);

    if (partnerErr) {
      return new Response(
        JSON.stringify({ error: "Erreur chargement partenaires", detail: partnerErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!partners || partners.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "Aucun partenaire enregistré" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Pour chaque partenaire, récupérer l'email via admin API
    const matchingPartners: PartnerProfile[] = [];

    for (const partner of partners as any[]) {
      const { data: userData } = await supabase.auth.admin.getUserById(partner.user_id);
      const email = userData?.user?.email;
      if (!email) continue;

      const fullPartner: PartnerProfile = { ...partner, email };
      if (partnerMatchesReport(fullPartner, report as Report)) {
        matchingPartners.push(fullPartner);
      }
    }

    if (matchingPartners.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "Aucun partenaire correspondant à ce signalement" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4. Envoyer un email à chaque partenaire correspondant
    let sent = 0;
    const errors: string[] = [];

    for (const partner of matchingPartners) {
      const serviceLabel = serviceTypeLabel((report as Report).service_type);
      const subject = `[SIGNA-CI] Nouveau signalement — ${serviceLabel} à ${(report as Report).commune} (${(report as Report).quartier})`;
      const html = buildNotificationEmail(report as Report, partner);

      const result = await sendEmail({
        to: partner.email,
        subject,
        html,
        fromEmail,
        apiKey: resendApiKey,
      });

      if (result.ok) {
        sent++;
      } else {
        errors.push(`${partner.email}: ${result.error}`);
      }
    }

    return new Response(
      JSON.stringify({
        report_id,
        matching_partners: matchingPartners.length,
        sent,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
