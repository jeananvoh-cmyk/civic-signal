import { useEffect, useRef, useState } from "react";
import { WifiOff, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";

const OfflineBar = () => {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [pendingDismissed, setPendingDismissed] = useState(false);
  const wasOfflineRef = useRef(false);
  const { queue, flush, flushing } = useOfflineQueue();

  useEffect(() => {
    const goOffline = () => {
      setOffline(true);
      wasOfflineRef.current = true;
    };
    const goOnline = async () => {
      setOffline(false);
      if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        const sent = await flush();
        if (sent && sent > 0) {
          toast.success(`${sent} signalement${sent > 1 ? "s" : ""} envoyé${sent > 1 ? "s" : ""}`, {
            description: "Vos signalements hors ligne ont été transmis.",
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

  // Réafficher la bannière si de nouveaux éléments arrivent en queue
  useEffect(() => {
    if (queue.length > 0) setPendingDismissed(false);
  }, [queue.length]);

  if (offline) {
    return (
      <div className="bg-destructive text-destructive-foreground text-center text-sm py-1 px-3 flex items-center justify-center gap-2">
        <WifiOff className="h-3.5 w-3.5" />
        Hors ligne
        {queue.length > 0 && (
          <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-semibold">
            {queue.length} signalement{queue.length > 1 ? "s" : ""} en attente
          </span>
        )}
      </div>
    );
  }

  if (queue.length > 0 && !pendingDismissed) {
    return (
      <div className="bg-warning/15 border-b border-warning/30 text-sm py-1.5 px-3 flex items-center justify-center gap-2">
        <Upload className="h-3.5 w-3.5 text-warning shrink-0" />
        <span className="text-foreground font-medium">
          {flushing
            ? `Envoi de ${queue.length} signalement${queue.length > 1 ? "s" : ""}\u2026`
            : `${queue.length} signalement${queue.length > 1 ? "s" : ""} en attente d'envoi`}
        </span>
        {!flushing && (
          <>
            <button
              onClick={() => flush()}
              className="ml-1 rounded-full bg-warning/20 px-2 py-0.5 text-xs font-semibold text-warning hover:bg-warning/30 transition-colors"
            >
              Envoyer
            </button>
            <button
              onClick={() => setPendingDismissed(true)}
              aria-label="Masquer"
              className="ml-auto rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    );
  }

  return null;
};

export default OfflineBar;
