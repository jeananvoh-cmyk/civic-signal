import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-internal-key",
};

const JSON_HEADERS = { ...corsHeaders, "Content-Type": "application/json" };
const MAX_TITLE_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 500;
const MAX_URL_LENGTH = 500;
const MAX_EXCLUDE_USERS = 500;
const ALLOWED_EVENT_TYPES = new Set([
  "outage",
  "resolution",
  "status_update",
  "incident",
  "announcement",
]);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isAllowedInternalUrl(value: unknown): boolean {
  if (typeof value !== "string" || value.length > MAX_URL_LENGTH) return false;
  if (value.startsWith("/")) return !value.startsWith("//");
  try {
    const url = new URL(value);
    const allowedHost = Deno.env.get("PUBLIC_APP_HOST") || "app.signa-ci.app";
    return url.protocol === "https:" && url.hostname === allowedHost;
  } catch {
    return false;
  }
}

// ---- Web Push helpers (VAPID / RFC 8291) ----
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<"sent" | "invalid" | "retryable"> {
  try {
    const webpush = await import("npm:web-push@3.6.7");
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      payload,
    );
    return "sent";
  } catch (err: unknown) {
    const error = err as { statusCode?: number };
    console.error("Push send error:", error?.statusCode || "unknown");
    if (error?.statusCode === 404 || error?.statusCode === 410) return "invalid";
    return "retryable";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));

    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const INTERNAL_KEY = Deno.env.get("SEND_PUSH_INTERNAL_KEY");

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("send-push configuration incomplete");
      return json({ error: "Service unavailable" }, 503);
    }

    // Public action: only expose the VAPID public key.
    if (body.action === "get-vapid-key") {
      return json({ vapidPublicKey: VAPID_PUBLIC_KEY });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Internal service-to-service calls must use a dedicated secret.
    const internalHeader = req.headers.get("x-internal-key");
    const isInternal = Boolean(INTERNAL_KEY && internalHeader && internalHeader === INTERNAL_KEY);

    if (!isInternal) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

      const token = authHeader.slice("Bearer ".length).trim();
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !user) return json({ error: "Unauthorized" }, 401);

      const { data: callerProfile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (profileError || callerProfile?.role !== "admin") return json({ error: "Forbidden" }, 403);
    }

    if (body.action === "send") {
      const commune = normalize(body.commune);
      const quartier = normalize(body.quartier);
      const service_type = normalize(body.service_type);
      const event_type = normalize(body.event_type || "outage");
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const message = typeof body.message === "string" ? body.message.trim() : "";
      const url = body.url === undefined ? "/" : body.url;
      const tag = typeof body.tag === "string" ? body.tag.trim().slice(0, 120) : "";
      const exclude_user_ids = Array.isArray(body.exclude_user_ids) ? body.exclude_user_ids : [];

      if (!commune || !title || !message) return json({ error: "Missing required fields" }, 400);
      if (title.length > MAX_TITLE_LENGTH || message.length > MAX_MESSAGE_LENGTH) {
        return json({ error: "Notification content too long" }, 400);
      }
      if (!isAllowedInternalUrl(url)) return json({ error: "Invalid notification URL" }, 400);
      if (!ALLOWED_EVENT_TYPES.has(event_type)) return json({ error: "Invalid event type" }, 400);
      if (exclude_user_ids.length > MAX_EXCLUDE_USERS || exclude_user_ids.some((id: unknown) => typeof id !== "string")) {
        return json({ error: "Invalid exclude_user_ids" }, 400);
      }

      const { data: throttle } = await supabaseAdmin
        .from("push_throttle")
        .select("last_sent_at")
        .eq("commune", commune)
        .eq("quartier", quartier)
        .eq("service_type", service_type)
        .eq("event_type", event_type)
        .maybeSingle();

      if (throttle) {
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        if (new Date(throttle.last_sent_at).getTime() > oneHourAgo) {
          return json({ sent: 0, throttled: true });
        }
      }

      let profileQuery = supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("notifications_enabled", true)
        .ilike("commune", commune);
      if (quartier) profileQuery = profileQuery.ilike("quartier", quartier);

      const [{ data: targetProfiles }, { data: communeSubUsers }] = await Promise.all([
        profileQuery.limit(5000),
        supabaseAdmin
          .from("commune_subscriptions")
          .select("user_id")
          .ilike("commune", commune)
          .limit(5000),
      ]);

      const excluded = new Set<string>(exclude_user_ids);
      const idSet = new Set<string>();
      (targetProfiles ?? []).forEach((p: { user_id: string }) => { if (!excluded.has(p.user_id)) idSet.add(p.user_id); });
      (communeSubUsers ?? []).forEach((p: { user_id: string }) => { if (!excluded.has(p.user_id)) idSet.add(p.user_id); });
      const targetUserIds = [...idSet];
      if (targetUserIds.length === 0) return json({ sent: 0 });

      const { data: subscriptions, error: subscriptionsError } = await supabaseAdmin
        .from("push_subscriptions")
        .select("endpoint, user_id, p256dh, auth")
        .in("user_id", targetUserIds);
      if (subscriptionsError) return json({ error: "Unable to load subscriptions" }, 500);
      if (!subscriptions?.length) return json({ sent: 0, no_subscriptions: true });

      const payload = JSON.stringify({
        title,
        body: message,
        icon: "/icons/icon-192.png",
        tag: tag || `${event_type}-${commune}-${quartier || "all"}`,
        data: { url },
      });

      const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:contact@signa-ci.app";
      const results = await Promise.all(
        subscriptions.map(async (sub) => ({
          endpoint: sub.endpoint,
          result: await sendWebPush(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            payload,
            VAPID_PUBLIC_KEY,
            VAPID_PRIVATE_KEY,
            vapidSubject,
          ),
        })),
      );

      const sent = results.filter((r) => r.result === "sent").length;
      const invalidEndpoints = results.filter((r) => r.result === "invalid").map((r) => r.endpoint);
      if (invalidEndpoints.length) {
        await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", invalidEndpoints);
      }

      // Only record the throttle after at least one successful delivery.
      if (sent > 0) {
        await supabaseAdmin.from("push_throttle").upsert(
          {
            commune,
            quartier,
            service_type,
            event_type,
            last_sent_at: new Date().toISOString(),
          },
          { onConflict: "commune,quartier,service_type,event_type" },
        );
      }

      return json({ sent, total: subscriptions.length, retryable_failures: results.filter((r) => r.result === "retryable").length });
    }

    if (body.action === "send-to-user") {
      const { user_id, title, message, url = "/", report_id } = body;
      if (typeof user_id !== "string" || !user_id || typeof title !== "string" || !title.trim() || typeof message !== "string" || !message.trim()) {
        return json({ error: "Missing required fields" }, 400);
      }
      if (title.trim().length > MAX_TITLE_LENGTH || message.trim().length > MAX_MESSAGE_LENGTH) {
        return json({ error: "Notification content too long" }, 400);
      }
      if (!isAllowedInternalUrl(url)) return json({ error: "Invalid notification URL" }, 400);
      if (report_id !== undefined && typeof report_id !== "string") return json({ error: "Invalid report_id" }, 400);

      // A report-linked notification must be addressed to the report owner, not an arbitrary user.
      if (report_id) {
        const { data: report, error: reportError } = await supabaseAdmin
          .from("reports")
          .select("user_id")
          .eq("id", report_id)
          .maybeSingle();
        if (reportError || !report || report.user_id !== user_id) return json({ error: "Notification target mismatch" }, 403);
      }

      const { data: subscriptions, error: subscriptionsError } = await supabaseAdmin
        .from("push_subscriptions")
        .select("endpoint, user_id, p256dh, auth")
        .eq("user_id", user_id);
      if (subscriptionsError) return json({ error: "Unable to load subscriptions" }, 500);
      if (!subscriptions?.length) return json({ sent: 0, no_subscriptions: true });

      const payload = JSON.stringify({
        title: title.trim(),
        body: message.trim(),
        icon: "/icons/icon-192.png",
        tag: report_id ? `report-status-${report_id}` : "status-update",
        data: { url, report_id },
      });

      const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:contact@signa-ci.app";
      const results = await Promise.all(
        subscriptions.map(async (sub) => ({
          endpoint: sub.endpoint,
          result: await sendWebPush(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            payload,
            VAPID_PUBLIC_KEY,
            VAPID_PRIVATE_KEY,
            vapidSubject,
          ),
        })),
      );

      const sent = results.filter((r) => r.result === "sent").length;
      const invalidEndpoints = results.filter((r) => r.result === "invalid").map((r) => r.endpoint);
      if (invalidEndpoints.length) {
        await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", invalidEndpoints);
      }
      return json({ sent, total: subscriptions.length, retryable_failures: results.filter((r) => r.result === "retryable").length });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("send-push error:", err instanceof Error ? err.message : "unknown error");
    return json({ error: "Internal error" }, 500);
  }
});
