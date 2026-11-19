import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

// ── Hoisted mocks for hook-level end-to-end tests ────────────────────────────
const mockAuthState = vi.hoisted(() => ({ user: { id: "user-a" } as { id: string } | null }));
const mockNetworkState = vi.hoisted(() => ({ isOnline: true }));
const mockStorageUpload = vi.hoisted(() => vi.fn(async () => ({ error: null })));
const mockFingerprintInsert = vi.hoisted(() => vi.fn(async () => ({ error: null })));
const mockReportsInsert = vi.hoisted(() => vi.fn(async () => ({ error: null })));
const mockReportsSelectMaybeSingle = vi.hoisted(() =>
  vi.fn(async () => ({ data: null as { id: string; client_submission_id: string } | null, error: null })),
);

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuthState,
}));

vi.mock("@/hooks/useNetworkStatus", () => ({
  useNetworkStatus: () => mockNetworkState,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: mockStorageUpload,
      }),
    },
    from: (table: string) => {
      if (table === "photo_fingerprint_pending") {
        return {
          insert: mockFingerprintInsert,
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        };
      }
      if (table === "reports") {
        return {
          insert: (payload: Record<string, unknown>) => {
            const promise = mockReportsInsert(payload);
            return Object.assign(promise, {
              select: () => ({
                single: async () => {
                  const res = await promise;
                  return { data: res.error ? null : { id: "rep-hook-1" }, error: res.error };
                },
              }),
            });
          },
          select: () => ({
            eq: () => ({
              maybeSingle: mockReportsSelectMaybeSingle,
              eq: () => ({
                maybeSingle: mockReportsSelectMaybeSingle,
              }),
            }),
          }),
        };
      }
      return {
        insert: async () => ({ error: null }),
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      };
    },
  },
}));

import {
  UPLOAD_STALE_TIMEOUT_MS,
  flushOfflineQueue,
  isAbandonedUploadingEntry,
  recoverInterruptedUploads,
  syncQueuedReportEntry,
  useOfflineQueue,
  type QueuedReport,
  type SubmissionLockManager,
} from "@/hooks/useOfflineQueue";
import { createPhotoArtifact, type PhotoArtifact } from "@/lib/photo-artifact";
import { getPhotoStoragePath } from "@/lib/photo-storage";
import {
  deletePhotoArtifacts,
  readPhotoArtifacts,
  replacePhotoArtifacts,
  storePhotoArtifacts,
  storeQueueEntryWithPhotoArtifacts,
  type StoredPhotoArtifact,
} from "@/lib/offline-photo-store";
import { submitReportOnlineWithArtifacts } from "@/lib/photo-sync";

// ── Minimal in-memory IndexedDB fake (zero external dependencies) ────────────
function createFakeIndexedDb() {
  const stores = new Map<string, { keyPath: string; rows: Map<string, Record<string, unknown>> }>();
  let currentVersion = 0;

  function makeRequest<T>(executor: () => T) {
    const req: {
      result: T | undefined;
      error: Error | null;
      onsuccess: ((ev: Event) => void) | null;
      onerror: ((ev: Event) => void) | null;
    } = {
      result: undefined,
      error: null,
      onsuccess: null,
      onerror: null,
    };
    queueMicrotask(() => {
      try {
        req.result = executor();
        req.onsuccess?.({ target: req } as unknown as Event);
      } catch (err) {
        req.error = err instanceof Error ? err : new Error(String(err));
        req.onerror?.({ target: req } as unknown as Event);
      }
    });
    return req;
  }

  function makeObjectStore(name: string) {
    const ensureStore = () => {
      const store = stores.get(name);
      if (!store) throw new Error(`Missing store: ${name}`);
      return store;
    };

    return {
      createIndex: () => ({}),
      put: (value: Record<string, unknown>) =>
        makeRequest(() => {
          const store = ensureStore();
          const key = String(value[store.keyPath]);
          store.rows.set(key, { ...value });
          return key;
        }),
      delete: (key: string) =>
        makeRequest(() => {
          ensureStore().rows.delete(String(key));
          return undefined;
        }),
      getAll: () =>
        makeRequest(() => Array.from(ensureStore().rows.values()).map((r) => ({ ...r }))),
      index: (indexName: string) => ({
        getAll: (query: string) =>
          makeRequest(() =>
            Array.from(ensureStore().rows.values())
              .filter((r) => r[indexName] === query)
              .map((r) => ({ ...r })),
          ),
      }),
      openCursor: () => {
        const req: {
          result: unknown;
          onsuccess: ((ev: Event) => void) | null;
        } = { result: null, onsuccess: null };
        queueMicrotask(() => {
          const store = ensureStore();
          const entries = Array.from(store.rows.entries());
          let idx = 0;
          const step = () => {
            if (idx >= entries.length) {
              req.result = null;
              req.onsuccess?.({ target: req } as unknown as Event);
              return;
            }
            const [key, value] = entries[idx];
            req.result = {
              value,
              update: (updated: Record<string, unknown>) => {
                store.rows.set(key, { ...updated });
              },
              continue: () => {
                idx++;
                step();
              },
            };
            req.onsuccess?.({ target: req } as unknown as Event);
          };
          step();
        });
        return req;
      },
    };
  }

  const db = {
    objectStoreNames: {
      contains: (name: string) => stores.has(name),
    },
    createObjectStore: (name: string, options: { keyPath: string }) => {
      stores.set(name, { keyPath: options.keyPath, rows: new Map() });
      return makeObjectStore(name);
    },
    transaction: (_storeNames: string | string[]) => {
      const tx: {
        objectStore: (name: string) => ReturnType<typeof makeObjectStore>;
        oncomplete: (() => void) | null;
        onerror: (() => void) | null;
        onabort: (() => void) | null;
        error: Error | null;
      } = {
        objectStore: (name: string) => makeObjectStore(name),
        oncomplete: null,
        onerror: null,
        onabort: null,
        error: null,
      };
      setTimeout(() => {
        tx.oncomplete?.();
      }, 0);
      return tx;
    },
  };

  const factory = {
    open: (_name: string, version = 1) => {
      const req: {
        result: typeof db;
        transaction: ReturnType<typeof db.transaction> | null;
        error: Error | null;
        onupgradeneeded: (() => void) | null;
        onsuccess: (() => void) | null;
        onerror: (() => void) | null;
      } = {
        result: db,
        transaction: null,
        error: null,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
      };
      queueMicrotask(() => {
        if (version > currentVersion) {
          currentVersion = version;
          req.transaction = db.transaction(Array.from(stores.keys()));
          req.onupgradeneeded?.();
        }
        req.onsuccess?.();
      });
      return req;
    },
  };

  return {
    factory,
    getRows: (storeName: string) => Array.from(stores.get(storeName)?.rows.values() ?? []),
    seedRow: (storeName: string, row: Record<string, unknown>) => {
      if (!stores.has(storeName)) {
        stores.set(storeName, {
          keyPath: storeName === "photos" ? "key" : "id",
          rows: new Map(),
        });
      }
      const store = stores.get(storeName)!;
      store.rows.set(String(row[store.keyPath]), { ...row });
    },
  };
}

// ── Helpers for pure behavioral tests ────────────────────────────────────────
function createMemoryQueueStore(initial: QueuedReport[] = []) {
  const map = new Map<string, QueuedReport>(initial.map((entry) => [entry.id, { ...entry }]));
  return {
    map,
    readAll: async () =>
      Array.from(map.values())
        .map((e) => ({ ...e }))
        .sort((a, b) => a.queued_at.localeCompare(b.queued_at)),
    putEntry: async (entry: QueuedReport) => {
      map.set(entry.id, { ...entry });
    },
    deleteEntry: async (id: string) => {
      map.delete(id);
    },
  };
}

function createMemoryPhotoStore(initial: Array<[string, StoredPhotoArtifact[]]> = []) {
  const map = new Map<string, StoredPhotoArtifact[]>(initial.map(([k, v]) => [k, v.map((item) => ({ ...item }))]));
  return {
    map,
    readPhotos: async (submissionId: string) => (map.get(submissionId) ?? []).map((item) => ({ ...item })),
    storePhotos: async (submissionId: string, artifacts: PhotoArtifact[]) => {
      const existing = map.get(submissionId) ?? [];
      const byKey = new Map(existing.map((item) => [item.key, item]));
      for (const art of artifacts) {
        const key = `${submissionId}:${art.id}`;
        byKey.set(key, {
          key,
          submissionId,
          id: art.id,
          blob: art.blob,
          sha256: art.sha256,
          storagePath: art.storagePath,
          createdAt: "2026-11-19T00:00:00.000Z",
        });
      }
      map.set(submissionId, Array.from(byKey.values()));
    },
    deletePhotos: async (submissionId: string) => {
      map.delete(submissionId);
    },
  };
}

function createFakeLocksManager(initiallyHeld: string[] = []): SubmissionLockManager & { held: Set<string> } {
  const held = new Set<string>(initiallyHeld);
  return {
    held,
    async request<T>(
      name: string,
      options: { ifAvailable: boolean },
      callback: (lock: unknown | null) => Promise<T>,
    ): Promise<T> {
      if (options.ifAvailable && held.has(name)) {
        return callback(null);
      }
      held.add(name);
      try {
        return await callback({ name });
      } finally {
        held.delete(name);
      }
    },
  };
}

function buildEntry(overrides: Partial<QueuedReport> = {}): QueuedReport {
  const clientSubmissionId = overrides.client_submission_id ?? "sub-rec-1";
  const userId =
    typeof overrides.payload?.user_id === "string" ? overrides.payload.user_id : "user-a";
  return {
    id: overrides.id ?? `offline_${clientSubmissionId}`,
    client_submission_id: clientSubmissionId,
    queued_at: "2026-11-19T01:00:00.000Z",
    updated_at: "2026-11-19T01:00:00.000Z",
    status: "pending",
    attempts: 0,
    payload: {
      client_submission_id: clientSubmissionId,
      user_id: userId,
      service_type: "road",
      report_category: "infrastructure",
      commune: "Cocody",
      quartier: "Angré",
      description: "Affaissement de chaussée bloquant la voie",
      ...(overrides.payload ?? {}),
    },
    ...overrides,
  };
}

async function makeArtifact(seed: string, overrides: Partial<PhotoArtifact> = {}): Promise<PhotoArtifact> {
  const blob = new Blob([seed], { type: "image/jpeg" });
  const artifact = await createPhotoArtifact(blob, { lat: 5.35, lng: -4.01 });
  return { ...artifact, ...overrides };
}

function toStored(submissionId: string, artifact: PhotoArtifact): StoredPhotoArtifact {
  return {
    key: `${submissionId}:${artifact.id}`,
    submissionId,
    id: artifact.id,
    blob: artifact.blob,
    sha256: artifact.sha256,
    storagePath: artifact.storagePath,
    createdAt: "2026-11-19T01:00:00.000Z",
  };
}

// ============================================================================
// SECTION A — Récupération d'une synchronisation interrompue (`uploading`)
// ============================================================================
describe("Section A — Interruption recovery for stuck uploading entries", () => {
  it("A1) recovers an abandoned uploading entry on restart and completes sync once", async () => {
    const art = await makeArtifact("abandoned-photo-bytes");
    const stuckAt = Date.parse("2026-11-19T01:00:00.000Z");
    const restartAt = stuckAt + UPLOAD_STALE_TIMEOUT_MS + 5_000;

    const queueStore = createMemoryQueueStore([
      buildEntry({
        client_submission_id: "sub-crash-1",
        status: "uploading",
        attempts: 1,
        upload_started_at: new Date(stuckAt).toISOString(),
        sync_owner_id: "crashed-tab-id",
      }),
    ]);
    const photoStore = createMemoryPhotoStore([["sub-crash-1", [toStored("sub-crash-1", art)]]]);

    const uploadedPaths: string[] = [];
    const stagedFingerprints: Array<{ path: string; userId: string; hash: string }> = [];
    const insertedPayloads: Record<string, unknown>[] = [];

    const recovered = await recoverInterruptedUploads("user-a", {
      readAll: queueStore.readAll,
      putEntry: queueStore.putEntry,
      nowMs: restartAt,
      currentOwnerId: "restarted-tab-id",
      locks: null,
    });

    expect(recovered).toHaveLength(1);
    expect(recovered[0].status).toBe("pending");
    expect(recovered[0].client_submission_id).toBe("sub-crash-1");
    expect(recovered[0].attempts).toBe(1);
    expect(recovered[0].recovered_at).toBeTruthy();
    // Photos must remain intact until confirmed sync
    expect(photoStore.map.get("sub-crash-1")).toHaveLength(1);

    const sent = await flushOfflineQueue("user-a", {
      ...queueStore,
      readPhotos: photoStore.readPhotos,
      deletePhotos: photoStore.deletePhotos,
      uploadArtifact: async (artifact, userId) => {
        const p = getPhotoStoragePath(userId, artifact.id, artifact.blob);
        uploadedPaths.push(p);
        return p;
      },
      stageFingerprint: async (path, userId, hash) => {
        stagedFingerprints.push({ path, userId, hash });
      },
      insertReport: async (payload) => {
        insertedPayloads.push(payload);
        return { error: null };
      },
      checkDuplicate: async () => false,
      locks: null,
      nowMs: () => restartAt,
      currentOwnerId: "restarted-tab-id",
      interItemDelayMs: 0,
    });

    expect(sent).toBe(1);
    expect(uploadedPaths).toEqual([`user-a/${art.id}.jpg`]);
    expect(stagedFingerprints).toEqual([
      { path: `user-a/${art.id}.jpg`, userId: "user-a", hash: art.sha256 },
    ]);
    expect(insertedPayloads).toHaveLength(1);
    expect(insertedPayloads[0]).toMatchObject({
      client_submission_id: "sub-crash-1",
      photo_url: `user-a/${art.id}.jpg`,
      photo_urls: [`user-a/${art.id}.jpg`],
    });
    expect(queueStore.map.size).toBe(0);
    expect(photoStore.map.get("sub-crash-1")).toBeUndefined();
  });

  it("A1b) does NOT steal an active uploading entry owned by another live instance (Web Lock held OR fresh lease)", async () => {
    const nowMs = Date.parse("2026-11-19T01:00:30.000Z");
    const activeEntry = buildEntry({
      client_submission_id: "sub-live-tab",
      status: "uploading",
      attempts: 1,
      upload_started_at: "2026-11-19T01:00:10.000Z", // only 20s old
      sync_owner_id: "other-live-tab",
    });

    // Case 1: Browser Web Locks reports lock is currently held by another tab
    const heldLocks = createFakeLocksManager(["signa-offline-sync:sub-live-tab"]);
    const queueStoreWithLocks = createMemoryQueueStore([activeEntry]);
    const recWithHeldLock = await recoverInterruptedUploads("user-a", {
      readAll: queueStoreWithLocks.readAll,
      putEntry: queueStoreWithLocks.putEntry,
      nowMs,
      currentOwnerId: "second-tab",
      locks: heldLocks,
    });
    expect(recWithHeldLock).toHaveLength(0);
    expect(queueStoreWithLocks.map.get(activeEntry.id)?.status).toBe("uploading");

    // Case 2: No Web Locks available, lease is still fresh (< UPLOAD_STALE_TIMEOUT_MS)
    const queueStoreNoLocks = createMemoryQueueStore([activeEntry]);
    const recFreshLease = await recoverInterruptedUploads("user-a", {
      readAll: queueStoreNoLocks.readAll,
      putEntry: queueStoreNoLocks.putEntry,
      nowMs,
      currentOwnerId: "second-tab",
      locks: null,
    });
    expect(recFreshLease).toHaveLength(0);
    expect(queueStoreNoLocks.map.get(activeEntry.id)?.status).toBe("uploading");

    // flushOfflineQueue must also skip the active entry and never call insertReport
    const insertReport = vi.fn(async () => ({ error: null }));
    const sent = await flushOfflineQueue("user-a", {
      ...queueStoreNoLocks,
      insertReport,
      locks: null,
      nowMs: () => nowMs,
      currentOwnerId: "second-tab",
      interItemDelayMs: 0,
    });
    expect(sent).toBe(0);
    expect(insertReport).not.toHaveBeenCalled();

    // Case 3: Once the live tab crashes, Web Lock is immediately released -> instant recovery
    heldLocks.held.delete("signa-offline-sync:sub-live-tab");
    const recAfterCrash = await recoverInterruptedUploads("user-a", {
      readAll: queueStoreWithLocks.readAll,
      putEntry: queueStoreWithLocks.putEntry,
      nowMs, // still only 20s later, but Web Lock proved no live tab holds it
      currentOwnerId: "second-tab",
      locks: heldLocks,
    });
    expect(recAfterCrash).toHaveLength(1);
    expect(recAfterCrash[0].status).toBe("pending");
  });

  it("A2) never sends an already-persisted report twice when recovering from uploading", async () => {
    const art = await makeArtifact("already-sent-photo");
    const queueStore = createMemoryQueueStore([
      buildEntry({
        client_submission_id: "sub-already-saved",
        status: "uploading",
        attempts: 1,
        upload_started_at: "2026-11-19T00:00:00.000Z",
        sync_owner_id: "crashed-tab",
      }),
    ]);
    const photoStore = createMemoryPhotoStore([["sub-already-saved", [toStored("sub-already-saved", art)]]]);

    const uploadArtifact = vi.fn(async () => "should-not-reupload");
    const stageFingerprint = vi.fn(async () => {});
    const insertReport = vi.fn(async () => ({ error: null }));
    const checkDuplicate = vi.fn(async (id: string) => id === "sub-already-saved");

    const sent = await flushOfflineQueue("user-a", {
      ...queueStore,
      readPhotos: photoStore.readPhotos,
      deletePhotos: photoStore.deletePhotos,
      uploadArtifact,
      stageFingerprint,
      insertReport,
      checkDuplicate,
      locks: null,
      nowMs: () => Date.parse("2026-11-19T01:00:00.000Z"),
      interItemDelayMs: 0,
    });

    expect(sent).toBe(1);
    expect(checkDuplicate).toHaveBeenCalledWith("sub-already-saved");
    expect(uploadArtifact).not.toHaveBeenCalled();
    expect(stageFingerprint).not.toHaveBeenCalled();
    expect(insertReport).not.toHaveBeenCalled();
    // Local photo blobs & queue entry are cleaned up once existence is confirmed
    expect(photoStore.map.get("sub-already-saved")).toBeUndefined();
    expect(queueStore.map.size).toBe(0);
  });

  it("A3) preserves local photo blobs when interrupted mid-photo-upload", async () => {
    const art1 = await makeArtifact("photo-one");
    const art2 = await makeArtifact("photo-two");
    const queueStore = createMemoryQueueStore([
      buildEntry({ client_submission_id: "sub-mid-photo", status: "pending", attempts: 0 }),
    ]);
    const photoStore = createMemoryPhotoStore([
      ["sub-mid-photo", [toStored("sub-mid-photo", art1), toStored("sub-mid-photo", art2)]],
    ]);

    let uploadCall = 0;
    const insertReport = vi.fn(async () => ({ error: null }));

    const sent = await flushOfflineQueue("user-a", {
      ...queueStore,
      readPhotos: photoStore.readPhotos,
      deletePhotos: photoStore.deletePhotos,
      uploadArtifact: async (artifact, userId) => {
        uploadCall++;
        if (uploadCall === 2) {
          throw new Error("Connection reset during photo #2 upload");
        }
        return getPhotoStoragePath(userId, artifact.id, artifact.blob);
      },
      stageFingerprint: async () => {},
      insertReport,
      locks: null,
      interItemDelayMs: 0,
    });

    expect(sent).toBe(0);
    expect(insertReport).not.toHaveBeenCalled();
    expect(queueStore.map.get("offline_sub-mid-photo")?.status).toBe("failed");
    // Both local blobs MUST remain intact in IndexedDB for retry
    expect(photoStore.map.get("sub-mid-photo")).toHaveLength(2);
  });

  it("A4) recovers cleanly after photo upload succeeded but crash occurred before report insert (no duplicates)", async () => {
    const art = await makeArtifact("uploaded-before-crash");
    const expectedPath = `user-a/${art.id}.jpg`;

    // Simulate Storage + pending fingerprint table already holding the photo from before crash
    const storageObjects = new Map<string, Blob>([[expectedPath, art.blob]]);
    const stagedFingerprints = new Map<string, { user_id: string; hash: string }>([
      [expectedPath, { user_id: "user-a", hash: art.sha256 }],
    ]);
    const serverReports = new Map<string, Record<string, unknown>>();

    const queueStore = createMemoryQueueStore([
      buildEntry({
        client_submission_id: "sub-after-photo",
        status: "uploading",
        attempts: 1,
        upload_started_at: "2026-11-19T00:00:00.000Z",
        sync_owner_id: "dead-tab",
      }),
    ]);
    const photoStore = createMemoryPhotoStore([["sub-after-photo", [toStored("sub-after-photo", art)]]]);

    const sent = await flushOfflineQueue("user-a", {
      ...queueStore,
      readPhotos: photoStore.readPhotos,
      deletePhotos: photoStore.deletePhotos,
      uploadArtifact: async (artifact, userId) => {
        const path = getPhotoStoragePath(userId, artifact.id, artifact.blob);
        // Deterministic upsert overwrites same key -> still 1 object in Storage
        storageObjects.set(path, artifact.blob);
        return path;
      },
      stageFingerprint: async (storagePath, userId, sha256) => {
        const existing = stagedFingerprints.get(storagePath);
        if (existing) {
          if (existing.user_id !== userId || existing.hash !== sha256) {
            throw new Error("Fingerprint conflict");
          }
          return; // Idempotent retry
        }
        stagedFingerprints.set(storagePath, { user_id: userId, hash: sha256 });
      },
      insertReport: async (payload) => {
        const id = String(payload.client_submission_id);
        if (serverReports.has(id)) {
          return { error: { code: "23505", message: "duplicate key" } };
        }
        serverReports.set(id, payload);
        return { error: null };
      },
      checkDuplicate: async (id) => serverReports.has(id),
      locks: null,
      nowMs: () => Date.parse("2026-11-19T01:00:00.000Z"),
      interItemDelayMs: 0,
    });

    expect(sent).toBe(1);
    expect(storageObjects.size).toBe(1);
    expect(stagedFingerprints.size).toBe(1);
    expect(serverReports.size).toBe(1);
    expect(serverReports.get("sub-after-photo")).toMatchObject({
      client_submission_id: "sub-after-photo",
      photo_url: expectedPath,
      photo_urls: [expectedPath],
    });
    expect(photoStore.map.get("sub-after-photo")).toBeUndefined();
    expect(queueStore.map.size).toBe(0);
  });

  it("A5) prevents duplicate reports when two concurrent sync attempts race for the same entry", async () => {
    const art = await makeArtifact("concurrent-photo");
    const queueStore = createMemoryQueueStore([
      buildEntry({ client_submission_id: "sub-race-1", status: "pending", attempts: 0 }),
    ]);
    const photoStore = createMemoryPhotoStore([["sub-race-1", [toStored("sub-race-1", art)]]]);
    const sharedLocks = createFakeLocksManager();

    let insertCount = 0;
    let uploadCount = 0;

    const deps = {
      ...queueStore,
      readPhotos: photoStore.readPhotos,
      deletePhotos: photoStore.deletePhotos,
      uploadArtifact: async (artifact: PhotoArtifact, userId: string) => {
        uploadCount++;
        await new Promise((r) => setTimeout(r, 25));
        return getPhotoStoragePath(userId, artifact.id, artifact.blob);
      },
      stageFingerprint: async () => {},
      insertReport: async () => {
        insertCount++;
        await new Promise((r) => setTimeout(r, 25));
        return { error: null };
      },
      checkDuplicate: async () => insertCount > 0,
      locks: sharedLocks,
      interItemDelayMs: 0,
    };

    // Simulate two simultaneous flush() calls (e.g. OfflineBar + ReportPage or two tabs)
    const [sentA, sentB] = await Promise.all([
      flushOfflineQueue("user-a", { ...deps, currentOwnerId: "instance-1" }),
      flushOfflineQueue("user-a", { ...deps, currentOwnerId: "instance-2" }),
    ]);

    expect(sentA + sentB).toBe(1);
    expect(uploadCount).toBe(1);
    expect(insertCount).toBe(1);
    expect(queueStore.map.size).toBe(0);
    expect(photoStore.map.get("sub-race-1")).toBeUndefined();

    // Also verify direct concurrent syncQueuedReportEntry calls are mutually excluded
    let directInserts = 0;
    const directEntry = buildEntry({ client_submission_id: "sub-race-direct" });
    const [res1, res2] = await Promise.all([
      syncQueuedReportEntry(directEntry, "user-a", {
        readPhotos: async () => [],
        deletePhotos: async () => {},
        insertReport: async () => {
          directInserts++;
          await new Promise((r) => setTimeout(r, 20));
          return { error: null };
        },
        locks: sharedLocks,
      }),
      syncQueuedReportEntry(directEntry, "user-a", {
        readPhotos: async () => [],
        deletePhotos: async () => {},
        insertReport: async () => {
          directInserts++;
          await new Promise((r) => setTimeout(r, 20));
          return { error: null };
        },
        locks: sharedLocks,
      }),
    ]);

    expect([res1, res2].sort()).toEqual(["sent", "skipped"]);
    expect(directInserts).toBe(1);
  });

  it("A6) never recovers or syncs an uploading entry belonging to another user", async () => {
    const userAEntry = buildEntry({
      client_submission_id: "sub-user-a-stuck",
      status: "uploading",
      attempts: 1,
      upload_started_at: "2026-11-19T00:00:00.000Z",
      payload: { user_id: "user-a" },
    });
    const queueStore = createMemoryQueueStore([userAEntry]);
    const insertReport = vi.fn(async () => ({ error: null }));

    // Logged out -> nothing recovered, nothing flushed
    expect(
      await recoverInterruptedUploads(null, {
        readAll: queueStore.readAll,
        putEntry: queueStore.putEntry,
        nowMs: Date.parse("2026-11-19T02:00:00.000Z"),
        locks: null,
      }),
    ).toHaveLength(0);

    // Different account user-b -> user-a's uploading entry remains untouched
    expect(
      await recoverInterruptedUploads("user-b", {
        readAll: queueStore.readAll,
        putEntry: queueStore.putEntry,
        nowMs: Date.parse("2026-11-19T02:00:00.000Z"),
        locks: null,
      }),
    ).toHaveLength(0);

    expect(
      await flushOfflineQueue("user-b", {
        ...queueStore,
        insertReport,
        nowMs: () => Date.parse("2026-11-19T02:00:00.000Z"),
        locks: null,
        interItemDelayMs: 0,
      }),
    ).toBe(0);

    expect(insertReport).not.toHaveBeenCalled();
    expect(queueStore.map.get(userAEntry.id)?.status).toBe("uploading");
  });

  it("A7) verifies isAbandonedUploadingEntry edge cases (invalid timestamp, same owner, non-uploading)", () => {
    const pending = buildEntry({ status: "pending" });
    expect(isAbandonedUploadingEntry(pending)).toBe(false);

    const corruptDate = buildEntry({
      status: "uploading",
      upload_started_at: "not-a-date",
      updated_at: "not-a-date",
      sync_owner_id: "other-tab",
    });
    expect(isAbandonedUploadingEntry(corruptDate, { lockState: "unsupported" })).toBe(true);

    const sameTabInterrupted = buildEntry({
      status: "uploading",
      upload_started_at: new Date().toISOString(),
      sync_owner_id: "this-tab",
    });
    expect(
      isAbandonedUploadingEntry(sameTabInterrupted, {
        currentOwnerId: "this-tab",
        lockState: "unsupported",
      }),
    ).toBe(true);
  });
});

// ============================================================================
// SECTION B — Retour du réseau avant l'envoi du formulaire (Online Submit)
// ============================================================================
describe("Section B — Network returns before form submission (offline artifacts uploaded online)", () => {
  it("B1) uploads a photo added offline when connectivity returns before clicking Envoyer", async () => {
    const offlinePhoto = await makeArtifact("offline-captured-photo-1");
    const photoStore = createMemoryPhotoStore();
    await photoStore.storePhotos("sub-online-1", [offlinePhoto]);

    const uploaded: string[] = [];
    const fingerprints: Array<{ path: string; userId: string; hash: string }> = [];
    let insertedPayload: Record<string, unknown> | null = null;
    const onArtifactUploaded = vi.fn();

    const result = await submitReportOnlineWithArtifacts(
      {
        userId: "user-a",
        clientSubmissionId: "sub-online-1",
        reportPayload: {
          service_type: "road",
          report_category: "infrastructure",
          commune: "Yopougon",
          quartier: "Niangon",
          description: "Caniveau effondré",
          photo_url: null,
          photo_urls: null,
        },
        existingPhotoUrls: [],
        photoArtifacts: [offlinePhoto],
      },
      {
        storePhotos: photoStore.storePhotos,
        deletePhotos: photoStore.deletePhotos,
        uploadArtifact: async (art, uid) => {
          const p = getPhotoStoragePath(uid, art.id, art.blob);
          uploaded.push(p);
          return p;
        },
        stageFingerprint: async (path, uid, hash) => {
          fingerprints.push({ path, userId: uid, hash });
        },
        insertReport: async (payload) => {
          insertedPayload = payload;
          return { data: { id: "rep-101" }, error: null };
        },
        onArtifactUploaded,
      },
    );

    const expectedPath = `user-a/${offlinePhoto.id}.jpg`;
    expect(result.reportId).toBe("rep-101");
    expect(result.wasDuplicate).toBe(false);
    expect(result.photoUrls).toEqual([expectedPath]);
    expect(uploaded).toEqual([expectedPath]);
    expect(fingerprints).toEqual([{ path: expectedPath, userId: "user-a", hash: offlinePhoto.sha256 }]);
    expect(insertedPayload).toMatchObject({
      client_submission_id: "sub-online-1",
      photo_url: expectedPath,
      photo_urls: [expectedPath],
    });
    expect(onArtifactUploaded).toHaveBeenCalledTimes(1);
    // Local draft blobs deleted ONLY after confirmed insert
    expect(photoStore.map.get("sub-online-1")).toBeUndefined();
  });

  it("B2) uploads multiple offline photos (and preserves already-uploaded online photos) with exact Storage paths and SHA-256 fingerprints", async () => {
    const off1 = await makeArtifact("multi-offline-1");
    const off2 = await makeArtifact("multi-offline-2");
    const onlineAlready = await makeArtifact("already-online-3", {
      storagePath: "user-a/already-online-3.jpg",
    });

    const photoStore = createMemoryPhotoStore();
    const uploadedPaths: string[] = [];
    const stagedHashes: string[] = [];
    let insertedPayload: Record<string, unknown> | null = null;

    const result = await submitReportOnlineWithArtifacts(
      {
        userId: "user-a",
        clientSubmissionId: "sub-multi-1",
        reportPayload: { service_type: "water", report_category: "infrastructure", commune: "Cocody" },
        existingPhotoUrls: ["user-a/already-online-3.jpg"],
        photoArtifacts: [off1, off2, onlineAlready],
      },
      {
        storePhotos: photoStore.storePhotos,
        deletePhotos: photoStore.deletePhotos,
        uploadArtifact: async (art, uid) => {
          const p = getPhotoStoragePath(uid, art.id, art.blob);
          uploadedPaths.push(p);
          return p;
        },
        stageFingerprint: async (_path, _uid, hash) => {
          stagedHashes.push(hash);
        },
        insertReport: async (payload) => {
          insertedPayload = payload;
          return { data: { id: "rep-multi-1" }, error: null };
        },
      },
    );

    const expectedPaths = [
      `user-a/${off1.id}.jpg`,
      `user-a/${off2.id}.jpg`,
      "user-a/already-online-3.jpg",
    ];
    expect(uploadedPaths).toEqual([`user-a/${off1.id}.jpg`, `user-a/${off2.id}.jpg`]);
    expect(stagedHashes).toEqual([off1.sha256, off2.sha256]);
    expect(result.photoUrls).toEqual(expectedPaths);
    expect(insertedPayload).toMatchObject({
      photo_url: expectedPaths[0],
      photo_urls: expectedPaths,
    });
    expect(photoStore.map.get("sub-multi-1")).toBeUndefined();
  });

  it("B3) blocks report insertion and keeps local photos if any photo upload or fingerprint staging fails", async () => {
    const off1 = await makeArtifact("ok-photo");
    const off2 = await makeArtifact("failing-photo");
    const photoStore = createMemoryPhotoStore();
    const insertReport = vi.fn(async () => ({ data: { id: "should-not-insert" }, error: null }));
    const deletePhotos = vi.fn(photoStore.deletePhotos);

    // Failure during photo #2 upload
    let calls = 0;
    await expect(
      submitReportOnlineWithArtifacts(
        {
          userId: "user-a",
          clientSubmissionId: "sub-fail-photo",
          reportPayload: { service_type: "road", report_category: "infrastructure" },
          existingPhotoUrls: [],
          photoArtifacts: [off1, off2],
        },
        {
          storePhotos: photoStore.storePhotos,
          deletePhotos,
          uploadArtifact: async (art, uid) => {
            calls++;
            if (calls === 2) throw new Error("Storage 503");
            return getPhotoStoragePath(uid, art.id, art.blob);
          },
          stageFingerprint: async () => {},
          insertReport,
        },
      ),
    ).rejects.toThrow("Storage 503");

    expect(insertReport).not.toHaveBeenCalled();
    expect(deletePhotos).not.toHaveBeenCalled();
    expect(photoStore.map.get("sub-fail-photo")).toHaveLength(2);

    // Failure during SHA-256 fingerprint staging also blocks insert and preserves local blobs
    const onArtifactUploaded = vi.fn();
    await expect(
      submitReportOnlineWithArtifacts(
        {
          userId: "user-a",
          clientSubmissionId: "sub-fail-fp",
          reportPayload: { service_type: "road", report_category: "infrastructure" },
          existingPhotoUrls: [],
          photoArtifacts: [off1],
        },
        {
          storePhotos: photoStore.storePhotos,
          deletePhotos,
          uploadArtifact: async (art, uid) => getPhotoStoragePath(uid, art.id, art.blob),
          stageFingerprint: async () => {
            throw new Error("Fingerprint staging failed");
          },
          insertReport,
          onArtifactUploaded,
        },
      ),
    ).rejects.toThrow("Fingerprint staging failed");

    expect(insertReport).not.toHaveBeenCalled();
    expect(onArtifactUploaded).not.toHaveBeenCalled();
    expect(photoStore.map.get("sub-fail-fp")).toHaveLength(1);
  });

  it("B4) retries safely after partial photo failure or insert timeout without creating duplicates, deleting local photos only after full confirmation", async () => {
    const off1 = await makeArtifact("retry-photo-1");
    const off2 = await makeArtifact("retry-photo-2");
    const photoStore = createMemoryPhotoStore();
    const serverReports = new Map<string, { id: string; payload: Record<string, unknown> }>();

    // Track React-like state updated via onArtifactUploaded
    let formArtifacts: PhotoArtifact[] = [off1, off2];
    let formUrls: string[] = [];

    // Attempt 1: photo #1 succeeds, photo #2 fails -> no report inserted, local photos kept
    let photo2ShouldFail = true;
    await expect(
      submitReportOnlineWithArtifacts(
        {
          userId: "user-a",
          clientSubmissionId: "sub-retry-stable",
          reportPayload: { service_type: "road", report_category: "infrastructure" },
          existingPhotoUrls: formUrls,
          photoArtifacts: formArtifacts,
        },
        {
          storePhotos: photoStore.storePhotos,
          deletePhotos: photoStore.deletePhotos,
          uploadArtifact: async (art, uid) => {
            if (art.id === off2.id && photo2ShouldFail) {
              throw new Error("Temporary network drop");
            }
            return getPhotoStoragePath(uid, art.id, art.blob);
          },
          stageFingerprint: async () => {},
          insertReport: async (payload) => {
            serverReports.set(String(payload.client_submission_id), { id: "rep-1", payload });
            return { data: { id: "rep-1" }, error: null };
          },
          onArtifactUploaded: (uploaded, storagePath) => {
            formArtifacts = formArtifacts.map((a) => (a.id === uploaded.id ? { ...a, storagePath } : a));
            if (!formUrls.includes(storagePath)) formUrls = [...formUrls, storagePath];
          },
        },
      ),
    ).rejects.toThrow("Temporary network drop");

    expect(serverReports.size).toBe(0);
    expect(photoStore.map.get("sub-retry-stable")).toHaveLength(2);
    expect(formArtifacts[0].storagePath).toBe(`user-a/${off1.id}.jpg`);
    expect(formArtifacts[1].storagePath).toBeUndefined();

    // Attempt 2: photo #2 succeeds, report IS inserted on server, BUT response times out
    photo2ShouldFail = false;
    await expect(
      submitReportOnlineWithArtifacts(
        {
          userId: "user-a",
          clientSubmissionId: "sub-retry-stable",
          reportPayload: { service_type: "road", report_category: "infrastructure" },
          existingPhotoUrls: formUrls,
          photoArtifacts: formArtifacts,
        },
        {
          storePhotos: photoStore.storePhotos,
          deletePhotos: photoStore.deletePhotos,
          uploadArtifact: async (art, uid) => getPhotoStoragePath(uid, art.id, art.blob),
          stageFingerprint: async () => {},
          insertReport: async (payload) => {
            // Server actually persisted the row, then client saw a network timeout
            serverReports.set(String(payload.client_submission_id), { id: "rep-999", payload });
            return { data: null, error: { code: "504", message: "Gateway timeout" } };
          },
          onArtifactUploaded: (uploaded, storagePath) => {
            formArtifacts = formArtifacts.map((a) => (a.id === uploaded.id ? { ...a, storagePath } : a));
            if (!formUrls.includes(storagePath)) formUrls = [...formUrls, storagePath];
          },
        },
      ),
    ).rejects.toMatchObject({ code: "504" });

    // Local blobs are STILL kept because client hasn't received confirmation yet
    expect(photoStore.map.get("sub-retry-stable")).toHaveLength(2);

    // Attempt 3: User retries with the exact same client_submission_id -> 23505 resolved idempotently
    const retryUploads = vi.fn(async (art: PhotoArtifact, uid: string) =>
      getPhotoStoragePath(uid, art.id, art.blob),
    );
    const finalResult = await submitReportOnlineWithArtifacts(
      {
        userId: "user-a",
        clientSubmissionId: "sub-retry-stable",
        reportPayload: { service_type: "road", report_category: "infrastructure" },
        existingPhotoUrls: formUrls,
        photoArtifacts: formArtifacts,
      },
      {
        storePhotos: photoStore.storePhotos,
        deletePhotos: photoStore.deletePhotos,
        uploadArtifact: retryUploads,
        stageFingerprint: async () => {},
        insertReport: async (payload) => {
          const cid = String(payload.client_submission_id);
          if (serverReports.has(cid)) {
            return { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };
          }
          serverReports.set(cid, { id: "rep-dup", payload });
          return { data: { id: "rep-dup" }, error: null };
        },
        findExistingReport: async (cid) => {
          const existing = serverReports.get(cid);
          return existing ? { id: existing.id } : null;
        },
      },
    );

    expect(retryUploads).not.toHaveBeenCalled(); // Both photos already had storagePath recorded
    expect(serverReports.size).toBe(1); // Zero duplicate reports
    expect(finalResult.wasDuplicate).toBe(true);
    expect(finalResult.reportId).toBe("rep-999");
    expect(finalResult.photoUrls).toEqual([`user-a/${off1.id}.jpg`, `user-a/${off2.id}.jpg`]);
    // Local photos are NOW deleted after full confirmation
    expect(photoStore.map.get("sub-retry-stable")).toBeUndefined();
  });
});

// ============================================================================
// SECTION C — Non-régression complète (online, offline, restart, reconnect, accounts, IDB)
// ============================================================================
describe("Section C — End-to-end non-regression with IndexedDB & useOfflineQueue hook", () => {
  const originalIndexedDb = globalThis.indexedDB;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState.user = { id: "user-a" };
    mockNetworkState.isOnline = true;
    mockStorageUpload.mockResolvedValue({ error: null });
    mockFingerprintInsert.mockResolvedValue({ error: null });
    mockReportsInsert.mockResolvedValue({ error: null });
    mockReportsSelectMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "indexedDB", {
      value: originalIndexedDb,
      configurable: true,
      writable: true,
    });
  });

  it("C1) handles online report without photo and online report with already-uploaded photos cleanly", async () => {
    const deletePhotos = vi.fn(async () => {});
    const uploadArtifact = vi.fn(async () => "should-not-upload");

    // Without photo
    let payloadNoPhoto: Record<string, unknown> | null = null;
    const resNoPhoto = await submitReportOnlineWithArtifacts(
      {
        userId: "user-a",
        clientSubmissionId: "sub-no-photo",
        reportPayload: { service_type: "electricity", report_category: "outage", commune: "Marcory" },
        existingPhotoUrls: [],
        photoArtifacts: [],
      },
      {
        uploadArtifact,
        deletePhotos,
        insertReport: async (p) => {
          payloadNoPhoto = p;
          return { data: { id: "rep-no-photo" }, error: null };
        },
      },
    );
    expect(resNoPhoto.reportId).toBe("rep-no-photo");
    expect(resNoPhoto.photoUrls).toEqual([]);
    expect(payloadNoPhoto).toMatchObject({ photo_url: null, photo_urls: null });
    expect(uploadArtifact).not.toHaveBeenCalled();

    // With already-uploaded online photos
    const alreadyUploaded = await makeArtifact("online-img", {
      storagePath: "user-a/online-img.jpg",
    });
    let payloadWithPhoto: Record<string, unknown> | null = null;
    const resWithPhoto = await submitReportOnlineWithArtifacts(
      {
        userId: "user-a",
        clientSubmissionId: "sub-with-photo",
        reportPayload: { service_type: "road", report_category: "infrastructure", commune: "Plateau" },
        existingPhotoUrls: ["user-a/online-img.jpg"],
        photoArtifacts: [alreadyUploaded],
      },
      {
        uploadArtifact,
        deletePhotos,
        insertReport: async (p) => {
          payloadWithPhoto = p;
          return { data: { id: "rep-with-photo" }, error: null };
        },
      },
    );
    expect(resWithPhoto.photoUrls).toEqual(["user-a/online-img.jpg"]);
    expect(payloadWithPhoto).toMatchObject({
      photo_url: "user-a/online-img.jpg",
      photo_urls: ["user-a/online-img.jpg"],
    });
    expect(uploadArtifact).not.toHaveBeenCalled();
  });

  it("C2) stores offline photos in IndexedDB without exifGps and auto-syncs on app restart & reconnect via useOfflineQueue", async () => {
    const fakeIdb = createFakeIndexedDb();
    Object.defineProperty(globalThis, "indexedDB", {
      value: fakeIdb.factory,
      configurable: true,
      writable: true,
    });

    const artifact = await makeArtifact("idb-restart-photo");
    expect(artifact.exifGps).toEqual({ lat: 5.35, lng: -4.01 });

    // Persist an abandoned uploading entry for user-a and another user-b entry directly in IDB
    const abandonedUserA = buildEntry({
      client_submission_id: "sub-idb-restart",
      status: "uploading",
      attempts: 1,
      upload_started_at: "2026-11-18T00:00:00.000Z",
      sync_owner_id: "previous-crashed-session",
      payload: { user_id: "user-a" },
    });
    const userBEntry = buildEntry({
      client_submission_id: "sub-idb-user-b",
      status: "uploading",
      attempts: 1,
      upload_started_at: "2026-11-18T00:00:00.000Z",
      sync_owner_id: "other-session",
      payload: { user_id: "user-b" },
    });

    await storeQueueEntryWithPhotoArtifacts(abandonedUserA, [artifact]);
    await storePhotoArtifacts(abandonedUserA.client_submission_id, [artifact]);
    fakeIdb.seedRow("reports", userBEntry as unknown as Record<string, unknown>);

    // Verify exifGps is NEVER written to IndexedDB
    const persistedPhotos = fakeIdb.getRows("photos");
    expect(persistedPhotos).toHaveLength(1);
    expect("exifGps" in persistedPhotos[0]).toBe(false);

    // Step 1: App restarts while still offline -> abandoned entry for user-a is recovered to `pending`, NOT flushed yet
    mockNetworkState.isOnline = false;
    const { result, rerender } = renderHook(() => useOfflineQueue());

    await waitFor(() => {
      expect(result.current.queue).toHaveLength(1);
      expect(result.current.queue[0].status).toBe("pending");
      expect(result.current.queue[0].client_submission_id).toBe("sub-idb-restart");
    });

    // user-b's entry is invisible and untouched
    const rawUserB = fakeIdb
      .getRows("reports")
      .find((r) => r.client_submission_id === "sub-idb-user-b");
    expect(rawUserB?.status).toBe("uploading");
    expect(mockReportsInsert).not.toHaveBeenCalled();

    // Step 2: Network returns while app is open -> auto-flush uploads photo, stages SHA-256, inserts report, deletes local photo
    mockNetworkState.isOnline = true;
    rerender();

    await waitFor(() => {
      expect(mockReportsInsert).toHaveBeenCalledTimes(1);
      expect(result.current.queue).toHaveLength(0);
    });

    expect(mockStorageUpload).toHaveBeenCalledTimes(1);
    expect(mockFingerprintInsert).toHaveBeenCalledTimes(1);
    expect(await readPhotoArtifacts("sub-idb-restart")).toHaveLength(0);

    // Step 3: Logout and switch to user-b -> user-b sees and recovers ONLY their own entry
    mockNetworkState.isOnline = false;
    mockAuthState.user = null;
    rerender();
    await waitFor(() => {
      expect(result.current.queue).toHaveLength(0);
    });

    mockAuthState.user = { id: "user-b" };
    rerender();
    await waitFor(() => {
      expect(result.current.queue).toHaveLength(1);
      expect(result.current.queue[0].client_submission_id).toBe("sub-idb-user-b");
      expect(result.current.queue[0].status).toBe("pending");
    });

    // Cleanup helper test
    await deletePhotoArtifacts("sub-idb-user-b");
    expect(await readPhotoArtifacts("sub-idb-user-b")).toHaveLength(0);
  });

  it("C3) offline enqueue -> stays pending offline -> reconnect auto-flushes with photo and cleans IndexedDB", async () => {
    const fakeIdb = createFakeIndexedDb();
    Object.defineProperty(globalThis, "indexedDB", {
      value: fakeIdb.factory,
      configurable: true,
      writable: true,
    });

    mockNetworkState.isOnline = false;
    const { result, rerender } = renderHook(() => useOfflineQueue());

    const photo = await makeArtifact("offline-enqueue-photo");
    await act(async () => {
      await result.current.enqueue(
        {
          client_submission_id: "sub-off-flow",
          user_id: "user-a",
          service_type: "road",
          report_category: "infrastructure",
          commune: "Abobo",
          quartier: "Pk18",
          description: "Route impraticable",
        },
        [photo],
      );
    });

    expect(result.current.queue).toHaveLength(1);
    expect(await readPhotoArtifacts("sub-off-flow")).toHaveLength(1);

    // Network comes back -> auto-flush runs
    mockNetworkState.isOnline = true;
    rerender();

    await waitFor(() => {
      expect(mockReportsInsert).toHaveBeenCalledTimes(1);
      expect(result.current.queue).toHaveLength(0);
    });

    expect(mockStorageUpload).toHaveBeenCalledTimes(1);
    expect(mockFingerprintInsert).toHaveBeenCalledTimes(1);
    expect(await readPhotoArtifacts("sub-off-flow")).toHaveLength(0);
  });

  it("C4) replacePhotoArtifacts atomically replaces draft photos for one submission without touching others or persisting exifGps", async () => {
    const fakeIdb = createFakeIndexedDb();
    Object.defineProperty(globalThis, "indexedDB", {
      value: fakeIdb.factory,
      configurable: true,
      writable: true,
    });

    const p1 = await makeArtifact("draft-p1");
    const p2 = await makeArtifact("draft-p2");
    const otherUserPhoto = await makeArtifact("other-sub-photo");

    await storePhotoArtifacts("draft-1", [p1]);
    await storePhotoArtifacts("draft-other", [otherUserPhoto]);

    // Replace draft-1 with [p2] -> removes p1, stores p2 without exifGps, preserves draft-other
    await replacePhotoArtifacts("draft-1", [p2]);

    const draft1Rows = await readPhotoArtifacts("draft-1");
    const otherRows = await readPhotoArtifacts("draft-other");
    expect(draft1Rows).toHaveLength(1);
    expect(draft1Rows[0].id).toBe(p2.id);
    expect("exifGps" in (draft1Rows[0] as unknown as Record<string, unknown>)).toBe(false);
    expect(otherRows).toHaveLength(1);
    expect(otherRows[0].id).toBe(otherUserPhoto.id);

    // Replacing with empty list cleanly deletes draft-1 while leaving draft-other intact
    await replacePhotoArtifacts("draft-1", []);
    expect(await readPhotoArtifacts("draft-1")).toHaveLength(0);
    expect(await readPhotoArtifacts("draft-other")).toHaveLength(1);
  });
});
