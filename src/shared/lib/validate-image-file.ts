/**
 * Image upload rules, shared by the client (fail fast) and the upload route
 * (the actual gate).
 *
 * SVG is deliberately absent: the bucket serves objects publicly, and an SVG
 * containing <script> would be stored XSS on the storage origin.
 */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/**
 * 4 MB. Vercel caps a Serverless Function request body at ~4.5 MB, and the
 * upload is proxied through a route handler, so anything larger cannot arrive.
 */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** Extension is derived from the MIME type, never from the client filename. */
const EXTENSIONS: Record<AllowedImageType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

export const UPLOAD_SCOPES = ['projects', 'posts', 'members'] as const;

export type UploadScope = (typeof UPLOAD_SCOPES)[number];

export function isUploadScope(value: unknown): value is UploadScope {
  return typeof value === 'string' && (UPLOAD_SCOPES as readonly string[]).includes(value);
}

export function isAllowedImageType(value: unknown): value is AllowedImageType {
  return typeof value === 'string' && (ALLOWED_IMAGE_TYPES as readonly string[]).includes(value);
}

export function extensionForType(type: AllowedImageType): string {
  return EXTENSIONS[type];
}

export type ImageCheck =
  | { valid: true; type: AllowedImageType }
  | { valid: false; message: string };

export function checkImageFile(input: { type: string; size: number }): ImageCheck {
  if (!isAllowedImageType(input.type)) {
    return { valid: false, message: 'Formato não suportado. Use JPEG, PNG, WebP ou AVIF.' };
  }
  if (input.size <= 0) {
    return { valid: false, message: 'Arquivo vazio.' };
  }
  if (input.size > MAX_IMAGE_BYTES) {
    const mb = Math.round(MAX_IMAGE_BYTES / (1024 * 1024));
    return { valid: false, message: `Arquivo acima de ${mb} MB.` };
  }
  return { valid: true, type: input.type };
}

/**
 * Magic-byte sniffing, because the declared MIME type is attacker-controlled.
 * Returns the type the bytes actually are, or null when unrecognized.
 */
export function sniffImageType(bytes: Uint8Array): AllowedImageType | null {
  if (bytes.length < 12) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (PNG.every((byte, index) => bytes[index] === byte)) return 'image/png';

  // RIFF....WEBP
  const isRiff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  const isWebp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if (isRiff && isWebp) return 'image/webp';

  // ISO-BMFF box with an 'ftyp' header and an AVIF brand.
  const isFtyp = bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
  if (isFtyp) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
  }

  return null;
}
