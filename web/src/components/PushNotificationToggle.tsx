import { Bell, BellOff, Smartphone } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { toast } from "sonner";

export default function PushNotificationToggle() {
  const { isSupported, isSubscribed, isLoading, permission, subscribe, unsubscribe } = usePushSubscription();

  if (!isSupported) {
    return (
      <div className="flex items-center justify-between opacity-50">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
            <BellOff className="h-4 w-4 text-secondary-foreground" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">Notifications push</p>
            <p className="text-xs text-muted-foreground">Non supporté par ce navigateur</p>
          </div>
        </div>
      </div>
    );
  }

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      const res = await subscribe();
      if (res.success) {
        toast.success("Notifications push activées !");
      } else if (res.reason === "denied") {
        toast.error("Les notifications sont bloquées. Activez-les dans les paramètres de votre navigateur.");
      } else {
        toast.info("Préférence enregistrée pour votre compte.");
      }
    } else {
      await unsubscribe();
      toast.info("Notifications push désactivées.");
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
          <Smartphone className="h-4 w-4 text-secondary-foreground" />
        </div>
        <div>
          <p className="font-semibold text-sm text-foreground">Notifications push</p>
          <p className="text-xs text-muted-foreground">
            {isSubscribed
              ? "Recevez des alertes même hors de l'appli"
              : permission === "denied"
              ? "Bloqué — vérifiez les paramètres du navigateur"
              : "Alertes sur votre appareil en temps réel"}
          </p>
        </div>
      </div>
      <Switch
        checked={isSubscribed}
        onCheckedChange={handleToggle}
        disabled={isLoading || permission === "denied"}
      />
    </div>
  );
}
