import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const PROFILE_REMINDER_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours
const PROFILE_REMINDER_STORAGE_KEY = "profile_completion_reminder_last_sent";

// Chaque champ : son onglet de destination et son anchor (pour le focus auto)
const FIELD_MAP: Record<string, { tab: string; field?: string; label: string; priority: number }> = {
  first_name:              { tab: "profile", field: "first_name",              label: "prénom",               priority: 1 },
  last_name:               { tab: "profile", field: "last_name",               label: "nom",                  priority: 1 },
  phone:                   { tab: "profile", field: "phone",                   label: "numéro WhatsApp",       priority: 1 },
  commune:                 { tab: "location",                                  label: "commune",               priority: 2 },
  quartier:                { tab: "location",                                  label: "quartier",              priority: 2 },
  electricity_client_id:   { tab: "utility",  field: "electricity_client_id",  label: "N° client CIE",        priority: 3 },
  electricity_meter_ref:   { tab: "utility",  field: "electricity_meter_ref",  label: "réf. compteur CIE",    priority: 3 },
  electricity_meter_number:{ tab: "utility",  field: "electricity_meter_number",label: "N° compteur CIE",     priority: 3 },
  water_client_id:         { tab: "utility",  field: "water_client_id",        label: "N° client SODECI",     priority: 3 },
  water_meter_ref:         { tab: "utility",  field: "water_meter_ref",        label: "réf. compteur SODECI", priority: 3 },
  water_meter_number:      { tab: "utility",  field: "water_meter_number",     label: "N° compteur SODECI",   priority: 3 },
};

interface MissingField {
  key: string;
  tab: string;
  field?: string;
  label: string;
  priority: number;
}

const ProfileCompletionNotifier = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [missingFields, setMissingFields] = useState<MissingField[]>([]);

  // ── Charger les champs manquants ──────────────────────────────────────────
  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (!user || authLoading) { setMissingFields([]); return; }

      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, phone, commune, quartier, electricity_client_id, electricity_meter_ref, electricity_meter_number, water_client_id, water_meter_ref, water_meter_number")
        .eq("user_id", user.id)
        .single();

      if (error || !data) { setMissingFields([]); return; }

      const missing: MissingField[] = (Object.entries(FIELD_MAP) as [string, typeof FIELD_MAP[string]][])
        .filter(([key]) => !String((data as any)[key] ?? "").trim())
        .map(([key, meta]) => ({ key, ...meta }))
        .sort((a, b) => a.priority - b.priority);

      setMissingFields(missing);
    };

    checkProfileCompletion();
  }, [user, authLoading]);

  // ── Afficher le toast si profil incomplet ─────────────────────────────────
  useEffect(() => {
    if (!user || missingFields.length === 0) return;
    if (["/profil", "/auth"].some((p) => location.pathname.startsWith(p))) return;

    const storageKey = `${PROFILE_REMINDER_STORAGE_KEY}:${user.id}`;
    const lastSentAt = Number(localStorage.getItem(storageKey) || "0");
    if (Date.now() - lastSentAt < PROFILE_REMINDER_INTERVAL_MS) return;

    // ── Construire le message selon priorité ──
    const topPriority = missingFields[0].priority;
    const topGroup = missingFields.filter((f) => f.priority === topPriority);
    const firstMissing = topGroup[0];

    const descriptions: Record<number, string> = {
      1: buildIdentityMsg(topGroup.map((f) => f.label)),
      2: buildLocationMsg(topGroup.map((f) => f.label)),
      3: "Ajoutez vos numéros de compteur CIE/SODECI pour renforcer vos signalements.",
    };
    const description = descriptions[topPriority];

    // URL cible : bon onglet + éventuellement le champ
    const params = new URLSearchParams({ tab: firstMissing.tab });
    if (firstMissing.field) params.set("field", firstMissing.field);
    const target = `/profil?${params.toString()}`;

    toast("Profil à compléter", {
      id: "profile-completion-reminder",
      description,
      duration: 10_000,
      action: {
        label: "Compléter",
        onClick: () => navigate(target),
      },
    });

    localStorage.setItem(storageKey, String(Date.now()));
  }, [user, missingFields, location.pathname, navigate]);

  return null;
};

function buildIdentityMsg(labels: string[]) {
  const list = labels.slice(0, 3).join(", ");
  return `Ajoutez votre ${list} pour que vos signalements soient pris au sérieux par les opérateurs.`;
}

function buildLocationMsg(labels: string[]) {
  const missing = labels;
  if (missing.includes("commune") && missing.includes("quartier")) {
    return "Indiquez votre commune et votre quartier pour recevoir des alertes dans votre zone.";
  }
  if (missing.includes("commune")) return "Indiquez votre commune pour activer les alertes de proximité.";
  return "Indiquez votre quartier pour affiner les alertes reçues.";
}

export default ProfileCompletionNotifier;
