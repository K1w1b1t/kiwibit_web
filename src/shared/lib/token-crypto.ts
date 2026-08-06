import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Symmetric encryption for third-party access tokens stored at rest.
 *
 * SERVER ONLY. The key lives in `LINKEDIN_TOKEN_ENC_KEY` and must never reach
 * the browser — nothing here is `NEXT_PUBLIC_` and the module is imported solely
 * from route handlers.
 *
 * AES-256-GCM: authenticated encryption, so a tampered ciphertext fails to
 * decrypt instead of yielding garbage. Each call uses a fresh random 12-byte IV
 * (the standard nonce size for GCM), so the same token encrypts differently
 * every time. The persisted format is `iv:authTag:ciphertext`, all base64.
 */
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;

function readKey(): Buffer | null {
  const raw = process.env.LINKEDIN_TOKEN_ENC_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, 'base64');
  return key.length === KEY_BYTES ? key : null;
}

/** True when a valid 32-byte key is configured. */
export function isTokenCryptoConfigured(): boolean {
  return readKey() !== null;
}

/** Encrypts a token into `iv:authTag:ciphertext` (base64 parts). Throws if unconfigured. */
export function encryptToken(plain: string): string {
  const key = readKey();
  if (!key) throw new Error('LINKEDIN_TOKEN_ENC_KEY is missing or not a 32-byte base64 key.');

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(
    ':',
  );
}

/** Reverses {@link encryptToken}. Throws on a malformed payload or failed auth check. */
export function decryptToken(payload: string): string {
  const key = readKey();
  if (!key) throw new Error('LINKEDIN_TOKEN_ENC_KEY is missing or not a 32-byte base64 key.');

  const parts = payload.split(':');
  if (parts.length !== 3) throw new Error('Malformed encrypted token payload.');

  const [iv, authTag, ciphertext] = parts.map((part) => Buffer.from(part, 'base64'));
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
