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

/**
 * Lease duration after which an `uploading` entry owned by another instance
 * is treated as abandoned when browser Web Locks are unavailable.
 */
export const UPLOAD_STALE_TIMEOUT_MS = 2 * 60 * 1000;

const RUNTIME_SYNC_OWNER_ID =
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `tab_${Date.now()}_${Math.random().toString(36).slice(2)}`;

const inFlightSubmissionIds = new Set<string>();

type QueueStatus = "pending" | "uploading" | "sent" | "failed";

export interface QueuedReport {
  id: string;
  client_submission_id: string;
  queued_at: string;
  updated_at: string;
  status: QueueStatus;
  attempts: number;
  last_error?: string;
  upload_started_at?: string;
  sync_owner_id?: string;
  recovered_at?: string;
  payload: Record<string, unknown>;
}

export interface SubmissionLockManager {
  request: <T>(
    name: string,
    options: { ifAvailable: boolean },
    callback: (lock: unknown | null) => Promise<T>,
  ) => Promise<T>;
}

export function getRuntimeSyncOwnerId(): string {
  return RUNTIME_SYNC_OWNER_ID;
}

export function getSubmissionLockName(clientSubmissionId: string): string {
  return `signa-offline-sync:${clientSubmissionId}`;
}

function getWebLocksManager(customLocks?: SubmissionLockManager | null): SubmissionLockManager | null {
  if (customLocks !== undefined) return customLocks;
  if (typeof navigator !== "undefined" && navigator.locks && typeof navigator.locks.request === "function") {
    return navigator.locks as unknown as SubmissionLockManager;
  }
  return null;
}

/**
 * Checks whether another live instance or this tab currently holds the sync
 * lock for `clientSubmissionId`.
 */
export async function probeSubmissionLockState(
  clientSubmissionId: string,
  customLocks?: SubmissionLockManager | null,
): Promise<"held" | "free" | "unsupported"> {
  if (inFlightSubmissionIds.has(clientSubmissionId)) {
    return "held";
  }

  const locks = getWebLocksManager(customLocks);
  if (!locks) {
    return "unsupported";
  }

  try {
    return await locks.request(
      getSubmissionLockName(clientSubmissionId),
      { ifAvailable: true },
      async (lock) => (lock ? "free" : "held"),
    );
  } catch {
    return "unsupported";
  }
}

/**
 * Acquires an exclusive non-blocking lock per `clientSubmissionId` across both
 * same-tab hook instances and separate browser tabs when Web Locks are available.
 */
export async function withSubmissionLock<T>(
  clientSubmissionId: string,
  fn: () => Promise<T>,
  customLocks?: SubmissionLockManager | null,
): Promise<{ acquired: true; value: T } | { acquired: false }> {
  if (inFlightSubmissionIds.has(clientSubmissionId)) {
    return { acquired: false };
  }

  inFlightSubmissionIds.add(clientSubmissionId);
  try {
    const locks = getWebLocksManager(customLocks);
    if (!locks) {
      const value = await fn();
      return { acquired: true, value };
    }

    return await locks.request(
      getSubmissionLockName(clientSubmissionId),
      { ifAvailable: true },
      async (lock) => {
        if (!lock) {
          return { acquired: false as const };
        }
        const value = await fn();
        return { acquired: true as const, value };
      },
    );
  } finally {
    inFlightSubmissionIds.delete(clientSubmissionId);
  }
}

/**
 * Determines whether an entry stuck in `uploading` was abandoned after a crash
 * or abrupt interruption rather than being actively synced by another instance.
 */
export function isAbandonedUploadingEntry(
  entry: QueuedReport,
  options: {
    nowMs?: number;
    staleTimeoutMs?: number;
    currentOwnerId?: string;
    lockState?: "held" | "free" | "unsupported";
  } = {},
): boolean {
  if (entry.status !== "uploading") return false;

  const lockState =
    options.lockState ?? (inFlightSubmissionIds.has(entry.client_submission_id) ? "held" : "unsupported");

  if (lockState === "held") {
    return false;
  }

  // Browser Web Locks are released immediately when a tab/process exits.
  // Confirming the lock is free guarantees no live tab is syncing this entry.
  if (lockState === "free") {
    return true;
  }

  const currentOwnerId = options.currentOwnerId ?? RUNTIME_SYNC_OWNER_ID;
  if (entry.sync_owner_id && entry.sync_owner_id === currentOwnerId) {
    return true;
  }

  const nowMs = options.nowMs ?? Date.now();
  const staleTimeoutMs = options.staleTimeoutMs ?? UPLOAD_STALE_TIMEOUT_MS;
  const leaseTimestamp = entry.upload_started_at ?? entry.updated_at;
  const startedMs = Date.parse(leaseTimestamp);
  if (!Number.isFinite(startedMs)) {
    return true;
  }

  return nowMs - startedMs >= staleTimeoutMs;
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
 * Resets abandoned `uploading` entries owned by `activeUserId` back to `pending`
 * so interrupted syncs recover safely on app restart and network reconnection.
 * Entries actively locked by another live tab or owned by another account are
 * left untouched, and local photo blobs remain preserved in IndexedDB.
 */
export async function recoverInterruptedUploads(
  activeUserId: string | null | undefined,
  deps: {
    readAll?: () => Promise<QueuedReport[]>;
    putEntry?: (entry: QueuedReport) => Promise<void>;
    nowMs?: number;
    staleTimeoutMs?: number;
    currentOwnerId?: string;
    locks?: SubmissionLockManager | null;
  } = {},
): Promise<QueuedReport[]> {
  if (!activeUserId) return [];

  const readAll = deps.readAll ?? readQueue;
  const putEntry = deps.putEntry ?? putQueueEntry;
  const nowMs = deps.nowMs ?? Date.now();
  const nowIso = new Date(nowMs).toISOString();

  const entries = await readAll();
  const recovered: QueuedReport[] = [];

  for (const entry of entries) {
    if (!canAccessQueuedEntry(entry, activeUserId)) continue;
    if (entry.status !== "uploading") continue;

    const lockState = await probeSubmissionLockState(entry.client_submission_id, deps.locks);
    const abandoned = isAbandonedUploadingEntry(entry, {
      nowMs,
      staleTimeoutMs: deps.staleTimeoutMs,
      currentOwnerId: deps.currentOwnerId,
      lockState,
    });

    if (!abandoned) continue;

    const resetEntry: QueuedReport = {
      ...entry,
      status: "pending",
      updated_at: nowIso,
      recovered_at: nowIso,
      upload_started_at: undefined,
      sync_owner_id: undefined,
    };

    await putEntry(resetEntry);
    recovered.push(resetEntry);
  }

  return recovered;
}

/**
 * Pure flush helper exported for direct integration testing of photo upload,
 * fingerprint staging, idempotency, concurrency guards, local cleanup, and
 * account isolation.
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
    locks?: SubmissionLockManager | null;
    skipLock?: boolean;
  } = {},
): Promise<"sent" | "skipped"> {
  if (!canAccessQueuedEntry(item, activeUserId)) {
    return "skipped";
  }

  const execute = async (): Promise<"sent" | "skipped"> => {
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

    // On recovered or retried entries, verify whether the report was already
    // persisted before re-uploading or attempting a second insert.
    const shouldPrecheckDuplicate = Boolean(item.recovered_at) || item.attempts > 1;
    if (shouldPrecheckDuplicate && (await checkDuplicate(item.client_submission_id))) {
      await deletePhotos(item.client_submission_id);
      if (photoGroupId && photoGroupId !== item.client_submission_id) {
        await deletePhotos(photoGroupId);
      }
      return "sent";
    }

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
      const isUniqueConflict = String(error.code ?? "").includes("23505");
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
  };

  if (deps.skipLock) {
    return execute();
  }

  const locked = await withSubmissionLock(item.client_submission_id, execute, deps.locks);
  return locked.acquired ? locked.value : "skipped";
}

/**
 * Recovers abandoned uploads and flushes owned queue entries sequentially while
 * holding per-submission exclusive locks to prevent concurrent duplicate syncs.
 */
export async function flushOfflineQueue(
  activeUserId: string | null | undefined,
  deps: {
    readAll?: () => Promise<QueuedReport[]>;
    putEntry?: (entry: QueuedReport) => Promise<void>;
    deleteEntry?: (id: string) => Promise<void>;
    readPhotos?: typeof readPhotoArtifacts;
    deletePhotos?: typeof deletePhotoArtifacts;
    uploadArtifact?: typeof uploadPhotoArtifact;
    stageFingerprint?: typeof stagePhotoFingerprint;
    insertReport?: (payload: Record<string, unknown>) => Promise<{ error: { code?: unknown; message?: string } | null }>;
    checkDuplicate?: (clientSubmissionId: string) => Promise<boolean>;
    locks?: SubmissionLockManager | null;
    nowMs?: () => number;
    staleTimeoutMs?: number;
    currentOwnerId?: string;
    interItemDelayMs?: number;
  } = {},
): Promise<number> {
  if (!activeUserId) return 0;

  const readAll = deps.readAll ?? readQueue;
  const putEntry = deps.putEntry ?? putQueueEntry;
  const deleteEntry = deps.deleteEntry ?? deleteQueueEntry;
  const deletePhotos = deps.deletePhotos ?? deletePhotoArtifacts;
  const nowMs = deps.nowMs ?? (() => Date.now());
  const currentOwnerId = deps.currentOwnerId ?? RUNTIME_SYNC_OWNER_ID;
  const interItemDelayMs = deps.interItemDelayMs ?? 400;

  await recoverInterruptedUploads(activeUserId, {
    readAll,
    putEntry,
    nowMs: nowMs(),
    staleTimeoutMs: deps.staleTimeoutMs,
    currentOwnerId,
    locks: deps.locks,
  });

  const allQueued = await readAll();
  const ownedQueue = allQueued.filter((item) => canAccessQueuedEntry(item, activeUserId));
  if (!ownedQueue.length) return 0;

  let sent = 0;

  for (const candidate of ownedQueue) {
    // Entries still in `uploading` after recovery are actively synced elsewhere.
    if (candidate.status === "uploading") continue;

    const lockResult = await withSubmissionLock(
      candidate.client_submission_id,
      async () => {
        // Re-read the latest persisted record inside the lock so a second caller
        // never re-syncs an entry already completed or claimed by another instance.
        const latestEntries = await readAll();
        const item = latestEntries.find((entry) => entry.id === candidate.id);
        if (!item || !canAccessQueuedEntry(item, activeUserId)) return false;
        if (item.status === "uploading") return false;

        const photoGroupId = getPayloadString(item.payload, "offline_photo_group_id");
        if (item.status === "sent") {
          await deletePhotos(item.client_submission_id);
          if (photoGroupId && photoGroupId !== item.client_submission_id) {
            await deletePhotos(photoGroupId);
          }
          await deleteEntry(item.id);
          return true;
        }

        const startedAt = new Date(nowMs()).toISOString();
        const uploading: QueuedReport = {
          ...item,
          status: "uploading",
          attempts: item.attempts + 1,
          updated_at: startedAt,
          upload_started_at: startedAt,
          sync_owner_id: currentOwnerId,
        };
        await putEntry(uploading);

        try {
          const outcome = await syncQueuedReportEntry(uploading, activeUserId, {
            readPhotos: deps.readPhotos,
            deletePhotos,
            uploadArtifact: deps.uploadArtifact,
            stageFingerprint: deps.stageFingerprint,
            insertReport: deps.insertReport,
            checkDuplicate: deps.checkDuplicate,
            locks: deps.locks,
            skipLock: true,
          });
          if (outcome === "skipped") {
            await putEntry(item);
            return false;
          }

          await putEntry({
            ...uploading,
            status: "sent",
            updated_at: new Date(nowMs()).toISOString(),
            upload_started_at: undefined,
            sync_owner_id: undefined,
            recovered_at: undefined,
            last_error: undefined,
          });
          await deleteEntry(uploading.id);
          return true;
        } catch (error) {
          await putEntry({
            ...uploading,
            status: "failed",
            updated_at: new Date(nowMs()).toISOString(),
            upload_started_at: undefined,
            sync_owner_id: undefined,
            last_error: error instanceof Error ? error.message : "Échec d'envoi",
          });
          return false;
        }
      },
      deps.locks,
    );

    if (lockResult.acquired && lockResult.value) {
      sent++;
      if (interItemDelayMs > 0) {
        // Pause anti-saturation pour connexions mobiles instables
        await new Promise((r) => setTimeout(r, interItemDelayMs));
      }
    }
  }

  return sent;
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

  // Recover abandoned `uploading` entries belonging to the active user on
  // startup / account switch and whenever connectivity returns.
  useEffect(() => {
    let cancelled = false;
    const syncQueueState = async () => {
      try {
        if (activeUserId) {
          await recoverInterruptedUploads(activeUserId);
        }
        const entries = await readQueue();
        if (!cancelled) {
          setAllEntries(entries);
        }
      } catch {
        if (!cancelled) {
          setAllEntries([]);
        }
      }
    };
    void syncQueueState();
    return () => {
      cancelled = true;
    };
  }, [activeUserId, isOnline]);

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

    setFlushing(true);
    try {
      return await flushOfflineQueue(activeUserId);
    } finally {
      // Refresh the persisted states before allowing the auto-flush effect to run again.
      await refreshQueue();
      setFlushing(false);
    }
  }, [flushing, activeUserId, refreshQueue]);

  const hasSyncableEntries = queue.some((item) => item.status === "pending" || item.status === "sent");

  useEffect(() => {
    // Failed entries remain available for an explicit/manual retry, but must not
    // trigger an automatic retry loop while the device is online.
    if (isOnline && activeUserId && hasSyncableEntries && !flushing) {
      void flush();
    }
  }, [isOnline, activeUserId, hasSyncableEntries, flushing, flush]);

  return { queue, enqueue, flush, flushing, refreshQueue };
}
