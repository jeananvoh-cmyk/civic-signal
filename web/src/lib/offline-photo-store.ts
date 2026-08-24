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

const DB_NAME = "signa-ci-offline";
const STORE = "photos";
const DB_VERSION = 2;

function openPhotoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("reports")) {
        const reports = db.createObjectStore("reports", { keyPath: "id" });
        reports.createIndex("status", "status", { unique: false });
        reports.createIndex("queued_at", "queued_at", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE)) {
        const photos = db.createObjectStore(STORE, { keyPath: "key" });
        photos.createIndex("submissionId", "submissionId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB indisponible"));
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
      // EXIF GPS is intentionally not persisted in IndexedDB. The photo blob,
      // hash and deterministic Storage path are sufficient for offline retry.
      const record: StoredPhotoArtifact = {
        key: `${submissionId}:${artifact.id}`,
        submissionId,
        id: artifact.id,
        blob: artifact.blob,
        sha256: artifact.sha256,
        storagePath: artifact.storagePath,
        createdAt,
      };
      store.put(record);
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