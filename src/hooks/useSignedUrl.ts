import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Given a storage path (from report-photos bucket), returns a signed URL.
 * If the value looks like a full URL (legacy data), returns it as-is.
 */
export function useSignedUrl(storagePath: string | null, expiresIn = 3600) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!storagePath) {
      setUrl(null);
      return;
    }

    // Legacy: if it's already a full URL, use it directly
    if (storagePath.startsWith("http")) {
      setUrl(storagePath);
      return;
    }

    let cancelled = false;

    const fetchUrl = async () => {
      const { data, error } = await supabase.storage
        .from("report-photos")
        .createSignedUrl(storagePath, expiresIn);

      if (!cancelled && !error && data) {
        setUrl(data.signedUrl);
      }
    };

    fetchUrl();

    return () => {
      cancelled = true;
    };
  }, [storagePath, expiresIn]);

  return url;
}
