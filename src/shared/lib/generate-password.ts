import { PASSWORD_MIN_LENGTH } from '@/shared/lib/password';

/**
 * Alphabet without look-alikes (0/O, 1/l/I) — these passwords get read off a
 * screen and typed by hand.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?';

export const GENERATED_PASSWORD_LENGTH = 16;

/**
 * Cryptographically random password for the admin reset flow.
 *
 * Uses `crypto.getRandomValues` (available in both the browser and Node 18+)
 * rather than `Math.random`, which is not suitable for credentials.
 */
export function generatePassword(length: number = GENERATED_PASSWORD_LENGTH): string {
  const size = Math.max(PASSWORD_MIN_LENGTH, Math.trunc(length));
  const bytes = new Uint32Array(size);
  crypto.getRandomValues(bytes);

  let out = '';
  for (let i = 0; i < size; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}
