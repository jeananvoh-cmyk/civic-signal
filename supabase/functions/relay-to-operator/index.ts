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
  ticket_code?: string | null;
  pada_commune_code?: string | null;
  pada_street_name?: string | null;
  pada_formatted_address?: string | null;
  service_type: string;
  commune: string;
  quartier: string;
  description: string;
  verifications: number;
  urgency: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  meter_number?: string | null;
  contract_type?: string | null;
  reporter_phone?: string | null;
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

      const ticketBadges = entry.reports
        .map((r) => {
          const tCode = r.ticket_code || `SIG-${commune.slice(0,3).toUpperCase()}-${r.id.slice(0,4).toUpperCase()}`;
          const padaText = r.pada_formatted_address || (r.pada_street_name ? `${r.pada_street_name} (${r.pada_commune_code || ''})` : "");
          return `<div style="font-size:11px;font-family:monospace;font-weight:700;color:#059669;margin-top:3px;">🎫 ${escapeHtml(tCode)}${padaText ? ` <span style="font-family:sans-serif;font-weight:600;color:#374151;">· 🏛️ ${escapeHtml(padaText)}</span>` : ""}</div>`;
        })
        .slice(0, 3)
        .join("");

      const countBadge = entry.reports.length > 1
        ? ` <span style="font-size:11px;color:#6b7280;font-weight:400;">(${entry.reports.length} signalements)</span>`
        : "";

      const urgencyBadge = (isMairie || isANARE) && entry.maxUrgency === "critical"
        ? `<span style="display:inline-block;background:#fee2e2;color:#dc2626;font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;margin-left:6px;text-transform:uppercase;">Urgent</span>`
        : "";

      return `
      <tr style="border-top:1px solid #e5e7eb;">
        <td style="padding:10px 16px;font-size:13px;color:#111827;font-weight:600;vertical-align:top;">${escapeHtml(quartier)}${countBadge}${urgencyBadge}${ticketBadges}${descLines}</td>
        <td style="padding:10px 16px;font-size:14px;color:${accentColor};font-weight:800;vertical-align:top;text-align:center;">${entry.totalVerif}</td>
        <td style="padding:10px 16px;font-size:13px;color:#6b7280;vertical-align:top;">${since}</td>
        <td style="padding:10px 16px;font-size:13px;vertical-align:top;">${mapsCell}</td>
      </tr>`;
    })
    .join("");

  // ── Salutation et corps personnalisés ────────────────────────────────────────

  const salutation = isMairie
    ? `Monsieur le Maire,<br>Monsieur le Directeur des Services Techniques et du Cadre de Vie de la Commune de <strong>${escapeHtml(commune)}</strong>,`
    : isANARE
      ? `Madame, Monsieur la Direction Générale et le Département Régulation & Qualité de Service — <strong>ANARE-CI</strong>,`
      : isONEP
        ? `Madame, Monsieur la Direction Générale et la Maîtrise d'Ouvrage — <strong>ONEP</strong>,`
        : isCIE
          ? `Madame, Monsieur les Responsables de l'Exploitation & de la Relation Usagers — <strong>Compagnie Ivoirienne d'Électricité (CIE)</strong>,`
          : `Madame, Monsieur les Responsables de la Distribution & de la Relation Usagers — <strong>Société de Distribution d'Eau de la Côte d'Ivoire (SODECI)</strong>,`;

  const introBody = isMairie
    ? `
      <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.8;">
        Dans un esprit de coopération républicaine et d'entraide civique, la plateforme citoyenne <strong>SIGNA-CI</strong> a l'honneur de vous transmettre une synthèse géolocalisée de signalements concernant la <strong style="color:#111827;">voirie et le cadre de vie</strong> dans la commune de <strong style="color:#111827;">${escapeHtml(commune)}</strong>.
      </p>
      <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.8;">
        Nous saluons le dévouement quotidien de vos équipes techniques municipales et mettons à votre disposition ces données enrichies du référentiel d'adressage officiel PADA afin de faciliter et optimiser leurs interventions de terrain.
      </p>`
    : isANARE
      ? `
      <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.8;">
        En votre qualité d'autorité de régulation du secteur de l'électricité (<strong>ANARE-CI</strong>), nous vous adressons ce rapport consolidé concernant la <strong style="color:#111827;">continuité du service électrique et l'état des infrastructures d'éclairage public</strong> dans la commune de <strong style="color:#111827;">${escapeHtml(commune)}</strong>.
      </p>
      <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.8;">
        Ces données vérifiées et qualifiées avec le référentiel PADA ont vocation à soutenir vos missions de contrôle et à appuyer la coordination avec le concessionnaire CIE pour un rétablissement rapide et pérenne.
      </p>`
      : isONEP
        ? `
      <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.8;">
        En votre qualité de Maître d'Ouvrage et d'Office National régissant l'approvisionnement en eau potable (<strong>ONEP</strong>), nous vous transmettons ce point de situation sur la <strong style="color:#111827;">continuité et la qualité de la distribution d'eau</strong> dans la commune de <strong style="color:#111827;">${escapeHtml(commune)}</strong>.
      </p>
      <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.8;">
        Ce rapport collaboratif vise à soutenir vos orientations stratégiques et à faciliter le suivi patrimonial en lien avec la SODECI.
      </p>`
        : `
      <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.8;">
        Dans une démarche constructive visant à faciliter l'action de vos équipes de dépannage et d'intervention, la plateforme citoyenne <strong>SIGNA-CI</strong> vous relaie ce constat de panne corroboré par des riverains dans la commune de <strong style="color:#111827;">${escapeHtml(commune)}</strong>.
      </p>
      <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.8;">
        Nos concitoyens sont reconnaissants des efforts déployés par vos agents sur le terrain pour rétablir le service dans les meilleurs délais.
      </p>`;

  const verifiedBlock = `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:20px;">
      <tr><td style="padding:14px 16px;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.5px;">🌿 Garanties de Qualité & Conformité PADA (MCLU)</p>
        <ul style="margin:0;padding:0 0 0 18px;font-size:13px;color:#14532d;line-height:1.8;">
          <li><strong>Adressage Officiel PADA :</strong> nomenclature et repères cadastraux du Ministère de la Construction.</li>
          <li><strong>Corroboration citoyenne :</strong> signalements vérifiés et appuyés par les riverains et abonnés.</li>
          <li><strong>Dédoublonnage & Localisation GPS :</strong> coordonnées précises pour navigation directe des équipes.</li>
        </ul>
      </td></tr>
    </table>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="680" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.08);border:1px solid #cbd5e1;">

        <!-- En-tête officiel avec Logo et Bandeau Gradient -->
        <tr>
          <td style="background:${headerGradient};padding:30px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;">
                  <span style="background:rgba(255,255,255,0.2);color:#ffffff;font-size:10px;font-weight:800;padding:4px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:1.2px;display:inline-block;margin-bottom:8px;">
                    🤝 RELAIS INSTITUTIONNEL OFFICIEL
                  </span>
                  <h1 style="margin:0;font-size:24px;font-weight:900;color:#ffffff;line-height:1.2;letter-spacing:-0.3px;">
                    ${serviceIcon} ${serviceLabel}
                  </h1>
                  <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.95);font-weight:500;">
                    Commune de <strong>${escapeHtml(commune)}</strong> · Grand Abidjan, Côte d'Ivoire
                  </p>
                </td>
                <td align="right" style="vertical-align:top;width:60px;">
                  <img src="https://signa.ci/signa-logo-official.png" alt="SIGNA-CI" width="56" height="56" style="border-radius:12px;background:#ffffff;padding:4px;box-shadow:0 2px 8px rgba(0,0,0,0.15);display:block;" />
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Grille d'Indicateurs Clés (KPI) -->
        <tr>
          <td style="background:#f8fafc;padding:16px 36px;border-bottom:1px solid #e2e8f0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="33%" style="text-align:center;padding:8px;border-right:1px solid #e2e8f0;">
                  <div style="font-size:20px;font-weight:900;color:#0f172a;">${byQuartier.size}</div>
                  <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px;">Quartier${byQuartier.size > 1 ? "s" : ""} affecté${byQuartier.size > 1 ? "s" : ""}</div>
                </td>
                <td width="33%" style="text-align:center;padding:8px;border-right:1px solid #e2e8f0;">
                  <div style="font-size:20px;font-weight:900;color:${accentColor};">${totalCitizens}</div>
                  <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px;">Concitoyen${totalCitizens > 1 ? "s" : ""} confirmé${totalCitizens > 1 ? "s" : ""}</div>
                </td>
                <td width="34%" style="text-align:center;padding:8px;">
                  <div style="font-size:20px;font-weight:900;color:#059669;">${reports.length}</div>
                  <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px;">Ticket${reports.length > 1 ? "s" : ""} PADA enregistrés</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Corps de l'email -->
        <tr><td style="padding:30px 36px;">
          <p style="margin:0 0 18px;color:#0f172a;font-size:15px;line-height:1.8;font-weight:500;">
            ${salutation}
          </p>
          ${introBody}
          ${verifiedBlock}

          <!-- Tableau synthétique par quartier -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #cbd5e1;border-radius:10px;overflow:hidden;margin-bottom:24px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
            <tr style="background:#f1f5f9;">
              <th style="padding:12px 16px;font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;text-align:left;letter-spacing:0.6px;">Quartier & Adressage PADA</th>
              <th style="padding:12px 16px;font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;text-align:center;letter-spacing:0.6px;">${citizenColLabel}</th>
              <th style="padding:12px 16px;font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;text-align:left;letter-spacing:0.6px;">Ancienneté</th>
              <th style="padding:12px 16px;font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;text-align:left;letter-spacing:0.6px;">Localisation GPS</th>
            </tr>
            ${reportRows}
          </table>

          ${!isMairie && reports.some((r) => r.meter_number || r.reporter_phone) ? `
          <div style="margin-bottom:24px;padding:18px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;">
            <p style="margin:0 0 10px;font-size:12px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;">📋 Répertoire des Compteurs & Contacts Abonnés</p>
            <ul style="margin:0;padding:0 0 0 20px;font-size:12px;color:#334155;line-height:1.8;">
              ${reports.filter((r) => r.meter_number || r.reporter_phone).map((r) => `
                <li>
                  <strong style="color:#0f172a;">${escapeHtml(r.quartier)}</strong> :
                  ${r.meter_number ? `N° Compteur <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;font-weight:700;color:#0f172a;">${escapeHtml(r.meter_number)}</code> (${r.contract_type === "postpaid" ? "Postpayé" : "Prépayé"})` : ""}
                  ${r.reporter_phone ? ` · Tel Abonné : <strong style="color:#059669;">${escapeHtml(r.reporter_phone)}</strong>` : ""}
                </li>
              `).join("")}
            </ul>
          </div>
          ` : ""}

          <div style="margin-top:20px;padding:18px;background:#f0fdf4;border:1px solid #86efac;border-radius:10px;font-size:13px;color:#14532d;line-height:1.7;">
            <strong style="font-size:14px;color:#166534;">🌿 Engagement de Suivi & Rétablissement :</strong><br>
            Dès l'amorçage ou la clôture de vos travaux de réparation, nous vous invitons à mettre à jour le statut sur votre console dédiée ou à nous répondre directement afin que nous puissions notifier les concitoyens concernés.
          </div>

          <table width="100%" style="margin-top:28px;"><tr><td align="center">
            <a href="https://signa.ci/partenaire"
               style="background:${headerGradient};color:#ffffff;text-decoration:none;font-weight:900;font-size:14px;padding:14px 32px;border-radius:10px;display:inline-block;letter-spacing:0.3px;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
              Accéder à l'Espace Partenaire & Suivi →
            </a>
          </td></tr></table>

          <p style="margin:28px 0 0;color:#64748b;font-size:11px;line-height:1.7;border-top:1px solid #e2e8f0;padding-top:20px;text-align:center;">
            🤝 <strong>SIGNA-CI</strong> · Plateforme Civique de Signalement des Services Publics · République de Côte d'Ivoire<br>
            <span style="color:#94a3b8;">Référentiel Cadastral PADA (MCLU) · Conduite d'Eau & Réseau Électrique National</span>
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
  isTest?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const cleanKey = opts.apiKey.trim();
  const cleanTo = opts.to.trim();

  if (!cleanKey) {
    return { ok: false, error: "Aucune clé API Resend n'a été fournie." };
  }
  if (!cleanTo) {
    return { ok: false, error: "Adresse email destinataire manquante." };
  }

  // Le domaine signa.ci est officiellement vérifié sur Resend (resend.com/domains).
  // L'adresse expéditrice DOIT TOUJOURS correspondre au domaine vérifié :
  // ex: "SIGNA-CI <contact@signa.ci>" ou "SIGNA-CI <relais@signa.ci>".
  // NE JAMAIS forcer "onboarding@resend.dev" car les clés API créées pour le domaine signa.ci
  // sont rejetées avec HTTP 403 Forbidden ("API key does not have permission to send from onboarding@resend.dev").
  const fromVariants = [
    `SIGNA-CI <${opts.fromEmail}>`,
    opts.fromEmail,
    "SIGNA-CI <contact@signa.ci>",
    "contact@signa.ci",
  ];

  let lastError = "Erreur inconnue lors de l'envoi d'email Resend";
  let lastStatus = 500;

  for (const fromAddr of fromVariants) {
    try {
      console.log(`[Resend] Envoi depuis "${fromAddr}" vers "${cleanTo}" (isTest: ${opts.isTest})`);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cleanKey}`,
        },
        body: JSON.stringify({
          from: fromAddr,
          to: [cleanTo],
          subject: opts.subject,
          html: opts.html,
        }),
      });

      if (res.ok) {
        console.log(`[Resend] E-mail envoyé avec succès à ${cleanTo} via ${fromAddr}`);
        return { ok: true };
      }

      lastStatus = res.status;
      const bodyText = await res.text();
      console.warn(`[Resend] Rejet HTTP ${res.status} pour expéditeur "${fromAddr}":`, bodyText);

      let parsed: any = null;
      try {
        parsed = JSON.parse(bodyText);
      } catch (_) {}

      const msg = parsed?.message || parsed?.name || bodyText;
      lastError = msg;

      // Diagnostic clair selon le motif de rejet Resend
      if (lastStatus === 401 || (msg.toLowerCase().includes("api key") && !msg.toLowerCase().includes("permission"))) {
        lastError = `Clé API Resend non reconnue (${msg}). Veuillez vérifier votre clé sur resend.com/api-keys.`;
        break; // Clé invalide : inutile d'essayer d'autres expéditeurs
      }

      if (msg.toLowerCase().includes("not verified") || msg.toLowerCase().includes("domain")) {
        lastError = `Erreur de configuration Resend (${msg}). L'expéditeur doit être sur le domaine vérifié signa.ci (ex: contact@signa.ci).`;
        continue;
      }
    } catch (e: any) {
      lastError = e?.message || lastError;
      console.error(`[Resend] Erreur réseau :`, e);
    }
  }

  return { ok: false, error: lastError };
}

// ── Handler principal ─────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendEnvApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail =
      Deno.env.get("RELAY_FROM_EMAIL") ?? "contact@signa.ci";

    // Lecture unique du corps de requête (pour ne pas verrouiller le flux du body)
    const body =
      req.method === "POST" ? await req.json().catch(() => ({})) : {};

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    let isAllowed = false;

    // 1. Accès via Service Role Key (cron jobs / appels internes)
    if (token === serviceRoleKey) {
      isAllowed = true;
    } else {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Superadmin propriétaire
      if (user.email?.toLowerCase() === "jeananvoh@gmail.com") {
        isAllowed = true;
      }

      // 3. Vérifier rôle dans user_roles ou profiles
      if (!isAllowed) {
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

        if (rolesSet.has("admin") || rolesSet.has("moderator")) {
          isAllowed = true;
        }
      }

      // 4. Fallback RPC has_role
      if (!isAllowed) {
        try {
          const { data: hasAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
          const { data: hasMod } = await supabase.rpc("has_role", { _user_id: user.id, _role: "moderator" });
          if (hasAdmin === true || hasMod === true) {
            isAllowed = true;
          }
        } catch (_) {}
      }
    }

    if (!isAllowed) {
      return new Response(JSON.stringify({ error: "Accès refusé : Rôle admin ou modérateur requis." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Récupérer la configuration de relais depuis la base de données
    const { data: configRows } = await supabase
      .from("relay_config")
      .select("key, value");
    const config = Object.fromEntries(
      (configRows ?? []).map((r: { key: string; value: string }) => [r.key, r.value]),
    );

    const isTestMode = body.test_mode !== undefined
      ? Boolean(body.test_mode)
      : (config["test_mode"] === "true");
    const testEmail   = (body.test_email || config["test_email"] || "").trim();
    const emailCIE    = (config["email_cie"] && !config["email_cie"].includes("jeananvoh")) ? config["email_cie"].trim() : "reclamation@cie.ci";
    const emailSODECI = (config["email_sodeci"] && !config["email_sodeci"].includes("jeananvoh")) ? config["email_sodeci"].trim() : "reclamation@sodeci.ci";
    const emailONEP   = (config["email_onep"] && !config["email_onep"].includes("jeananvoh")) ? config["email_onep"].trim() : "reclamation@onep.ci";
    const emailANARE  = (config["email_anare"] && !config["email_anare"].includes("jeananvoh")) ? config["email_anare"].trim() : "reclamation@anare.ci";

    // Résolution robuste et unifiée de la clé API Resend :
    // 1. Clé passée dynamiquement par l'admin dans le body (si réelle et non masquée)
    // 2. Clé enregistrée dans la table relay_config (si réelle et non masquée)
    // 3. Variable d'environnement RESEND_API_KEY dans Supabase Secrets
    function cleanApiKey(k?: string | null): string | null {
      if (!k || typeof k !== "string") return null;
      const t = k.trim();
      if (t.startsWith("re_") && t.length >= 15 && !t.includes("•") && !t.includes("*")) {
        return t;
      }
      return null;
    }

    const finalApiKey =
      cleanApiKey(body.resend_api_key) ||
      cleanApiKey(config["resend_api_key"]) ||
      cleanApiKey(resendEnvApiKey) ||
      "";

    // Mode direct de test de la clé Resend ou d'envoi de secours sans blocage CORS
    if (body.action === "test_email" || body.action === "test_resend_key") {
      const keyToUse = cleanApiKey(body.resend_api_key) || finalApiKey;
      const targetTo = (body.to_email || testEmail || "jeananvoh@gmail.com").trim();
      const subjectToUse = body.subject || "[SIGNA-CI] Test de connexion Clé API Resend";
      const nowStr = new Date().toLocaleString("fr-FR", { timeZone: "Africa/Abidjan" });
      const defaultTestHtml = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.08);border:1px solid #cbd5e1;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#059669,#047857);padding:26px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="background:rgba(255,255,255,0.2);color:#ffffff;font-size:10px;font-weight:800;padding:4px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:1px;">
                    ✅ TEST DE CONNEXION RÉUSSI
                  </span>
                  <h1 style="margin:8px 0 0;font-size:22px;font-weight:900;color:#ffffff;">
                    Clé API Resend Fonctionnelle
                  </h1>
                </td>
                <td align="right" width="50">
                  <img src="https://signa.ci/signa-logo-official.png" alt="SIGNA-CI" width="48" height="48" style="border-radius:10px;background:#ffffff;padding:4px;display:block;" />
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:28px 32px;">
          <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:20px;margin-bottom:20px;">
            <h3 style="margin:0 0 8px;color:#166534;font-size:16px;font-weight:800;">Félicitations !</h3>
            <p style="margin:0;color:#14532d;font-size:14px;line-height:1.6;">
              Votre clé API Resend est correctement configurée et en capacité de délivrer des courriels officiels pour la plateforme <strong>SIGNA.ci</strong>.
            </p>
          </div>
          <table width="100%" style="font-size:13px;color:#475569;margin-bottom:20px;">
            <tr><td style="padding:4px 0;"><strong>Destinataire test :</strong> <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;color:#0f172a;">${escapeHtml(targetTo)}</code></td></tr>
            <tr><td style="padding:4px 0;"><strong>Horodatage (Abidjan) :</strong> ${nowStr}</td></tr>
            <tr><td style="padding:4px 0;"><strong>Statut :</strong> <span style="color:#059669;font-weight:700;">Prêt pour la production / relais opérateurs</span></td></tr>
          </table>
          <p style="margin:20px 0 0;color:#94a3b8;font-size:11px;text-align:center;border-top:1px solid #e2e8f0;padding-top:16px;">
            🤝 <strong>SIGNA-CI</strong> · Plateforme Civique de Signalement des Services Publics · République de Côte d'Ivoire
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

      const htmlToUse = body.html || defaultTestHtml;

      if (!keyToUse) {
        return new Response(
          JSON.stringify({ ok: false, error: "Aucune clé API Resend fournie ni trouvée dans la configuration." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const testRes = await sendEmail({
        to: targetTo,
        subject: subjectToUse,
        html: htmlToUse,
        fromEmail,
        apiKey: keyToUse,
        isTest: true,
      });

      return new Response(
        JSON.stringify({ ok: testRes.ok, error: testRes.error }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!finalApiKey && !isTestMode) {
      return new Response(
        JSON.stringify({
          error: "RESEND_API_KEY non configuré. Veuillez saisir votre clé API Resend (re_...) dans l'onglet Paramètres.",
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

    // Récupérer les fiches ciblées (permet le renvoi ou la relance même après une erreur précédente)
    const { data: relays, error: relayErr } = await supabase
      .from("relay_logs")
      .select("id, report_id, operator, email_to")
      .in("id", relay_ids);

    if (relayErr) throw relayErr;
    if (!relays || relays.length === 0) {
      return new Response(
        JSON.stringify({
          processed: 0,
          sent: 0,
          errors: 0,
          message: "Aucun enregistrement de relais trouvé pour ces identifiants.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const reportIds = (relays as RelayLog[]).map((r) => r.report_id);
    const { data: reports, error: reportsErr } = await supabase
      .from("reports")
      .select(
        "id, user_id, service_type, commune, quartier, location, description, verifications, urgency, latitude, longitude, created_at, meter_number, contract_type, cie_ticket_number",
      )
      .in("id", reportIds);

    if (reportsErr) {
      console.error("[relay-to-operator] Erreur récupération signalements:", reportsErr);
      return new Response(
        JSON.stringify({
          ok: false,
          error: `Erreur base de données lors de la récupération des signalements: ${reportsErr.message}`,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Récupération des téléphones des utilisateurs depuis profiles si existants
    const userIds = [...new Set((reports ?? []).map((r: any) => r.user_id).filter(Boolean))];
    const { data: profiles } = userIds.length > 0
      ? await supabase.from("profiles").select("user_id, phone").in("user_id", userIds)
      : { data: [] };
    const phoneMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.phone]));

    const reportMap = new Map(
      (reports ?? []).map((r: any) => [
        r.id,
        {
          ...r,
          reporter_phone: phoneMap.get(r.user_id) || null,
        } as Report,
      ]),
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
      if (!report) {
        console.warn(`[relay-to-operator] Rapport non trouvé pour relay_id ${relay.id} (report_id: ${relay.report_id})`);
        continue;
      }

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
        const slug = (report.commune || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "");
        const enabled = config[`mairie_${slug}_enabled`] === "true";
        const email   = config[`mairie_${slug}_email`] ?? "";
        resolvedEmail = (enabled && email && !email.includes("jeananvoh")) ? email : `technique@${slug || "mairie"}.ci`;
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

    if (groups.size === 0) {
      return new Response(
        JSON.stringify({
          ok: false,
          processed: relays.length,
          sent: 0,
          errors: relays.length,
          message: `Aucun groupe constitué pour les ${relays.length} signalements ciblés.`,
          lastError: "Les données du signalement sont introuvables ou incomplètes dans la table reports.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    let errors = 0;
    let lastRelayError: string | null = null;

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
      const html = body.html || buildBatchEmailHtml(
        group.operator,
        group.commune,
        group.reports,
      );

      const finalTo = (isTestMode && testEmail) ? testEmail : group.email_to;
      const finalSubject = body.subject || ((isTestMode && testEmail)
        ? `[MODE TEST → ${group.email_to}] ${subject}`
        : `[OFFICIEL · SIGNA-CI] ${subject.replace("[SIGNA-CI] ", "")}`);

      let result: { ok: boolean; error?: string } = { ok: true };
      if (finalApiKey) {
        result = await sendEmail({
          to: finalTo,
          subject: finalSubject,
          html,
          fromEmail,
          apiKey: finalApiKey,
          isTest: isTestMode,
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
        lastRelayError = result.error || "Erreur de transmission d'email";
        await supabase
          .from("relay_logs")
          .update({ status: "error", error_message: result.error })
          .in("id", group.relayIds);
        errors += group.relayIds.length;
      }
    }

    return new Response(
      JSON.stringify({
        ok: sent > 0,
        processed: relays.length,
        sent,
        errors,
        groups: groups.size,
        simulated: !finalApiKey,
        lastError: errors > 0 ? (lastRelayError || "Échec d'envoi") : null,
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
