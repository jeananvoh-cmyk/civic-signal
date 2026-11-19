import { supabase } from "@/integrations/supabase/client";
import type { PhotoArtifact } from "@/lib/photo-artifact";
import { getPhotoStoragePath } from "@/lib/photo-storage";
import { deletePhotoArtifacts, storePhotoArtifacts } from "@/lib/offline-photo-store";

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

export interface OnlineReportSubmissionInput {
  userId: string;
  clientSubmissionId: string;
  reportPayload: Record<string, unknown>;
  existingPhotoUrls: string[];
  photoArtifacts: PhotoArtifact[];
  draftPhotoGroupId?: string;
}

export interface OnlineReportSubmissionResult {
  reportId: string | null;
  photoUrls: string[];
  uploadedArtifacts: PhotoArtifact[];
  wasDuplicate: boolean;
}

export interface OnlineReportSubmissionDeps {
  uploadArtifact?: typeof uploadPhotoArtifact;
  stageFingerprint?: typeof stagePhotoFingerprint;
  storePhotos?: typeof storePhotoArtifacts;
  deletePhotos?: typeof deletePhotoArtifacts;
  insertReport?: (
    payload: Record<string, unknown>,
  ) => Promise<{
    data: { id?: string } | null;
    error: { code?: unknown; message?: string; details?: string } | null;
  }>;
  findExistingReport?: (
    clientSubmissionId: string,
    userId: string,
  ) => Promise<{ id: string } | null>;
  onArtifactUploaded?: (artifact: PhotoArtifact, storagePath: string) => void;
}

async function defaultFindExistingReport(
  clientSubmissionId: string,
  userId: string,
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("reports")
    .select("id")
    .eq("client_submission_id", clientSubmissionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data?.id ? { id: String(data.id) } : null;
}

/**
 * Online submission orchestrator that guarantees any locally staged offline
 * photo artifacts lacking a `storagePath` are uploaded to Storage and have
 * their SHA-256 fingerprints staged before inserting into `reports`.
 *
 * Fail-closed guarantees:
 * - Any photo upload or fingerprint error aborts BEFORE `reports.insert`.
 * - Local photo blobs in IndexedDB are preserved on failure and deleted ONLY
 *   after report insertion (or idempotent duplicate lookup on 23505) succeeds.
 */
export async function submitReportOnlineWithArtifacts(
  input: OnlineReportSubmissionInput,
  deps: OnlineReportSubmissionDeps = {},
): Promise<OnlineReportSubmissionResult> {
  const uploadArtifact = deps.uploadArtifact ?? uploadPhotoArtifact;
  const stageFingerprint = deps.stageFingerprint ?? stagePhotoFingerprint;
  const storePhotos = deps.storePhotos ?? storePhotoArtifacts;
  const deletePhotos = deps.deletePhotos ?? deletePhotoArtifacts;
  const insertReport =
    deps.insertReport ??
    (async (payload) => {
      const { data, error } = await supabase
        .from("reports")
        .insert(payload as never)
        .select("id")
        .single();
      return { data: data as { id?: string } | null, error };
    });
  const findExistingReport = deps.findExistingReport ?? defaultFindExistingReport;

  const { userId, clientSubmissionId, reportPayload, existingPhotoUrls, photoArtifacts } = input;
  const photoGroupId = input.draftPhotoGroupId ?? clientSubmissionId;

  const pendingArtifacts = photoArtifacts.filter((artifact) => !artifact.storagePath);
  if (pendingArtifacts.length > 0) {
    try {
      await storePhotos(photoGroupId, pendingArtifacts);
    } catch {
      // Best-effort local backup: proceed with online upload if IndexedDB is unavailable.
    }
  }

  const resolvedArtifacts: PhotoArtifact[] = photoArtifacts.map((artifact) => ({ ...artifact }));

  for (const artifact of resolvedArtifacts) {
    if (artifact.storagePath) continue;

    // Upload using a temporary copy so `artifact.storagePath` is only finalized
    // once BOTH Storage upload and SHA-256 fingerprint staging succeed.
    const uploadCopy: PhotoArtifact = { ...artifact };
    const storagePath = await uploadArtifact(uploadCopy, userId);
    await stageFingerprint(storagePath, userId, artifact.sha256);

    artifact.storagePath = storagePath;
    deps.onArtifactUploaded?.(artifact, storagePath);
  }

  const finalPhotoUrls: string[] = [];
  for (const artifact of resolvedArtifacts) {
    if (artifact.storagePath && !finalPhotoUrls.includes(artifact.storagePath)) {
      finalPhotoUrls.push(artifact.storagePath);
    }
  }
  for (const url of existingPhotoUrls) {
    if (url && !finalPhotoUrls.includes(url)) {
      finalPhotoUrls.push(url);
    }
  }

  const finalPayload: Record<string, unknown> = {
    ...reportPayload,
    client_submission_id: clientSubmissionId,
    user_id: userId,
    photo_url: finalPhotoUrls[0] ?? null,
    photo_urls: finalPhotoUrls.length > 0 ? finalPhotoUrls : null,
  };

  const { data: insertData, error } = await insertReport(finalPayload);
  let reportId: string | null = insertData?.id ? String(insertData.id) : null;
  let wasDuplicate = false;

  if (error) {
    const isUniqueConflict = String(error.code ?? "").includes("23505");
    if (!isUniqueConflict) {
      throw error;
    }

    const existing = await findExistingReport(clientSubmissionId, userId);
    if (!existing) {
      throw error;
    }
    reportId = existing.id;
    wasDuplicate = true;
  }

  // Delete locally stored draft photo blobs ONLY after full server confirmation.
  await deletePhotos(clientSubmissionId);
  if (photoGroupId !== clientSubmissionId) {
    await deletePhotos(photoGroupId);
  }

  return {
    reportId,
    photoUrls: finalPhotoUrls,
    uploadedArtifacts: resolvedArtifacts,
    wasDuplicate,
  };
}
