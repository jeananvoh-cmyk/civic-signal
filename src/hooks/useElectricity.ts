import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { computeEstimate } from "@/lib/consumptionEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ElectricityMeter {
  id: string;
  user_id: string;
  label: string;
  meter_number: string | null;
  created_at: string;
}

export interface ElectricityRecharge {
  id: string;
  meter_id: string;
  recharged_at: string;
  kwh_purchased: number;
  amount_fcfa: number | null;
  energy_fcfa: number | null;
  taxes_fcfa: number | null;
  token_code: string | null;
  reference: string | null;
  raw_sms: string | null;
  source: "sms" | "manual" | "receipt";
  created_at: string;
}

export interface ElectricityReading {
  id: string;
  meter_id: string;
  read_at: string;
  kwh_remaining: number;
  note: string | null;
  created_at: string;
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useElectricity() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // ── Compteurs ─────────────────────────────────────────────────────
  const metersQuery = useQuery({
    queryKey: ["electricity-meters", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("electricity_meters")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ElectricityMeter[];
    },
  });

  const meters = metersQuery.data ?? [];
  const activeMeter = meters[0] ?? null; // On prend le premier par défaut

  // ── Recharges du compteur actif ───────────────────────────────────
  const rechargesQuery = useQuery({
    queryKey: ["electricity-recharges", activeMeter?.id],
    enabled: !!activeMeter,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("electricity_recharges")
        .select("*")
        .eq("meter_id", activeMeter!.id)
        .order("recharged_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ElectricityRecharge[];
    },
  });

  // ── Lectures du compteur actif ────────────────────────────────────
  const readingsQuery = useQuery({
    queryKey: ["electricity-readings", activeMeter?.id],
    enabled: !!activeMeter,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("electricity_readings")
        .select("*")
        .eq("meter_id", activeMeter!.id)
        .order("read_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ElectricityReading[];
    },
  });

  const recharges = rechargesQuery.data ?? [];
  const readings = readingsQuery.data ?? [];

  // ── Estimation calculée ───────────────────────────────────────────
  const estimate = computeEstimate(
    recharges.map(r => ({ id: r.id, recharged_at: r.recharged_at, kwh_purchased: r.kwh_purchased })),
    readings.map(r => ({ id: r.id, read_at: r.read_at, kwh_remaining: r.kwh_remaining })),
  );

  // ─── Mutations ────────────────────────────────────────────────────

  const createMeter = useMutation({
    mutationFn: async (payload: { label: string; meter_number?: string }) => {
      const { data, error } = await (supabase as any)
        .from("electricity_meters")
        .insert({ ...payload, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as ElectricityMeter;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["electricity-meters"] }),
  });

  const addRecharge = useMutation({
    mutationFn: async (payload: Omit<ElectricityRecharge, "id" | "user_id" | "created_at">) => {
      const { error } = await (supabase as any)
        .from("electricity_recharges")
        .insert({ ...payload, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["electricity-recharges"] });
      qc.invalidateQueries({ queryKey: ["electricity-readings"] });
    },
  });

  const addReading = useMutation({
    mutationFn: async (payload: { meter_id: string; kwh_remaining: number; note?: string }) => {
      const { error } = await (supabase as any)
        .from("electricity_readings")
        .insert({ ...payload, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["electricity-readings"] }),
  });

  const deleteRecharge = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("electricity_recharges")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["electricity-recharges"] }),
  });

  const updateMeter = useMutation({
    mutationFn: async (payload: { id: string; meter_number?: string; label?: string }) => {
      const { id, ...rest } = payload;
      const { error } = await (supabase as any)
        .from("electricity_meters")
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["electricity-meters"] }),
  });

  return {
    // Data
    meters,
    activeMeter,
    recharges,
    readings,
    estimate,
    // States
    isLoading: metersQuery.isLoading,
    hasData: meters.length > 0,
    // Mutations
    createMeter,
    addRecharge,
    addReading,
    deleteRecharge,
    updateMeter,
  };
}
