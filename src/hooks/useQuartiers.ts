import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getQuartiers } from "@/lib/quartiers";

/**
 * Fetches validated quartiers from DB for a commune.
 * Falls back to static list if DB query fails.
 */
export const useQuartiers = (commune: string) => {
  return useQuery({
    queryKey: ["quartiers", commune],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quartiers")
        .select("nom, source")
        .eq("commune", commune)
        .eq("validated", true)
        .order("nom");

      if (error) {
        console.warn("Falling back to static quartiers list:", error.message);
        return getQuartiers(commune).map((nom) => ({ nom, source: "static" }));
      }

      return (data || []) as { nom: string; source: string }[];
    },
    staleTime: 5 * 60 * 1000,
  });
};
