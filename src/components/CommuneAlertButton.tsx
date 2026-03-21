import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { toast } from "sonner";

interface CommuneAlertButtonProps {
  commune: string;
}

/**
 * Toggle button to subscribe/unsubscribe from commune-level push alerts.
 * Requires the user to be authenticated and to have push notifications enabled.
 */
export default function CommuneAlertButton({ commune }: CommuneAlertButtonProps) {
  const { user } = useAuth();
  const { isSupported, isSubscribed: hasPushSub, subscribe, permission } = usePushSubscription();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  // Check current subscription status for this commune
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    supabase
      .from("commune_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("commune", commune)
      .maybeSingle()
      .then(({ data }) => {
        setSubscribed(!!data);
        setLoading(false);
      });
  }, [user, commune]);

  if (!user || !isSupported) return null;

  const handleToggle = async () => {
    setToggling(true);

    // Ensure push subscription exists first
    if (!hasPushSub) {
      const ok = await subscribe();
      if (!ok) {
        if (permission === "denied") {
          toast.error("Notifications bloquées — activez-les dans les paramètres du navigateur.");
        } else {
          toast.error("Impossible d'activer les notifications push.");
        }
        setToggling(false);
        return;
      }
    }

    if (subscribed) {
      const { error } = await supabase
        .from("commune_subscriptions")
        .delete()
        .eq("user_id", user.id)
        .eq("commune", commune);

      if (error) {
        toast.error("Erreur lors du désabonnement.");
      } else {
        setSubscribed(false);
        toast.info(`Alertes désactivées pour ${commune}.`);
      }
    } else {
      const { error } = await supabase
        .from("commune_subscriptions")
        .insert({ user_id: user.id, commune });

      if (error) {
        toast.error("Erreur lors de l'abonnement.");
      } else {
        setSubscribed(true);
        toast.success(`Vous recevrez les alertes de ${commune} !`);
      }
    }

    setToggling(false);
  };

  if (loading) return null;

  return (
    <Button
      variant={subscribed ? "secondary" : "outline"}
      size="sm"
      onClick={handleToggle}
      disabled={toggling}
      className="gap-1.5 h-8 text-xs"
    >
      {toggling ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : subscribed ? (
        <BellOff className="h-3.5 w-3.5" />
      ) : (
        <Bell className="h-3.5 w-3.5" />
      )}
      {subscribed ? "Alertes actives" : "S'abonner aux alertes"}
    </Button>
  );
}
