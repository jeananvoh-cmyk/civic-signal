import { supabase } from "@/integrations/supabase/client";
import type { PhotoArtifact } from "@/lib/photo-artifact";
import { getPhotoStoragePath } from "@/lib/photo-storage";

export async function uploadPhotoArtifact(artifact: PhotoArtifact, userId: string): Promise<string> {
  // Keep the path deterministic across retries. If an offline upload succeeds
  // but report insertion fails, the next flush must upsert the same object
  // rather than creating a second Storage object from Date.now().
  const path = artifact.storagePath ?? getPhotoStoragePath(userId, artifact.id, artifact.blob);
  const { error } = await supabase.storage.from("report-photos").upload(path, artifact.blob, {
    upsert: true,
    contentType: artifact.blob.type || "image/jpeg",
  });
  if (error) throw error;
  artifact.storagePath = path;
  return path;
}

export function isSamePendingFingerprint(
  existing: { user_id: string; hash: string },
  userId: string,
  sha256: string,
): boolean {
  return existing.user_id === userId && existing.hash === sha256;
}

export async function stagePhotoFingerprint(storagePath: string, userId: string, sha256: string): Promise<void> {
  const { error } = await supabase.from("photo_fingerprint_pending").insert({
    storage_path: storagePath,
    user_id: userId,
    hash: sha256,
  });

  if (!error) return;

  // photo_fingerprint_pending is uniquely keyed by storage_path. A retry is
  // idempotent only when the existing row belongs to the same user and hash.
  if (!String((error as { code?: unknown }).code ?? "").includes("23505")) {
    throw error;
  }

  const { data: existing, error: lookupError } = await supabase
    .from("photo_fingerprint_pending")
    .select("user_id, hash")
    .eq("storage_path", storagePath)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (!existing || !isSamePendingFingerprint(existing, userId, sha256)) {
    throw new Error("Photo fingerprint conflict: storage path already belongs to a different fingerprint");
  }
}
