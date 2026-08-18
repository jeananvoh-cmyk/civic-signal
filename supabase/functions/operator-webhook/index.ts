/**
 * operator-webhook
 * ----------------
 * Endpoint REST sécurisé permettant aux régies et opérateurs (CIE, SODECI, Mairies, ONEP, ANARE)
 * de mettre à jour le statut d'un incident via son ticket PADA (ex: SIG-COC-20260818-0001)
 * ou son ID de signalement.
 *
 * En-têtes supportés pour l'authentification :
 *   - x-operator-key : Clé d'API secrète partagée (OPERATOR_WEBHOOK_KEY ou relay_config)
 *   OU
 *   - Authorization: Bearer <token> (JWT d'un partenaire ou administrateur)
 *
 * Body attendu (JSON) :
 *   {
 *     "ticket_code": "SIG-COC-20260818-0001", // Ou "report_id"
 *     "report_id": "uuid-optionnel",
 *     "status": "processing" | "resolved" | "rejected" | "acknowledged",
 *     "operator_name": "CIE", // Optionnel
 *     "operator_reference": "CIE-OT-9842", // Optionnel (N° ordre de travail)
 *     "note": "Équipe de dépannage sur site.", // Optionnel
 *     "estimated_resolution_time": "2026-08-18T18:00:00Z" // Optionnel
 *   }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-operator-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Méthode non autorisée. Seul POST est accepté." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const defaultWebhookKey = Deno.env.get("OPERATOR_WEBHOOK_KEY") || "signa-operator-secret-2026";

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // ── 1. Vérification de l'authentification ──────────────────────────────────
    const operatorKeyHeader = req.headers.get("x-operator-key");
    const authHeader = req.headers.get("Authorization");

    let isAuthorized = false;
    let callerOrg = "Opérateur API";

    // A. Via clé d'API x-operator-key
    if (operatorKeyHeader) {
      if (operatorKeyHeader === defaultWebhookKey) {
        isAuthorized = true;
      } else {
        // Vérifier dans la table relay_config
        const { data: keyConfig } = await supabaseAdmin
          .from("relay_config")
          .select("value")
          .eq("key", "operator_webhook_key")
          .maybeSingle();

        if (keyConfig?.value && keyConfig.value === operatorKeyHeader) {
          isAuthorized = true;
        }
      }
    }

    // B. Via JWT Supabase (Partenaire ou Admin)
    if (!isAuthorized && authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);

      if (user && !authErr) {
        const { data: hasRole } = await supabaseAdmin.rpc("has_role", {
          _user_id: user.id,
          _role: "partner",
        });
        const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });

        if (hasRole || isAdmin) {
          isAuthorized = true;
          const { data: partnerProf } = await supabaseAdmin
            .from("partner_profiles")
            .select("org_name, partner_type")
            .eq("user_id", user.id)
            .maybeSingle();
          if (partnerProf?.org_name) {
            callerOrg = partnerProf.org_name;
          }
        }
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({
          error: "Non autorisé. En-tête x-operator-key valide ou session partenaire requise.",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2. Validation du corps de la requête ────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const {
      ticket_code,
      report_id,
      status = "processing",
      operator_name,
      operator_reference,
      note,
      estimated_resolution_time,
    } = body;

    if (!ticket_code && !report_id) {
      return new Response(
        JSON.stringify({ error: "Champ requis manquant : 'ticket_code' ou 'report_id' obligatoire." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normaliser le statut si 'acknowledged'
    const normalizedStatus = status === "acknowledged" ? "processing" : status;
    const finalOperatorName = operator_name || callerOrg;

    // ── 3. Exécution de la RPC operator_update_ticket ──────────────────────────
    const { data: result, error: rpcErr } = await supabaseAdmin.rpc("operator_update_ticket", {
      p_ticket_code: ticket_code ? String(ticket_code).trim() : null,
      p_report_id: report_id || null,
      p_status: normalizedStatus,
      p_operator_name: finalOperatorName,
      p_operator_reference: operator_reference || null,
      p_public_note: note || null,
      p_estimated_resolution: estimated_resolution_time || null,
    });

    if (rpcErr) {
      return new Response(
        JSON.stringify({ error: "Erreur mise à jour ticket", detail: rpcErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!result?.success) {
      return new Response(
        JSON.stringify({ error: result?.error || "Échec de la mise à jour" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 4. Déclencher une notification Push aux citoyens (si applicable) ───────
    try {
      const { data: reportData } = await supabaseAdmin
        .from("reports")
        .select("commune, quartier, service_type")
        .eq("id", result.report_id)
        .single();

      if (reportData) {
        const pushTitle =
          normalizedStatus === "resolved"
            ? `✅ Incident résolu : Ticket ${result.ticket_code}`
            : `🛠️ Prise en charge : Ticket ${result.ticket_code}`;
        const pushMsg =
          note ||
          `${finalOperatorName} a mis à jour le statut du signalement à ${reportData.commune} (${reportData.quartier}).`;

        await supabaseAdmin.functions.invoke("send-push", {
          body: {
            action: "send",
            commune: reportData.commune,
            quartier: reportData.quartier,
            service_type: reportData.service_type,
            event_type: normalizedStatus === "resolved" ? "resolution" : "status_update",
            title: pushTitle,
            message: pushMsg,
            url: `/signalements/${result.report_id}`,
            tag: `ticket-${result.ticket_code}`,
          },
        }).catch(() => {});
      }
    } catch (_) {
      // Les notifications in-app sont déjà créées par la RPC
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Mise à jour du ticket enregistrée avec succès",
        data: result,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
