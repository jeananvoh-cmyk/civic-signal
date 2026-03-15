import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export type PushStatus = "unsupported" | "blocked" | "subscribed" | "unsubscribed" | "loading";

export function usePushSubscription(commune?: string, quartier?: string) {
  const { user } = useAuth();
  const [status, setStatus] = useState<PushStatus>("loading");

  const isSupported =
    "serviceWorker" in navigator && "PushManager" in window && !!VAPID_PUBLIC_KEY;

  const checkStatus = useCallback(async () => {
    if (!isSupported) { setStatus("unsupported"); return; }
    if (!user) { setStatus("unsubscribed"); return; }

    const permission = Notification.permission;
    if (permission === "denied") { setStatus("blocked"); return; }

    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      setStatus(existing ? "subscribed" : "unsubscribed");
    } catch {
      setStatus("unsubscribed");
    }
  }, [isSupported, user]);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !user || !VAPID_PUBLIC_KEY) return;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") { setStatus("blocked"); return; }

    setStatus("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = sub.toJSON();
      const keys = json.keys as { p256dh: string; auth: string };

      await supabase.from("push_subscriptions" as any).upsert({
        user_id: user.id,
        endpoint: json.endpoint!,
        p256dh: keys.p256dh,
        auth: keys.auth,
        commune: commune ?? "",
        quartier: quartier ?? null,
      }, { onConflict: "user_id,endpoint" });

      setStatus("subscribed");
    } catch (err) {
      console.error("Push subscribe error:", err);
      setStatus("unsubscribed");
    }
  }, [isSupported, user, commune, quartier]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !user) return;
    setStatus("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase
          .from("push_subscriptions" as any)
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("unsubscribed");
    } catch {
      setStatus("subscribed");
    }
  }, [isSupported, user]);

  return { status, subscribe, unsubscribe, isSupported };
}
