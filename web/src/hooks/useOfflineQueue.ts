/**
 * Offline submission queue for reports.
 * Uses IndexedDB so report metadata and photo blobs survive reloads/reconnects.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import type { PhotoArtifact } from "@/lib/photo-artifact";
import {
  deletePhotoArtifacts,
  readPhotoArtifacts,
  storePhotoArtifacts,
} from "@/lib/offline-photo-store";
import { stagePhotoFingerprint, uploadPhotoArtifact } from "@/lib/photo-sync";

const DB_NAME = "signa-ci-offline";
const DB_VERSION = 2;
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
    req.onsuccess = () => resolve((req.result as QueuedReport[]).sort((a, b) => a.queued_at.localeCompare(b.queued_at)));
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

function isDuplicateSubmission(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && String((error as { code?: unknown }).code).includes("23505"));
}

export function useOfflineQueue() {
  const { isOnline } = useNetworkStatus();
  const [queue, setQueue] = useState<QueuedReport[]>([]);
  const [flushing, setFlushing] = useState(false);

  const refreshQueue = useCallback(async () => {
    try { setQueue(await readQueue()); } catch { setQueue([]); }
  }, []);

  useEffect(() => { void refreshQueue(); }, [refreshQueue]);

  const enqueue = useCallback(async (
    payload: Record<string, unknown>,
    photoArtifacts: PhotoArtifact[] = [],
  ) => {
    const now = new Date().toISOString();
    const client_submission_id = crypto.randomUUID();
    const entry: QueuedReport = {
      id: `offline_${client_submission_id}`,
      client_submission_id,
      queued_at: now,
      updated_at: now,
      status: "pending",
      attempts: 0,
      payload: { ...payload, client_submission_id },
    };

    // The report and its photo blobs are linked by the same idempotency key.
    await putQueueEntry(entry);
    await storePhotoArtifacts(client_submission_id, photoArtifacts);
    await refreshQueue();
    return entry.id;
  }, [refreshQueue]);

  const flush = useCallback(async () => {
    if (flushing) return 0;
    const q = await readQueue();
    if (!q.length) return 0;
    setFlushing(true);
    let sent = 0;

    try {
      for (const item of q) {
        if (item.status === "sent") {
          await deletePhotoArtifacts(item.client_submission_id);
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
          const storedArtifacts = await readPhotoArtifacts(item.client_submission_id);
          const uploadedPaths: string[] = [];

          for (let index = 0; index < storedArtifacts.length; index++) {
            const stored = storedArtifacts[index];
            const artifact: PhotoArtifact = {
              id: stored.id,
              blob: stored.blob,
              sha256: stored.sha256,
              exifGps: stored.exifGps,
              storagePath: stored.storagePath,
            };

            const storagePath = await uploadPhotoArtifact(artifact, String(item.payload.user_id ?? ""), index);
            await stagePhotoFingerprint(storagePath, String(item.payload.user_id ?? ""), artifact.sha256);
            uploadedPaths.push(storagePath);
          }

          const payload: Record<string, unknown> = {
            ...item.payload,
            photo_url: uploadedPaths[0] ?? null,
            photo_urls: uploadedPaths.length > 0 ? uploadedPaths : null,
          };

          const { error } = await supabase.from("reports").insert(payload as any);
          if (error && !isDuplicateSubmission(error)) throw error;

          await putQueueEntry({
            ...uploading,
            status: "sent",
            updated_at: new Date().toISOString(),
            last_error: undefined,
          });
          await deletePhotoArtifacts(item.client_submission_id);
          await deleteQueueEntry(item.id);
          sent++;
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
      setFlushing(false);
      await refreshQueue();
    }

    return sent;
  }, [flushing, refreshQueue]);

  useEffect(() => {
    if (isOnline && queue.length > 0 && !flushing) void flush();
  }, [isOnline, queue.length, flushing, flush]);

  return { queue, enqueue, flush, flushing, refreshQueue };
}
