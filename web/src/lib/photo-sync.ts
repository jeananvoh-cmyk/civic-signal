import { supabase } from "@/integrations/supabase/client";
import type { PhotoArtifact } from "@/lib/photo-artifact";

export async function uploadPhotoArtifact(artifact: PhotoArtifact, userId: string, index = 0): Promise<string> {
  const path = artifact.storagePath ?? `${userId}/${Date.now()}_${index}_${artifact.id}.jpg`;
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
  if (error) throw error;
}
