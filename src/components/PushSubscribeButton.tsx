import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { toast } from "sonner";

interface PushSubscribeButtonProps {
  commune?: string;
  quartier?: string;
  className?: string;
}

const PushSubscribeButton = ({ commune, quartier, className }: PushSubscribeButtonProps) => {
  const { isSubscribed, isLoading, isSupported, permission, subscribe, unsubscribe } = usePushSubscription();

  if (!isSupported) return null;

  const status = isLoading ? "loading" : permission === "denied" ? "blocked" : isSubscribed ? "subscribed" : "idle";

  const handleClick = async () => {
    if (status === "subscribed") {
      await unsubscribe();
      toast.success("Notifications désactivées");
    } else if (status === "blocked") {
      toast.error("Notifications bloquées — autorisez-les dans les paramètres de votre navigateur");
    } else {
      const ok = await subscribe();
      if (ok) toast.success("Notifications activées ! Vous serez alerté lors des coupures.");
    }
  };

  const icon =
    status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> :
    status === "subscribed" ? <BellRing className="h-4 w-4 text-primary" /> :
    status === "blocked" ? <BellOff className="h-4 w-4 text-destructive" /> :
    <Bell className="h-4 w-4" />;

  const label =
    status === "loading" ? "Chargement..." :
    status === "subscribed" ? "Alertes activées" :
    status === "blocked" ? "Notifications bloquées" :
    "Activer les alertes";

  return (
    <Button
      variant={status === "subscribed" ? "default" : "outline"}
      size="sm"
      className={className}
      onClick={handleClick}
      disabled={status === "loading"}
    >
      {icon}
      <span className="ml-2">{label}</span>
    </Button>
  );
};

export default PushSubscribeButton;
