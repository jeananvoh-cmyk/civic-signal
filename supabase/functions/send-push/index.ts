// Supabase Edge Function — send-push
// Sends Web Push notifications to subscribed users in a given commune/quartier.
//
// Required Supabase secrets (set via `supabase secrets set`):
//   VAPID_PUBLIC_KEY  — base64url-encoded ECDSA P-256 public key
//   VAPID_PRIVATE_KEY — base64url-encoded ECDSA P-256 private key
//   VAPID_SUBJECT     — mailto: or https: contact URL  e.g. "mailto:admin@signa-ci.app"
//
// Generate keys:  npx web-push generate-vapid-keys

// @deno-types="npm:@types/web-push@3.6.1"
import webpush from "npm:web-push@3.6.6";
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
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@signa-ci.app";

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const {
      commune,
      quartier,
      title,
      message,
      report_id,
      exclude_user_id,
    }: {
      commune: string;
      quartier?: string;
      title: string;
      message: string;
      report_id?: string;
      exclude_user_id?: string;
    } = body;

    if (!commune || !title || !message) {
      return new Response(
        JSON.stringify({ error: "commune, title, message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch push subscriptions matching commune (and optionally quartier)
    let query = supabase
      .from("push_subscriptions")
      .select("*")
      .eq("commune", commune);

    if (quartier) {
      query = query.or(`quartier.eq.${quartier},quartier.is.null`);
    }

    if (exclude_user_id) {
      query = query.neq("user_id", exclude_user_id);
    }

    const { data: subs, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({
      title,
      body: message,
      data: { report_id, url: report_id ? `/verification?report=${report_id}` : "/" },
    });

    let sent = 0;
    const expired: string[] = [];

    await Promise.allSettled(
      subs.map(async (sub: any) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
          sent++;
        } catch (err: any) {
          // 410 Gone / 404 = subscription expired, clean it up
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            expired.push(sub.id);
          }
        }
      })
    );

    // Remove expired subscriptions
    if (expired.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", expired);
    }

    return new Response(JSON.stringify({ sent, expired: expired.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
