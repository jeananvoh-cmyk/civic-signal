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
    <div className="w-full bg-primary/5 border-b border-primary/20 px-4 py-2.5">
      <div className="container max-w-4xl flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Bell className="h-4 w-4 text-primary" />
        </div>
        <p className="text-sm text-foreground flex-1">
          <span className="font-semibold">Restez informé en temps réel.</span>{" "}
          Recevez une alerte dès qu'une coupure est signalée près de chez vous.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={handleSubscribe}
            disabled={isLoading}
            className="h-7 text-xs px-3"
          >
            Activer
          </Button>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
