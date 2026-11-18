/**
 * Validates that a preview URL uses the safe `blob:` protocol created locally
 * via `URL.createObjectURL`, preventing DOM-based XSS if untrusted strings
 * reach an `<img src>` sink.
 */
export function toSafeBlobUrl(url: string | null | undefined): string | undefined {
  if (!url || typeof url !== "string") return undefined;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "blob:" ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}
