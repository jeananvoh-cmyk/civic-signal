import { describe, expect, it } from "vitest";
import { createPhotoArtifact, sha256Blob } from "@/lib/photo-artifact";

describe("photo-artifact", () => {
  it("hashes the exact blob used to build the artifact", async () => {
    const blob = new Blob(["signa-photo"], { type: "image/jpeg" });
    const expected = await sha256Blob(blob);
    const artifact = await createPhotoArtifact(blob);

    expect(artifact.sha256).toBe(expected);
    expect(artifact.blob).toBe(blob);
    expect(artifact.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("preserves EXIF GPS metadata", async () => {
    const blob = new Blob(["signa-photo"], { type: "image/jpeg" });
    const gps = { lat: 5.3364, lng: -4.0267 };
    const artifact = await createPhotoArtifact(blob, gps);

    expect(artifact.exifGps).toEqual(gps);
  });
});
