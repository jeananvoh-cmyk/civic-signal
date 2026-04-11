import { useEffect, useRef, useState } from "react";
import { WifiOff } from "lucide-react";
import { toast } from "sonner";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";

const OfflineBar = () => {
  const [offline, setOffline] = useState(!navigator.onLine);
  const wasOfflineRef = useRef(false);
  const { queue, flush } = useOfflineQueue();

  useEffect(() => {
    const goOffline = () => {
      setOffline(true);
      wasOfflineRef.current = true;
    };
    const goOnline = async () => {
      setOffline(false);
      if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        // Flush queued reports and notify user
        const sent = await flush();
        if (sent && sent > 0) {
          toast.success(`${sent} signalement${sent > 1 ? "s" : ""} envoy\u00E9${sent > 1 ? "s" : ""}`, {
            description: "Vos signalements hors ligne ont \u00E9t\u00E9 transmis.",
          });
        }
      }
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, [flush]);

  if (!offline) return null;

  return (
    <div className="bg-destructive text-destructive-foreground text-center text-sm py-1 px-3 flex items-center justify-center gap-2">
      <WifiOff className="h-3.5 w-3.5" />
      Hors ligne
      {queue.length > 0 && (
        <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-semibold">
          {queue.length} en attente
        </span>
      )}
    </div>
  );
};

export default OfflineBar;
