import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const DISMISSED_KEY = "push_prompt_dismissed";

/**
 * Sticky banner shown once to authenticated users who haven't enabled push.
 * Dismissible (persisted to localStorage).
 */
export default function PushPromptBanner() {
  const { user } = useAuth();
  const { isSupported, isSubscribed, isLoading, permission, subscribe } = usePushSubscription();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isSupported || isSubscribed || permission === "denied") return;
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (!dismissed) setVisible(true);
  }, [isSupported, isSubscribed, permission]);

  if (!visible) return null;

  const handleSubscribe = async () => {
    const res = await subscribe();
    if (res.success) {
      toast.success("Notifications activées ! Vous serez alerté dès qu'un incident est détecté.");
      setVisible(false);
    } else if (res.reason === "denied") {
      toast.error("Notifications bloquées par votre navigateur. Cliquez sur le cadenas 🔒 de l'URL pour les autoriser.");
    } else {
      toast.info("Préférence enregistrée pour votre appareil.");
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="w-full rounded-2xl bg-emerald-500/8 border border-emerald-500/20 p-4 shadow-xs">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-0">
          <Bell className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-foreground leading-snug">
            Restez informé de l'avancement
          </p>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
            Recevez une alerte dès que ce signalement est pris en charge ou résolu.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={handleSubscribe}
            disabled={isLoading}
            className="h-8 text-xs px-3 font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs"
          >
            {isLoading ? "Activation..." : "Activer les alertes"}
          </Button>
          <button
            onClick={handleDismiss}
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Ignorer"
            title="Ignorer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
