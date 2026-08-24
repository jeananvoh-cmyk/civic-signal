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
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const bytes = new Uint8Array(hashBuffer);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createPhotoArtifactId(): string {
  return crypto.randomUUID();
}
