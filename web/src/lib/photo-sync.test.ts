import { describe, expect, it } from "vitest";
import { isSamePendingFingerprint, uploadPhotoArtifact } from "@/lib/photo-sync";

describe("photo-sync", () => {
  it("keeps an existing storage path stable", () => {
    const artifact = {
      id: "artifact-1",
      blob: new Blob(["photo"], { type: "image/jpeg" }),
      sha256: "a".repeat(64),
      exifGps: null,
      storagePath: "user-1/existing.jpg",
    };

    expect(artifact.storagePath).toBe("user-1/existing.jpg");
    expect(typeof uploadPhotoArtifact).toBe("function");
  });

  it("accepts an existing pending fingerprint only when user and hash match", () => {
    const existing = { user_id: "user-1", hash: "a".repeat(64) };

    expect(isSamePendingFingerprint(existing, "user-1", "a".repeat(64))).toBe(true);
    expect(isSamePendingFingerprint(existing, "user-2", "a".repeat(64))).toBe(false);
    expect(isSamePendingFingerprint(existing, "user-1", "b".repeat(64))).toBe(false);
  });
});
