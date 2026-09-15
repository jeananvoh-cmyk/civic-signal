// =========================================================================
// SUIVI BUDGET CI - SECURITY & DATA SANITIZATION DEFENSE MODULE
// Protection contre : Injections XSS, Injections CSV/Excel, Faux binaires médias,
// et Fuite de données personnelles de géolocalisation (Privacy by Design).
// =========================================================================

/**
 * Validate image file binary signature (Magic Bytes) to prevent malicious executable injection
 */
export async function validateImageBinary(file: File): Promise<{ isValid: boolean; error?: string; format?: string }> {
  // 1. Check max size (8 MB limit)
  const MAX_SIZE_BYTES = 8 * 1024 * 1024;
  if (file.size > MAX_SIZE_BYTES) {
    return { isValid: false, error: 'Le fichier dépasse la taille maximale autorisée (8 Mo).' };
  }

  // 2. Read first 12 bytes for Magic Number verification
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // JPEG signature: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return { isValid: true, format: 'image/jpeg' };
  }

  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4E &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0D &&
    bytes[5] === 0x0A &&
    bytes[6] === 0x1A &&
    bytes[7] === 0x0A
  ) {
    return { isValid: true, format: 'image/png' };
  }

  // WebP signature: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { isValid: true, format: 'image/webp' };
  }

  return {
    isValid: false,
    error: 'Format de fichier non sécurisé. Seules les photographies JPEG, PNG et WebP authentiques sont acceptées.',
  };
}

/**
 * Validate video binary format and size limit (Max 25 MB)
 */
export async function validateVideoBinary(file: File): Promise<{ isValid: boolean; error?: string }> {
  const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
  if (file.size > MAX_VIDEO_BYTES) {
    return { isValid: false, error: 'La vidéo dépasse la taille maximale autorisée (25 Mo).' };
  }

  const buffer = await file.slice(0, 16).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // MP4 container: ... ftyp (bytes[4..7] == 'ftyp')
  const isMp4 = bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
  // WebM container: 1A 45 DF A3 (EBML ID)
  const isWebm = bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3;

  if (isMp4 || isWebm) {
    return { isValid: true };
  }

  return {
    isValid: false,
    error: 'Format vidéo non supporté. Seuls les formats MP4 et WebM authentiques sont acceptés.',
  };
}

/**
 * Compress and sanitize an image via HTML5 Canvas (strips embedded malicious payload & metadata)
 */
export async function compressAndSanitizeImage(file: File, maxDimension = 1280, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Impossible de décoder l'image fournie."));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Erreur de lecture du fichier."));
    reader.readAsDataURL(file);
  });
}

/**
 * Strict URL Safety Validator (Prevents XSS via javascript: or data: URIs)
 */
export function isSafeUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  
  // Safe relative paths
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return true;
  }
  
  // Strict protocol check
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * CSV / Excel Formula Injection Shield
 * Neutralizes any cell starting with dangerous characters (=, +, -, @, \t, \r)
 */
export function sanitizeCsvCell(value: any): string {
  if (value === null || value === undefined) return '""';
  let str = String(value).trim();
  
  // If value begins with a formula trigger, prepend with a single quote
  const formulaTriggers = ['=', '+', '-', '@', '\t', '\r'];
  if (formulaTriggers.some(trigger => str.startsWith(trigger))) {
    str = "'" + str;
  }
  
  // Escape internal double quotes
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Citizen Privacy by Design: Truncate GPS coordinates to ~100m radius
 * Protects whistleblowers and citizens from exact household triangulation
 */
export function sanitizeCoordinates(lat: number, lng: number): { lat: number; lng: number } {
  const boundedLat = Math.min(90, Math.max(-90, lat));
  const boundedLng = Math.min(180, Math.max(-180, lng));
  return {
    lat: Math.round(boundedLat * 1000) / 1000,
    lng: Math.round(boundedLng * 1000) / 1000,
  };
}

/**
 * Basic XSS string sanitizer
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .trim();
}
