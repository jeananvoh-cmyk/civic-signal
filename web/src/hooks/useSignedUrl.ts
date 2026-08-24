import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Given a storage path (from report-photos bucket), returns a signed URL.
 * Legacy full URLs remain supported for backward compatibility.
 * Private report photos fail closed if signing fails; there is no public fallback.
 */
export function useSignedUrl(storagePath: string | null, expiresIn = 3600) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!storagePath || typeof storagePath !== "string") {
      setUrl(null);
      return;
    }

    // Legacy: if it's already a full URL, use it directly.
    // New uploads store private Storage paths and use signed URLs below.
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
        // The bucket is private. Never downgrade a failed authorization
        // attempt to a public URL.
        console.warn("Signed URL failed for private report photo:", error?.message);
        setUrl(null);
      }
    };

    fetchUrl();

    return () => {
      cancelled = true;
    };
  }, [storagePath, expiresIn]);

  return url;
}
