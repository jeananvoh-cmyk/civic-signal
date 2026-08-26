export interface PhotoArtifactGps {
  lat: number;
  lng: number;
}

/**
 * Canonical photo representation shared by online and offline flows.
 * The hash MUST be computed from the exact blob that will be uploaded.
 */
export interface PhotoArtifact {
  id: string;
  blob: Blob;
  sha256: string;
  exifGps: PhotoArtifactGps | null;
  storagePath?: string;
}

export async function sha256Blob(blob: Blob): Promise<string> {
  // Response.arrayBuffer() is available in both browsers and the Vitest
  // environment used by the project, unlike Blob.arrayBuffer() in older jsdom.
  const buffer = await new Response(blob as BodyInit).arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const bytes = new Uint8Array(hashBuffer);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createPhotoArtifactId(): string {
  return crypto.randomUUID();
}

/**
 * Builds the canonical artifact from the final blob that will be uploaded.
 * Keeping this operation centralized prevents hashing the original source file
 * when compression/transcoding has changed the bytes that reach Storage.
 */
export async function createPhotoArtifact(
  blob: Blob,
  exifGps: PhotoArtifactGps | null = null,
): Promise<PhotoArtifact> {
  const sha256 = await sha256Blob(blob);

  return {
    id: createPhotoArtifactId(),
    blob,
    sha256,
    exifGps,
  };
}
