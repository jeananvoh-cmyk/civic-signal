import { supabase } from "@/integrations/supabase/client";
import type { PhotoArtifact } from "@/lib/photo-artifact";

export async function uploadPhotoArtifact(artifact: PhotoArtifact, userId: string, index = 0): Promise<string> {
  // Keep the path deterministic across retries. If an offline upload succeeds
  // but report insertion fails, the next flush must upsert the same object
  // rather than creating a second Storage object from Date.now().
  const path = artifact.storagePath ?? `${userId}/${artifact.id}.jpg`;
  const { error } = await supabase.storage.from("report-photos").upload(path, artifact.blob, {
    upsert: true,
    contentType: artifact.blob.type || "image/jpeg",
  });
  if (error) throw error;
  artifact.storagePath = path;
  return path;
}

export async function stagePhotoFingerprint(storagePath: string, userId: string, sha256: string): Promise<void> {
  const { error } = await supabase.from("photo_fingerprint_pending").insert({
    storage_path: storagePath,
    user_id: userId,
    hash: sha256,
  });

  // A retry of the same submission may stage the same fingerprint again.
  // Treat a PostgreSQL unique-constraint conflict as already staged so the
  // queue remains idempotent across reconnects and repeated flush attempts.
  if (error && !String((error as { code?: unknown }).code ?? "").includes("23505")) {
    throw error;
  }
}
