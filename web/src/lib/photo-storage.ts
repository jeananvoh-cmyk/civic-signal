const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/gif": "gif",
};

/**
 * Returns the canonical Storage path for a photo artifact.
 *
 * The artifact id is the stable identity of the photo. The extension is derived
 * from the exact blob that will be uploaded, so online and offline flows can
 * converge on the same object without relying on Date.now() or array indexes.
 */
export function getPhotoStoragePath(userId: string, artifactId: string, blob: Blob): string {
  const extension = EXTENSION_BY_MIME[blob.type] ?? "jpg";
  return `${userId}/${artifactId}.${extension}`;
}
