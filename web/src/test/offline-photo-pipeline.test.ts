/* eslint-disable security/detect-non-literal-fs-filename */
import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  canAccessQueuedEntry,
  syncQueuedReportEntry,
  type QueuedReport,
} from "@/hooks/useOfflineQueue";
import type { StoredPhotoArtifact } from "@/lib/offline-photo-store";

const REPO_ROOT = path.resolve(__dirname, "../../..");

function buildQueuedReport(overrides: Partial<QueuedReport> = {}): QueuedReport {
  return {
    id: "offline_sub-1",
    client_submission_id: "sub-1",
    queued_at: "2026-11-18T12:00:00.000Z",
    updated_at: "2026-11-18T12:00:00.000Z",
    status: "pending",
    attempts: 0,
    payload: {
      client_submission_id: "sub-1",
      user_id: "user-a",
      service_type: "road",
      report_category: "infrastructure",
      commune: "Cocody",
      quartier: "Angré",
      description: "Nid-de-poule profond devant le marché",
    },
    ...overrides,
  };
}

describe("PR #21 — Offline photo persistence, account isolation & RLS checks", () => {
  it("1) deletes locally persisted photo blobs after confirmed transfer", async () => {
    const localPhotoStore = new Map<string, StoredPhotoArtifact[]>([
      [
        "sub-1",
        [
          {
            key: "sub-1:art-1",
            submissionId: "sub-1",
            id: "art-1",
            blob: new Blob(["jpeg-bytes"], { type: "image/jpeg" }),
            sha256: "b".repeat(64),
            createdAt: "2026-11-18T12:00:00.000Z",
          },
        ],
      ],
    ]);

    const uploadArtifact = vi.fn(async (artifact, userId) => `${userId}/${artifact.id}.jpg`);
    const stageFingerprint = vi.fn(async () => {});
    const insertReport = vi.fn(async () => ({ error: null }));
    const deletePhotos = vi.fn(async (submissionId: string) => {
      localPhotoStore.delete(submissionId);
    });

    const outcome = await syncQueuedReportEntry(buildQueuedReport(), "user-a", {
      readPhotos: async (submissionId) => localPhotoStore.get(submissionId) ?? [],
      deletePhotos,
      uploadArtifact,
      stageFingerprint,
      insertReport,
    });

    expect(outcome).toBe("sent");
    expect(uploadArtifact).toHaveBeenCalledTimes(1);
    expect(stageFingerprint).toHaveBeenCalledWith("user-a/art-1.jpg", "user-a", "b".repeat(64));
    expect(insertReport).toHaveBeenCalledWith(
      expect.objectContaining({
        photo_url: "user-a/art-1.jpg",
        photo_urls: ["user-a/art-1.jpg"],
      }),
    );
    expect(deletePhotos).toHaveBeenCalledWith("sub-1");
    expect(localPhotoStore.get("sub-1")).toBeUndefined();
  });

  it("1b) keeps local photo blobs intact if report insertion fails (retryable)", async () => {
    const localPhotoStore = new Map<string, StoredPhotoArtifact[]>([
      [
        "sub-1",
        [
          {
            key: "sub-1:art-1",
            submissionId: "sub-1",
            id: "art-1",
            blob: new Blob(["jpeg-bytes"], { type: "image/jpeg" }),
            sha256: "c".repeat(64),
            createdAt: "2026-11-18T12:00:00.000Z",
          },
        ],
      ],
    ]);
    const deletePhotos = vi.fn(async () => {});

    await expect(
      syncQueuedReportEntry(buildQueuedReport(), "user-a", {
        readPhotos: async (submissionId) => localPhotoStore.get(submissionId) ?? [],
        deletePhotos,
        uploadArtifact: async (a, u) => `${u}/${a.id}.jpg`,
        stageFingerprint: async () => {},
        insertReport: async () => ({ error: { code: "500", message: "network timeout" } }),
      }),
    ).rejects.toMatchObject({ code: "500" });

    expect(deletePhotos).not.toHaveBeenCalled();
    expect(localPhotoStore.get("sub-1")).toHaveLength(1);
  });

  it("2) blocks access and skips sync when logged out or switched to another account", async () => {
    const entryUserA = buildQueuedReport();

    // Logged out -> cannot access or flush
    expect(canAccessQueuedEntry(entryUserA, null)).toBe(false);
    expect(canAccessQueuedEntry(entryUserA, undefined)).toBe(false);

    // Account switched to user-b -> cannot access or flush user-a's entry
    expect(canAccessQueuedEntry(entryUserA, "user-b")).toBe(false);
    expect(canAccessQueuedEntry(entryUserA, "user-a")).toBe(true);

    const readPhotos = vi.fn(async () => []);
    const uploadArtifact = vi.fn(async () => "should-not-run");
    const insertReport = vi.fn(async () => ({ error: null }));
    const deletePhotos = vi.fn(async () => {});

    // Logged out flush attempt
    expect(
      await syncQueuedReportEntry(entryUserA, null, {
        readPhotos,
        uploadArtifact,
        insertReport,
        deletePhotos,
      }),
    ).toBe("skipped");

    // Different account flush attempt
    expect(
      await syncQueuedReportEntry(entryUserA, "user-b", {
        readPhotos,
        uploadArtifact,
        insertReport,
        deletePhotos,
      }),
    ).toBe("skipped");

    expect(readPhotos).not.toHaveBeenCalled();
    expect(uploadArtifact).not.toHaveBeenCalled();
    expect(insertReport).not.toHaveBeenCalled();
    expect(deletePhotos).not.toHaveBeenCalled();
  });

  it("3) RLS migrations restrict storage UPDATE and pending fingerprint SELECT/DELETE strictly to owners", () => {
    const m1 = fs.readFileSync(
      path.join(
        REPO_ROOT,
        "supabase/migrations/20260825010000_harden_photo_retry_storage_and_pending_cleanup.sql",
      ),
      "utf8",
    );
    const m3 = fs.readFileSync(
      path.join(
        REPO_ROOT,
        "supabase/migrations/20260826011000_optimize_pending_fingerprint_select_rls.sql",
      ),
      "utf8",
    );

    // Storage UPDATE scoped strictly to authenticated owner folder <auth.uid()>/...
    expect(m1).toContain("FOR UPDATE");
    expect(m1).toContain("TO authenticated");
    expect(m1).toContain("bucket_id = 'report-photos'");
    expect(m1).toContain("(auth.uid())::text = (storage.foldername(name))[1]");

    // Pending fingerprint DELETE scoped strictly to owner
    expect(m1).toContain("FOR DELETE");
    expect(m1).toContain("USING ((select auth.uid()) = user_id)");

    // Pending fingerprint SELECT scoped strictly to owner
    expect(m3).toContain("FOR SELECT");
    expect(m3).toContain("TO authenticated");
    expect(m3).toContain("USING ((select auth.uid()) = user_id)");
  });

  it("never persists exifGps inside IndexedDB offline photo store", () => {
    const storeSource = fs.readFileSync(
      path.join(REPO_ROOT, "web/src/lib/offline-photo-store.ts"),
      "utf8",
    );
    expect(storeSource).toContain('delete value.exifGps');
    expect(storeSource).not.toContain("exifGps: artifact.exifGps");
  });
});
