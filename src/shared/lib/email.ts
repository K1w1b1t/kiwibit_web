/**
 * Shared e-mail shape check. Intentionally permissive — the goal is to reject
 * obvious garbage at the boundary, not to implement RFC 5322.
 *
 * NOTE: no case normalization happens anywhere. `User.email` is case-sensitive
 * in Postgres and `authorize()` looks it up verbatim, so lowercasing on write
 * alone would lock out anyone who signs in with a capital letter. Changing that
 * is a separate migration + auth change.
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EMAIL_MAX_LENGTH = 254;

export function isValidEmail(raw: unknown): boolean {
  if (typeof raw !== 'string') return false;
  const value = raw.trim();
  return value.length > 0 && value.length <= EMAIL_MAX_LENGTH && EMAIL_REGEX.test(value);
}
