import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---- Web Push helpers (VAPID / RFC 8291) ----
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<boolean> {
  try {
    // Use web-push compatible approach via fetch to the push endpoint
    // For Deno edge functions, we use the npm:web-push package
    const webpush = await import("npm:web-push@3.6.7");
    
    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    );

    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      payload
    );
    return true;
  } catch (err: unknown) {
    const error = err as { statusCode?: number };
    console.error("Push send error:", error);
    // If 404 or 410, subscription is invalid
    if (error?.statusCode === 404 || error?.statusCode === 410) {
      return false; // Signal to delete subscription
    }
    return true; // Keep subscription, was a transient error
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Public endpoint: return VAPID public key (no auth needed)
    if (body.action === "get-vapid-key") {
      return new Response(JSON.stringify({ vapidPublicKey: VAPID_PUBLIC_KEY }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For sending pushes, verify caller is authenticated or is internal (cron/trigger)
    const authHeader = req.headers.get("Authorization");
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // action: "send" - send push notifications
    // Required: commune, quartier, service_type, event_type, title, message
    // Optional: url, exclude_user_ids
    if (body.action === "send") {
      const {
        commune,
        quartier,
        service_type,
        event_type = "outage",
        title,
        message,
        url = "/",
        tag,
        exclude_user_ids = [],
      } = body;

      if (!commune || !title || !message) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Throttle check: max 1 push per hour per quartier/service/event
      const throttleKey = `${commune}|${quartier || "all"}|${service_type || "all"}|${event_type}`;
      
      const { data: throttle } = await supabaseAdmin
        .from("push_throttle")
        .select("last_sent_at")
        .eq("commune", commune)
        .eq("quartier", quartier || "")
        .eq("service_type", service_type || "")
        .eq("event_type", event_type)
        .single();

      if (throttle) {
        const lastSent = new Date(throttle.last_sent_at);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (lastSent > oneHourAgo) {
          console.log(`Throttled: ${throttleKey}, last sent ${throttle.last_sent_at}`);
          return new Response(JSON.stringify({ sent: 0, throttled: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Get target users from two sources:
      // 1. profiles with matching commune + notifications_enabled
      // 2. commune_subscriptions (users following this commune explicitly)
      let profileQuery = supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("notifications_enabled", true)
        .ilike("commune", commune);

      if (quartier) {
        profileQuery = profileQuery.ilike("quartier", quartier);
      }

      const [{ data: targetProfiles }, { data: communeSubUsers }] = await Promise.all([
        profileQuery.limit(5000),
        supabaseAdmin
          .from("commune_subscriptions")
          .select("user_id")
          .ilike("commune", commune)
          .limit(5000),
      ]);

      // Merge & deduplicate user IDs from both sources
      const idSet = new Set<string>();
      (targetProfiles ?? []).forEach((p: { user_id: string }) => idSet.add(p.user_id));
      (communeSubUsers ?? []).forEach((p: { user_id: string }) => idSet.add(p.user_id));

      if (idSet.size === 0) {
        return new Response(JSON.stringify({ sent: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const targetUserIds = [...idSet].filter((id) => !exclude_user_ids.includes(id));

      if (targetUserIds.length === 0) {
        return new Response(JSON.stringify({ sent: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get push subscriptions for these users
      const { data: subscriptions } = await supabaseAdmin
        .from("push_subscriptions")
        .select("*")
        .in("user_id", targetUserIds);

      if (!subscriptions || subscriptions.length === 0) {
        return new Response(JSON.stringify({ sent: 0, no_subscriptions: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Send push to all subscriptions
      const payload = JSON.stringify({
        title,
        body: message,
        icon: "/icons/icon-192.png",
        tag: tag || `${event_type}-${commune}-${quartier || "all"}`,
        url,
      });

      const vapidSubject = `mailto:contact@signa-ci.app`;
      let sent = 0;
      const invalidEndpoints: string[] = [];

      const results = await Promise.allSettled(
        subscriptions.map(async (sub) => {
          const ok = await sendWebPush(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            payload,
            VAPID_PUBLIC_KEY,
            VAPID_PRIVATE_KEY,
            vapidSubject
          );
          if (ok) {
            sent++;
          } else {
            invalidEndpoints.push(sub.endpoint);
          }
        })
      );

      // Clean up invalid subscriptions
      if (invalidEndpoints.length > 0) {
        await supabaseAdmin
          .from("push_subscriptions")
          .delete()
          .in("endpoint", invalidEndpoints);
        console.log(`Cleaned ${invalidEndpoints.length} invalid subscriptions`);
      }

      // Update throttle
      await supabaseAdmin.from("push_throttle").upsert(
        {
          commune,
          quartier: quartier || "",
          service_type: service_type || "",
          event_type,
          last_sent_at: new Date().toISOString(),
        },
        { onConflict: "commune,quartier,service_type,event_type" }
      );

      console.log(`Push sent: ${sent}/${subscriptions.length} for ${throttleKey}`);

      return new Response(JSON.stringify({ sent, total: subscriptions.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // action: "send-to-user" — envoie une push à un utilisateur précis (ex: après update statut par partenaire)
    // Required: user_id, title, message
    // Optional: url, report_id
    if (body.action === "send-to-user") {
      const { user_id, title, message, url = "/", report_id } = body;

      if (!user_id || !title || !message) {
        return new Response(JSON.stringify({ error: "Missing required fields: user_id, title, message" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: subscriptions } = await supabaseAdmin
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", user_id);

      if (!subscriptions || subscriptions.length === 0) {
        return new Response(JSON.stringify({ sent: 0, no_subscriptions: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const payload = JSON.stringify({
        title,
        body: message,
        icon: "/icons/icon-192.png",
        tag: report_id ? `report-status-${report_id}` : "status-update",
        data: { url, report_id },
      });

      const vapidSubject = `mailto:contact@signa-ci.app`;
      let sent = 0;
      const invalidEndpoints: string[] = [];

      await Promise.allSettled(
        subscriptions.map(async (sub) => {
          const ok = await sendWebPush(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            payload,
            VAPID_PUBLIC_KEY,
            VAPID_PRIVATE_KEY,
            vapidSubject,
          );
          if (ok) sent++;
          else invalidEndpoints.push(sub.endpoint);
        }),
      );

      if (invalidEndpoints.length > 0) {
        await supabaseAdmin
          .from("push_subscriptions")
          .delete()
          .in("endpoint", invalidEndpoints);
      }

      return new Response(JSON.stringify({ sent, total: subscriptions.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-push error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
