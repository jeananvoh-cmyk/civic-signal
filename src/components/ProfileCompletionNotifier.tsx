import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const PROFILE_REMINDER_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours
const PROFILE_REMINDER_STORAGE_KEY = "profile_completion_reminder_last_sent";

const ProfileCompletionNotifier = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileIncomplete, setProfileIncomplete] = useState(false);

  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (!user || authLoading) {
        setProfileIncomplete(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("phone, commune, quartier, electricity_client_id, electricity_meter_number, water_client_id, water_meter_number")
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        setProfileIncomplete(false);
        return;
      }

      const requiredValues = [
        data.phone,
        data.commune,
        data.quartier,
        data.electricity_client_id,
        data.electricity_meter_number,
        data.water_client_id,
        data.water_meter_number,
      ];

      setProfileIncomplete(requiredValues.some((value) => !String(value ?? "").trim()));
    };

    checkProfileCompletion();
  }, [user, authLoading]);

  useEffect(() => {
    if (!user || !profileIncomplete || location.pathname === "/profil" || location.pathname === "/auth") {
      return;
    }

    const storageKey = `${PROFILE_REMINDER_STORAGE_KEY}:${user.id}`;
    const lastSentAt = Number(localStorage.getItem(storageKey) || "0");
    const now = Date.now();

    if (now - lastSentAt < PROFILE_REMINDER_INTERVAL_MS) {
      return;
    }

    toast("Profil à compléter", {
      id: "profile-completion-reminder",
      description:
        "Ajoutez votre numéro WhatsApp, votre localisation et vos compteurs pour améliorer la fiabilité de vos signalements.",
      duration: 9000,
      action: {
        label: "Compléter",
        onClick: () => navigate("/profil"),
      },
    });

    localStorage.setItem(storageKey, String(now));
  }, [user, profileIncomplete, location.pathname, navigate]);

  return null;
};

export default ProfileCompletionNotifier;
