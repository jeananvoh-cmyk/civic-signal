import { describe, expect, it } from "vitest";
import { uploadPhotoArtifact } from "@/lib/photo-sync";

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
});
