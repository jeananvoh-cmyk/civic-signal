import { describe, expect, it } from "vitest";
import { getPhotoStoragePath } from "./photo-storage";

describe("getPhotoStoragePath", () => {
  it("uses the artifact id instead of time or array position", () => {
    expect(getPhotoStoragePath("user-1", "artifact-123", new Blob(["x"], { type: "image/jpeg" })))
      .toBe("user-1/artifact-123.jpg");
  });

  it("keeps the extension aligned with the uploaded blob", () => {
    expect(getPhotoStoragePath("user-1", "artifact-123", new Blob(["x"], { type: "image/png" })))
      .toBe("user-1/artifact-123.png");
  });

  it("falls back to jpg for an unknown image MIME type", () => {
    expect(getPhotoStoragePath("user-1", "artifact-123", new Blob(["x"], { type: "image/unknown" })))
      .toBe("user-1/artifact-123.jpg");
  });
});
