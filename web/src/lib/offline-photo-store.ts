import type { PhotoArtifact } from "@/lib/photo-artifact";

export interface StoredPhotoArtifact {
  key: string;
  submissionId: string;
  id: string;
  blob: Blob;
  sha256: string;
  storagePath?: string;
  createdAt: string;
}

export interface OfflineQueueEntryLike {
  id: string;
  client_submission_id: string;
  queued_at: string;
  updated_at: string;
  status: string;
  attempts: number;
  last_error?: string;
  payload: Record<string, unknown>;
}

const DB_NAME = "signa-ci-offline";
const STORE = "photos";
const REPORT_STORE = "reports";
const DB_VERSION = 3;

function openPhotoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(REPORT_STORE)) {
        const reports = db.createObjectStore(REPORT_STORE, { keyPath: "id" });
        reports.createIndex("status", "status", { unique: false });
        reports.createIndex("queued_at", "queued_at", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE)) {
        const photos = db.createObjectStore(STORE, { keyPath: "key" });
        photos.createIndex("submissionId", "submissionId", { unique: false });
      } else if (request.transaction) {
        // Remove EXIF GPS that may have been persisted by DB_VERSION 2.
        const store = request.transaction.objectStore(STORE);
        store.openCursor().onsuccess = (event) => {
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

function toStoredPhotoArtifact(submissionId: string, artifact: PhotoArtifact, createdAt: string): StoredPhotoArtifact {
  return {
    key: `${submissionId}:${artifact.id}`,
    submissionId,
    id: artifact.id,
    blob: artifact.blob,
    sha256: artifact.sha256,
    storagePath: artifact.storagePath,
    createdAt,
  };
}

/**
 * Persist the report queue entry and all photo artifacts in one IndexedDB
 * transaction. This prevents a queued report from becoming visible without
 * its photos (or vice versa) after a crash/reload between two writes.
 */
export async function storeQueueEntryWithPhotoArtifacts(
  entry: OfflineQueueEntryLike,
  artifacts: PhotoArtifact[],
): Promise<void> {
  if (typeof indexedDB === "undefined") throw new Error("IndexedDB indisponible");
  const db = await openPhotoDb();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([REPORT_STORE, STORE], "readwrite");
    tx.objectStore(REPORT_STORE).put(entry);

    const photoStore = tx.objectStore(STORE);
    const createdAt = new Date().toISOString();
    for (const artifact of artifacts) {
      // EXIF GPS is intentionally not persisted in IndexedDB.
      photoStore.put(toStoredPhotoArtifact(entry.client_submission_id, artifact, createdAt));
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Sauvegarde offline impossible"));
    tx.onabort = () => reject(tx.error ?? new Error("Sauvegarde offline interrompue"));
  });
}

export async function storePhotoArtifacts(
  submissionId: string,
  artifacts: PhotoArtifact[],
): Promise<void> {
  if (typeof indexedDB === "undefined" || artifacts.length === 0) return;
  const db = await openPhotoDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const createdAt = new Date().toISOString();
    for (const artifact of artifacts) {
      store.put(toStoredPhotoArtifact(submissionId, artifact, createdAt));
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Stockage des photos impossible"));
    tx.onabort = () => reject(tx.error ?? new Error("Stockage des photos interrompu"));
  });
}

export async function readPhotoArtifacts(submissionId: string): Promise<StoredPhotoArtifact[]> {
  if (typeof indexedDB === "undefined") return [];
  const db = await openPhotoDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).index("submissionId").getAll(submissionId);
    request.onsuccess = () => resolve(request.result as StoredPhotoArtifact[]);
    request.onerror = () => reject(request.error ?? new Error("Lecture des photos impossible"));
  });
}

export async function deletePhotoArtifacts(submissionId: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openPhotoDb();
  const records = await readPhotoArtifacts(submissionId);
  if (records.length === 0) return;

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    for (const record of records) store.delete(record.key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Suppression des photos impossible"));
    tx.onabort = () => reject(tx.error ?? new Error("Suppression des photos interrompue"));
  });
}
