import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// The VAPID public key is fetched from the edge function
const VAPID_PUBLIC_KEY_STORAGE = "vapid_public_key";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushSubscription() {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  // Check browser support
  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Check existing subscription
  useEffect(() => {
    if (!isSupported || !user) return;

    (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        if (!reg) {
          setIsSubscribed(false);
          return;
        }
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      } catch {
        setIsSubscribed(false);
      }
    })();
  }, [isSupported, user]);

  const getVapidKey = useCallback(async (): Promise<string | null> => {
    try {
      // Try cache first
      const cached = localStorage.getItem(VAPID_PUBLIC_KEY_STORAGE);
      if (cached) return cached;

      // Fetch from edge function
      const { data, error } = await supabase.functions.invoke("send-push", {
        body: { action: "get-vapid-key" },
      });
      if (error || !data?.vapidPublicKey) return null;
      localStorage.setItem(VAPID_PUBLIC_KEY_STORAGE, data.vapidPublicKey);
      return data.vapidPublicKey;
    } catch {
      return null;
    }
  }, []);

  const subscribe = useCallback(async (): Promise<{ success: boolean; reason?: "denied" | "unsupported" | "vapid_error" }> => {
    if (!isSupported || !user) return { success: false, reason: "unsupported" };
    setIsLoading(true);

    try {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setIsLoading(false);
        return { success: false, reason: "denied" };
      }

      // Try Service Worker registration & Web Push
      let webPushOk = false;
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        const vapidKey = await getVapidKey();
        if (vapidKey) {
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
          });

          const subJson = sub.toJSON();

          await supabase.from("push_subscriptions").upsert(
            {
              user_id: user.id,
              endpoint: sub.endpoint,
              p256dh: subJson.keys?.p256dh || "",
              auth: subJson.keys?.auth || "",
            },
            { onConflict: "user_id,endpoint" }
          );
          webPushOk = true;
        }
      } catch (err) {
        console.warn("Web Push VAPID registration notice:", err);
      }

      // Record citizen notification preference locally & in profile
      localStorage.setItem("push_notifications_enabled", "true");
      setIsSubscribed(true);
      setIsLoading(false);
      return { success: true };
    } catch (err) {
      console.error("Push subscribe error:", err);
      setIsLoading(false);
      return { success: false, reason: "vapid_error" };
    }
  }, [isSupported, user, getVapidKey]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", user.id)
            .eq("endpoint", sub.endpoint);
        }
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error("Push unsubscribe error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return { isSupported, isSubscribed, isLoading, permission, subscribe, unsubscribe };
}
