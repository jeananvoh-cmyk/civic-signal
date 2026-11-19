/**
 * Offline submission queue for reports and compressed photo artifacts.
 * Uses IndexedDB instead of localStorage so report payloads and EXIF-stripped
 * photo blobs survive reloads/reconnects without exposing sensitive data to
 * plain-text web storage or other logged-in accounts.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import type { PhotoArtifact } from "@/lib/photo-artifact";
import {
  deletePhotoArtifacts,
  readPhotoArtifacts,
  storeQueueEntryWithPhotoArtifacts,
} from "@/lib/offline-photo-store";
import { stagePhotoFingerprint, uploadPhotoArtifact } from "@/lib/photo-sync";

const DB_NAME = "signa-ci-offline";
const DB_VERSION = 3;
const STORE = "reports";

type QueueStatus = "pending" | "uploading" | "sent" | "failed";

export interface QueuedReport {
  id: string;
  client_submission_id: string;
  queued_at: string;
  updated_at: string;
  status: QueueStatus;
  attempts: number;
  last_error?: string;
  payload: Record<string, unknown>;
}

function getPayloadString(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value : null;
}

/**
 * Ensures queued reports and their offline photo artifacts can only be viewed
 * or flushed by the authenticated account that created them.
 */
export function canAccessQueuedEntry(
  entry: Pick<QueuedReport, "payload">,
  activeUserId: string | null | undefined,
): boolean {
  if (!activeUserId) return false;
  const ownerId = getPayloadString(entry.payload, "user_id");
  return Boolean(ownerId && ownerId === activeUserId);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("queued_at", "queued_at", { unique: false });
      }
      if (!db.objectStoreNames.contains("photos")) {
        const photos = db.createObjectStore("photos", { keyPath: "key" });
        photos.createIndex("submissionId", "submissionId", { unique: false });
      } else if (request.transaction) {
        // Remove legacy EXIF GPS fields if present in older IndexedDB versions.
        const photos = request.transaction.objectStore("photos");
        photos.openCursor().onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
          if (!cursor) return;
          const value = cursor.value as Record<string, unknown>;
          if ("exifGps" in value) {
            delete value.exifGps;
            cursor.update(value);
          }
          cursor.continue();
        };
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB indisponible"));
  });
}

async function readQueue(): Promise<QueuedReport[]> {
  if (typeof indexedDB === "undefined") return [];
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    req.onsuccess = () =>
      resolve((req.result as QueuedReport[]).sort((a, b) => a.queued_at.localeCompare(b.queued_at)));
    req.onerror = () => reject(req.error ?? new Error("Lecture de la file impossible"));
  });
}

async function putQueueEntry(entry: QueuedReport): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readwrite").objectStore(STORE).put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error("Écriture de la file impossible"));
  });
}

async function deleteQueueEntry(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readwrite").objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error("Suppression de la file impossible"));
  });
}

async function isDuplicateSubmission(clientSubmissionId: string): Promise<boolean> {
  const { data, error: lookupError } = await supabase
    .from("reports")
    .select("id, client_submission_id")
    .eq("client_submission_id", clientSubmissionId)
    .maybeSingle();

  if (lookupError) throw lookupError;
  return Boolean(data?.client_submission_id === clientSubmissionId);
}

/**
 * Pure flush helper exported for direct integration testing of photo upload,
 * fingerprint staging, idempotency, local cleanup, and account isolation.
 */
export async function syncQueuedReportEntry(
  item: QueuedReport,
  activeUserId: string | null | undefined,
  deps: {
    readPhotos?: typeof readPhotoArtifacts;
    deletePhotos?: typeof deletePhotoArtifacts;
    uploadArtifact?: typeof uploadPhotoArtifact;
    stageFingerprint?: typeof stagePhotoFingerprint;
    insertReport?: (payload: Record<string, unknown>) => Promise<{ error: { code?: unknown; message?: string } | null }>;
    checkDuplicate?: (clientSubmissionId: string) => Promise<boolean>;
  } = {},
): Promise<"sent" | "skipped"> {
  if (!canAccessQueuedEntry(item, activeUserId)) {
    return "skipped";
  }

  const readPhotos = deps.readPhotos ?? readPhotoArtifacts;
  const deletePhotos = deps.deletePhotos ?? deletePhotoArtifacts;
  const uploadArtifact = deps.uploadArtifact ?? uploadPhotoArtifact;
  const stageFingerprint = deps.stageFingerprint ?? stagePhotoFingerprint;
  const insertReport =
    deps.insertReport ??
    (async (payload) => {
      const { error } = await supabase.from("reports").insert(payload as never);
      return { error };
    });
  const checkDuplicate = deps.checkDuplicate ?? isDuplicateSubmission;

  const userId = getPayloadString(item.payload, "user_id")!;
  const photoGroupId = getPayloadString(item.payload, "offline_photo_group_id");
  const primaryPhotos = await readPhotos(item.client_submission_id);
  const groupedPhotos =
    photoGroupId && photoGroupId !== item.client_submission_id
      ? await readPhotos(photoGroupId)
      : [];
  const storedArtifacts = [...primaryPhotos, ...groupedPhotos];

  const existingPhotoUrls = Array.isArray(item.payload.photo_urls)
    ? item.payload.photo_urls.filter((u): u is string => typeof u === "string" && u.length > 0)
    : [];
  const uploadedPaths: string[] = [...existingPhotoUrls];

  for (const stored of storedArtifacts) {
    const artifact: PhotoArtifact = {
      id: stored.id,
      blob: stored.blob,
      sha256: stored.sha256,
      exifGps: null,
      storagePath: stored.storagePath,
    };

    const storagePath = await uploadArtifact(artifact, userId);
    await stageFingerprint(storagePath, userId, artifact.sha256);
    if (!uploadedPaths.includes(storagePath)) {
      uploadedPaths.push(storagePath);
    }
  }

  const payload: Record<string, unknown> = {
    ...item.payload,
    photo_url: uploadedPaths[0] ?? (typeof item.payload.photo_url === "string" ? item.payload.photo_url : null),
    photo_urls: uploadedPaths.length > 0 ? uploadedPaths : null,
  };
  delete payload.offline_photo_group_id;

  const { error } = await insertReport(payload);
  if (error) {
    const isUniqueConflict = String(error.code ?? "") === "23505";
    if (!(isUniqueConflict && (await checkDuplicate(item.client_submission_id)))) {
      throw error;
    }
  }

  // Always remove local photo blobs from IndexedDB once transfer is confirmed.
  await deletePhotos(item.client_submission_id);
  if (photoGroupId && photoGroupId !== item.client_submission_id) {
    await deletePhotos(photoGroupId);
  }

  return "sent";
}

export function useOfflineQueue() {
  const { isOnline } = useNetworkStatus();
  const { user } = useAuth();
  const activeUserId = user?.id ?? null;
  const [allEntries, setAllEntries] = useState<QueuedReport[]>([]);
  const [flushing, setFlushing] = useState(false);

  const refreshQueue = useCallback(async () => {
    try {
      setAllEntries(await readQueue());
    } catch {
      setAllEntries([]);
    }
  }, []);

  useEffect(() => {
    void refreshQueue();
  }, [refreshQueue, activeUserId]);

  // Only expose queued items owned by the currently authenticated account.
  const queue = useMemo(
    () => allEntries.filter((item) => canAccessQueuedEntry(item, activeUserId)),
    [allEntries, activeUserId],
  );

  const enqueue = useCallback(
    async (payload: Record<string, unknown>, photoArtifacts: PhotoArtifact[] = []) => {
      const now = new Date().toISOString();
      const client_submission_id =
        getPayloadString(payload, "client_submission_id") ?? crypto.randomUUID();
      const entry: QueuedReport = {
        id: `offline_${client_submission_id}`,
        client_submission_id,
        queued_at: now,
        updated_at: now,
        status: "pending",
        attempts: 0,
        payload: { ...payload, client_submission_id },
      };

      if (photoArtifacts.length > 0) {
        await storeQueueEntryWithPhotoArtifacts(entry, photoArtifacts);
      } else {
        await putQueueEntry(entry);
      }

      await refreshQueue();
      return entry.id;
    },
    [refreshQueue],
  );

  const flush = useCallback(async () => {
    if (flushing || !activeUserId) return 0;
    const allQueued = await readQueue();
    const ownedQueue = allQueued.filter((item) => canAccessQueuedEntry(item, activeUserId));
    if (!ownedQueue.length) return 0;

    setFlushing(true);
    let sent = 0;
    try {
      for (const item of ownedQueue) {
        const photoGroupId = getPayloadString(item.payload, "offline_photo_group_id");
        if (item.status === "sent") {
          await deletePhotoArtifacts(item.client_submission_id);
          if (photoGroupId && photoGroupId !== item.client_submission_id) {
            await deletePhotoArtifacts(photoGroupId);
          }
          await deleteQueueEntry(item.id);
          sent++;
          continue;
        }

        const uploading: QueuedReport = {
          ...item,
          status: "uploading",
          attempts: item.attempts + 1,
          updated_at: new Date().toISOString(),
        };
        await putQueueEntry(uploading);

        try {
          const outcome = await syncQueuedReportEntry(uploading, activeUserId);
          if (outcome === "skipped") {
            await putQueueEntry(item);
            continue;
          }

          await putQueueEntry({
            ...uploading,
            status: "sent",
            updated_at: new Date().toISOString(),
            last_error: undefined,
          });
          await deleteQueueEntry(uploading.id);
          sent++;
          // Pause anti-saturation pour connexions mobiles instables
          await new Promise((r) => setTimeout(r, 400));
        } catch (error) {
          await putQueueEntry({
            ...uploading,
            status: "failed",
            updated_at: new Date().toISOString(),
            last_error: error instanceof Error ? error.message : "Échec d'envoi",
          });
        }
      }
    } finally {
      // Refresh the persisted states before allowing the auto-flush effect to run again.
      await refreshQueue();
      setFlushing(false);
    }

    return sent;
  }, [flushing, activeUserId, refreshQueue]);

  const hasPendingEntries = queue.some((item) => item.status === "pending");

  useEffect(() => {
    // Failed entries remain available for an explicit/manual retry, but must not
    // trigger an automatic retry loop while the device is online.
    if (isOnline && activeUserId && hasPendingEntries && !flushing) {
      void flush();
    }
  }, [isOnline, activeUserId, hasPendingEntries, flushing, flush]);

  return { queue, enqueue, flush, flushing, refreshQueue };
}
