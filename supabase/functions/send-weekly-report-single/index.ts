/**
 * send-weekly-report-single — Valide et expédie un rapport hebdomadaire individuel
 *
 * Appelé par l'admin depuis le Centre de Validation Admin.
 * Body : { report_log_id: string, action: 'approve_send' | 'cancel' }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { report_log_id, action } = await req.json();

    if (!report_log_id) {
      return new Response(JSON.stringify({ error: "report_log_id manquant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Récupérer le log de rapport
    const { data: log, error: logErr } = await supabase
      .from("weekly_report_logs")
      .select("*")
      .eq("id", report_log_id)
      .single();

    if (logErr || !log) {
      return new Response(JSON.stringify({ error: "Rapport introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "cancel") {
      await supabase
        .from("weekly_report_logs")
        .update({
          status: "cancelled",
          error_message: "Annulé par l'administrateur avant envoi.",
        })
        .eq("id", report_log_id);

      return new Response(
        JSON.stringify({ success: true, status: "cancelled", target: log.target_entity }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Traitement d'approbation et envoi (action = 'approve_send')
    let emailSent = false;
    let errorMsg = null;

    if (resendApiKey) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Civic Signal <alertes@signa.ci>",
            to: [log.email_to],
            subject: `[Rapport Hebdomadaire] Synthèse d'Impact — ${log.target_entity}`,
            html: log.html_preview || `<p>Rapport d'impact pour ${log.target_entity}</p>`,
          }),
        });

        if (res.ok) {
          emailSent = true;
        } else {
          const errBody = await res.json();
          errorMsg = JSON.stringify(errBody);
        }
      } catch (err: unknown) {
        errorMsg = (err as Error).message;
      }
    } else {
      // En mode developpement/mock sans clé Resend
      emailSent = true;
    }

    // 3. Mettre à jour le statut du log
    await supabase
      .from("weekly_report_logs")
      .update({
        status: emailSent ? "approved_sent" : "error",
        approved_at: new Date().toISOString(),
        error_message: errorMsg,
      })
      .eq("id", report_log_id);

    return new Response(
      JSON.stringify({
        success: emailSent,
        status: emailSent ? "approved_sent" : "error",
        target: log.target_entity,
        email_to: log.email_to,
        error_message: errorMsg,
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
