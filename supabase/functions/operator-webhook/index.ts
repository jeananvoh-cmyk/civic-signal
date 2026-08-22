/**
 * operator-webhook
 * ----------------
 * Secure endpoint for authorized operators/partners to update a report status.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-operator-key",
};
const JSON_HEADERS = { ...corsHeaders, "Content-Type": "application/json" };
const ALLOWED_STATUSES = new Set(["processing", "resolved", "rejected", "acknowledged"]);
const MAX_NOTE_LENGTH = 1000;
const MAX_REFERENCE_LENGTH = 120;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const webhookKey = Deno.env.get("OPERATOR_WEBHOOK_KEY");

    // Never fall back to a hard-coded production secret.
    if (!supabaseUrl || !serviceRoleKey || !webhookKey) {
      console.error("operator-webhook configuration incomplete");
      return json({ error: "Service unavailable" }, 503);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const operatorKeyHeader = req.headers.get("x-operator-key");
    const authHeader = req.headers.get("Authorization");

    let isAuthorized = false;
    let callerOrg = "Opérateur API";

    if (operatorKeyHeader && operatorKeyHeader === webhookKey) {
      isAuthorized = true;
    }

    if (!isAuthorized && authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice("Bearer ".length).trim();
      const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);

      if (user && !authErr) {
        const [{ data: hasRole }, { data: isAdmin }] = await Promise.all([
          supabaseAdmin.rpc("has_role", { _user_id: user.id, _role: "partner" }),
          supabaseAdmin.rpc("has_role", { _user_id: user.id, _role: "admin" }),
        ]);

        if (hasRole || isAdmin) {
          isAuthorized = true;
          const { data: partnerProf } = await supabaseAdmin
            .from("partner_profiles")
            .select("org_name")
            .eq("user_id", user.id)
            .maybeSingle();
          if (partnerProf?.org_name) callerOrg = partnerProf.org_name;
        }
      }
    }

    if (!isAuthorized) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const ticketCode = typeof body.ticket_code === "string" ? body.ticket_code.trim() : "";
    const reportId = typeof body.report_id === "string" ? body.report_id.trim() : "";
    const status = typeof body.status === "string" ? body.status.trim().toLowerCase() : "processing";
    const operatorReference = body.operator_reference == null ? null : String(body.operator_reference).trim();
    const note = body.note == null ? null : String(body.note).trim();
    const estimatedResolution = body.estimated_resolution_time == null ? null : String(body.estimated_resolution_time).trim();

    // Exactly one canonical report identifier must be supplied.
    if (Boolean(ticketCode) === Boolean(reportId)) {
      return json({ error: "Provide exactly one of ticket_code or report_id" }, 400);
    }
    if (!ALLOWED_STATUSES.has(status)) return json({ error: "Invalid status" }, 400);
    if (operatorReference && operatorReference.length > MAX_REFERENCE_LENGTH) return json({ error: "operator_reference too long" }, 400);
    if (note && note.length > MAX_NOTE_LENGTH) return json({ error: "note too long" }, 400);

    // Ignore client-supplied operator_name: the authenticated identity is authoritative.
    const finalOperatorName = callerOrg;
    const normalizedStatus = status === "acknowledged" ? "processing" : status;

    const { data: result, error: rpcErr } = await supabaseAdmin.rpc("operator_update_ticket", {
      p_ticket_code: ticketCode || null,
      p_report_id: reportId || null,
      p_status: normalizedStatus,
      p_operator_name: finalOperatorName,
      p_operator_reference: operatorReference,
      p_public_note: note,
      p_estimated_resolution: estimatedResolution,
    });

    if (rpcErr) {
      console.error("operator_update_ticket failed", rpcErr.message);
      return json({ error: "Unable to update ticket" }, 500);
    }
    if (!result?.success) return json({ error: result?.error || "Unable to update ticket" }, 400);

    try {
      const { data: reportData } = await supabaseAdmin
        .from("reports")
        .select("commune, quartier, service_type")
        .eq("id", result.report_id)
        .single();

      const internalPushKey = Deno.env.get("SEND_PUSH_INTERNAL_KEY");
      if (reportData && internalPushKey) {
        const pushTitle = normalizedStatus === "resolved"
          ? `Incident résolu : Ticket ${result.ticket_code}`
          : `Prise en charge : Ticket ${result.ticket_code}`;
        const pushMsg = note || `${finalOperatorName} a mis à jour le statut du signalement à ${reportData.commune} (${reportData.quartier || ""}).`;

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
          headers: { "x-internal-key": internalPushKey },
        }).catch((error) => console.error("send-push invocation failed", error));
      }
    } catch (error) {
      console.error("notification dispatch failed", error);
    }

    return json({ success: true, message: "Mise à jour du ticket enregistrée avec succès", data: result });
  } catch (err: unknown) {
    console.error("operator-webhook error:", err instanceof Error ? err.message : "unknown error");
    return json({ error: "Internal error" }, 500);
  }
});
