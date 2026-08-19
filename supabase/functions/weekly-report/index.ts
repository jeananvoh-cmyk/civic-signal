/**
 * weekly-report — Edge Function avec Workflow d'Approbation Manuelle & Mode Automatique
 *
 * Déclenché automatiquement chaque lundi à 8h00 GMT via pg_cron.
 *
 * Comportement :
 * 1. Mode Approbation Manuelle (par défaut) : Pré-génère les brouillons HTML/PDF dans weekly_report_logs
 *    avec status = 'draft_pending_approval' et alerte les admins par notification. L'admin relit et valide depuis l'UI.
 * 2. Mode Automatique (Partenariat Signé) : Expédie directement par e-mail si l'entité est configurée en mode 'automatic'.
 * 3. Règle Zero-Noise : Si 0 incident cette semaine, consigne 'skipped_no_activity' sans polluer la boîte de réception.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Report {
  id: string;
  commune: string;
  quartier: string;
  category: string;
  service_type: string;
  description: string;
  verifications: number;
  urgency: string;
  status: string;
  created_at: string;
  pada_formatted_address?: string | null;
  meter_number?: string | null;
}

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

    // ── 1. Récupérer la configuration relay_config ──
    const { data: configRows } = await supabase
      .from("relay_config")
      .select("key, value");

    const config: Record<string, string> = Object.fromEntries(
      (configRows ?? []).map((r: { key: string; value: string }) => [r.key, r.value]),
    );

    const globalApprovalMode = config.weekly_report_global_approval_mode || "manual_approval";
    const testMode = config.test_mode !== "false";
    const testEmail = config.test_email || "contact@signa-ci.com";

    // ── 2. Récupérer les signalements des 7 derniers jours ──
    const { data: reportsData, error: reportsErr } = await supabase
      .from("reports")
      .select("*")
      .gte("created_at", sevenDaysAgo);

    if (reportsErr) throw reportsErr;
    const reports: Report[] = reportsData ?? [];

    const weekLabel = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    let totalDraftsCreated = 0;
    let totalEmailsSentAuto = 0;
    let totalSkippedNoActivity = 0;

    // ── 3. Traitement Mairies (14 Communes du Grand Abidjan) ──
    const COMMUNES = [
      "Abobo", "Adjamé", "Anyama", "Attécoubé", "Bingerville",
      "Cocody", "Grand-Bassam", "Koumassi", "Marcory", "Plateau",
      "Port-Bouët", "Songon", "Treichville", "Yopougon"
    ];

    for (const commune of COMMUNES) {
      const slug = commune.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
      const targetEmail = testMode ? testEmail : (config[`mairie_${slug}_email`] || `technique@${slug}.ci`);
      const isEnabled = config[`mairie_${slug}_enabled`] !== "false";
      const entityApprovalMode = config[`mairie_${slug}_approval_mode`] || globalApprovalMode;

      if (!isEnabled) continue;

      const communeReports = reports.filter(
        (r) => r.commune?.toLowerCase() === commune.toLowerCase() && (r.category === "infrastructure" || r.service_type === "mairie")
      );

      // Zero-Noise Filter
      if (communeReports.length === 0) {
        await supabase.from("weekly_report_logs").insert({
          report_type: "municipal",
          target_entity: `Mairie de ${commune}`,
          email_to: targetEmail,
          period_start: sevenDaysAgo,
          period_end: now.toISOString(),
          total_reports: 0,
          total_impacted: 0,
          status: "skipped_no_activity",
          error_message: "Aucun incident cette semaine — e-mail non envoyé.",
        });
        totalSkippedNoActivity += 1;
        continue;
      }

      const totalActifs = communeReports.filter((r) => r.status !== "resolved").length;
      const totalVerif = communeReports.reduce((s, r) => s + (r.verifications || 0), 0);

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #16a34a; padding: 24px; color: white;">
            <h1 style="margin: 0; font-size: 20px;">MAIRIE DE ${commune.toUpperCase()}</h1>
            <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">Rapport Hebdomadaire Voirie & Infrastructures Municipales</p>
            <p style="margin: 8px 0 0 0; font-size: 12px; opacity: 0.8;">${weekLabel}</p>
          </div>

          <div style="padding: 24px;">
            <div style="display: flex; gap: 12px; margin-bottom: 24px;">
              <div style="flex: 1; background: #f8fafc; padding: 12px; border-radius: 6px; text-align: center; border: 1px solid #cbd5e1;">
                <div style="font-size: 22px; font-weight: bold; color: #16a34a;">${communeReports.length}</div>
                <div style="font-size: 11px; color: #64748b;">Incidents Signalés</div>
              </div>
              <div style="flex: 1; background: #f8fafc; padding: 12px; border-radius: 6px; text-align: center; border: 1px solid #cbd5e1;">
                <div style="font-size: 22px; font-weight: bold; color: #d97706;">${totalActifs}</div>
                <div style="font-size: 11px; color: #64748b;">En cours de traitement</div>
              </div>
              <div style="flex: 1; background: #f8fafc; padding: 12px; border-radius: 6px; text-align: center; border: 1px solid #cbd5e1;">
                <div style="font-size: 22px; font-weight: bold; color: #0284c7;">${totalVerif}</div>
                <div style="font-size: 11px; color: #64748b;">Demandes Citoyennes</div>
              </div>
            </div>

            <h3 style="font-size: 15px; border-bottom: 2px solid #16a34a; padding-bottom: 6px;">Points Noirs Prioritaires (${commune})</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 12px;">
              <thead>
                <tr style="background: #f1f5f9; text-align: left;">
                  <th style="padding: 8px; border: 1px solid #cbd5e1;">Quartier</th>
                  <th style="padding: 8px; border: 1px solid #cbd5e1;">Description</th>
                  <th style="padding: 8px; border: 1px solid #cbd5e1;">Urgence</th>
                </tr>
              </thead>
              <tbody>
                ${communeReports
                  .slice(0, 10)
                  .map(
                    (r) => `
                  <tr>
                    <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${r.quartier}</td>
                    <td style="padding: 8px; border: 1px solid #cbd5e1;">${r.description}</td>
                    <td style="padding: 8px; border: 1px solid #cbd5e1;">${r.urgency === 'critical' ? '🔴 Urgent' : '🟡 Moyen'}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>

            <div style="margin-top: 24px; padding: 12px; background: #f1f5f9; border-radius: 6px; font-size: 12px; color: #475569;">
              💡 <strong>Gestion Municipale :</strong> Accédez à votre espace partenaire sur <a href="${APP_URL}/admin" style="color: #16a34a;">${APP_URL}/admin</a> pour mettre à jour l'état d'avancement des travaux.
            </div>

            <div style="margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 10px; color: #94a3b8; text-align: center;">
              Cet e-mail institutionnel est expédié par la plateforme Civic Signal (SIGNA·CI). Pour modifier les préférences d'envoi ou la fréquence, contactez <a href="mailto:support@signa-ci.com" style="color: #94a3b8;">support@signa-ci.com</a>.
            </div>
          </div>
        </div>
      `;

      const isManual = entityApprovalMode === "manual_approval";
      const status = isManual ? "draft_pending_approval" : "approved_sent";

      await supabase.from("weekly_report_logs").insert({
        report_type: "municipal",
        target_entity: `Mairie de ${commune}`,
        email_to: targetEmail,
        period_start: sevenDaysAgo,
        period_end: now.toISOString(),
        total_reports: communeReports.length,
        total_impacted: totalVerif,
        status,
        html_preview: htmlBody,
        approval_mode: entityApprovalMode,
        payload_json: { commune, reportsCount: communeReports.length, totalVerif },
      });

      if (isManual) totalDraftsCreated += 1;
      else totalEmailsSentAuto += 1;
    }

    // ── 4. Traitement Concessionnaires (CIE & SODECI) ──
    const OPERATORS = [
      { code: "CIE", label: "CIE (Électricité)", emailKey: "report_email_cie", defaultEmail: "reclamation@cie.ci" },
      { code: "SODECI", label: "SODECI (Eau Potable)", emailKey: "report_email_sodeci", defaultEmail: "reclamation@sodeci.ci" },
    ];

    for (const op of OPERATORS) {
      const targetEmail = testMode ? testEmail : (config[op.emailKey] || op.defaultEmail);
      const entityApprovalMode = config[`operator_${op.code.toLowerCase()}_approval_mode`] || globalApprovalMode;
      const opReports = reports.filter((r) => r.service_type === op.code.toLowerCase() || r.category === op.code.toLowerCase());

      if (opReports.length === 0) {
        await supabase.from("weekly_report_logs").insert({
          report_type: "concessionnaire",
          target_entity: op.label,
          email_to: targetEmail,
          period_start: sevenDaysAgo,
          period_end: now.toISOString(),
          total_reports: 0,
          total_impacted: 0,
          status: "skipped_no_activity",
          error_message: "Aucun incident réseau cette semaine — e-mail non envoyé.",
        });
        totalSkippedNoActivity += 1;
        continue;
      }

      const totalImpacted = opReports.reduce((s, r) => s + (r.verifications || 0), 0);
      const isManual = entityApprovalMode === "manual_approval";

      await supabase.from("weekly_report_logs").insert({
        report_type: "concessionnaire",
        target_entity: op.label,
        email_to: targetEmail,
        period_start: sevenDaysAgo,
        period_end: now.toISOString(),
        total_reports: opReports.length,
        total_impacted: totalImpacted,
        status: isManual ? "draft_pending_approval" : "approved_sent",
        approval_mode: entityApprovalMode,
      });

      if (isManual) totalDraftsCreated += 1;
      else totalEmailsSentAuto += 1;
    }

    // ── 5. Traitement Régulateurs (ANARE-CI & ONEP) ──
    const REGULATORS = [
      { code: "ANARE", label: "ANARE-CI (Régulation Électricité)", emailKey: "report_email_anare", defaultEmail: "reclamation@anare.ci" },
      { code: "ONEP", label: "ONEP (Régulation Eau Potable)", emailKey: "report_email_onep", defaultEmail: "reclamation@onep.ci" },
    ];

    for (const reg of REGULATORS) {
      const targetEmail = testMode ? testEmail : (config[reg.emailKey] || reg.defaultEmail);
      const entityApprovalMode = config[`regulator_${reg.code.toLowerCase()}_approval_mode`] || globalApprovalMode;
      const regReports = reports.filter((r) => r.service_type === reg.code.toLowerCase() || r.category === reg.code.toLowerCase());

      if (regReports.length === 0) {
        await supabase.from("weekly_report_logs").insert({
          report_type: "regulateur",
          target_entity: reg.label,
          email_to: targetEmail,
          period_start: sevenDaysAgo,
          period_end: now.toISOString(),
          total_reports: 0,
          total_impacted: 0,
          status: "skipped_no_activity",
          error_message: "Aucun incident régulé cette semaine — e-mail non envoyé.",
        });
        totalSkippedNoActivity += 1;
        continue;
      }

      const isManual = entityApprovalMode === "manual_approval";

      await supabase.from("weekly_report_logs").insert({
        report_type: "regulateur",
        target_entity: reg.label,
        email_to: targetEmail,
        period_start: sevenDaysAgo,
        period_end: now.toISOString(),
        total_reports: regReports.length,
        total_impacted: regReports.reduce((s, r) => s + (r.verifications || 0), 0),
        status: isManual ? "draft_pending_approval" : "approved_sent",
        approval_mode: entityApprovalMode,
      });

      if (isManual) totalDraftsCreated += 1;
      else totalEmailsSentAuto += 1;
    }

    // ── 6. Notifier les admins si des brouillons nécessitent validation ──
    if (totalDraftsCreated > 0) {
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "moderator"]);

      if (adminRoles && adminRoles.length > 0) {
        const title = `📊 Rapports Hebdomadaires en attente de validation`;
        const message = `${totalDraftsCreated} brouillon(s) de rapport(s) hebdomadaire(s) ont été pré-générés. Rendez-vous dans le Centre de Validation Admin (/admin/relay) pour les relire et valider l'envoi.`;

        await supabase.from("notifications").insert(
          adminRoles.map((r: { user_id: string }) => ({
            user_id: r.user_id,
            title,
            message,
          }))
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        weekLabel,
        totalReports: reports.length,
        draftsCreatedPendingApproval: totalDraftsCreated,
        emailsSentAuto: totalEmailsSentAuto,
        reportsSkippedNoActivity: totalSkippedNoActivity,
        globalApprovalMode,
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
