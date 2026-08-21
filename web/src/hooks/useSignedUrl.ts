import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Given a storage path (from report-photos bucket), returns a signed URL.
 * If the value looks like a full URL (legacy data), returns it as-is.
 * Falls back to public URL if signed URL generation fails.
 */
export function useSignedUrl(storagePath: string | null, expiresIn = 3600) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!storagePath || typeof storagePath !== "string") {
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

      if (cancelled) return;

      if (!error && data) {
        setUrl(data.signedUrl);
      } else {
        // Fallback: try public URL
        console.warn("Signed URL failed, using public URL fallback:", error?.message);
        const { data: publicData } = supabase.storage
          .from("report-photos")
          .getPublicUrl(storagePath);
        if (publicData?.publicUrl) {
          setUrl(publicData.publicUrl);
        }
      }
    };

    fetchUrl();

    return () => {
      cancelled = true;
    };
  }, [storagePath, expiresIn]);

  return url;
}
