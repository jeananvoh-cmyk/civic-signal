import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRelayConfig(key: string, defaultValue: string) {
  return useQuery({
    queryKey: ["relay-config", key],
    queryFn: async () => {
      const { data } = await supabase
        .from("relay_config")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      return data?.value ?? defaultValue;
    },
    staleTime: 60_000,
  });
}
