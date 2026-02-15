import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useSiteSetting = (key: string) => {
  return useQuery({
    queryKey: ["site-setting", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      return data?.value as boolean ?? true;
    },
    staleTime: 30_000,
  });
};
