/**
 * Password rules for admin-managed accounts.
 *
 * The maximum is 72 because bcrypt silently truncates at 72 bytes — without it,
 * two different long passwords would authenticate interchangeably.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

/** bcrypt cost used everywhere a password is hashed by the app. */
export const PASSWORD_HASH_ROUNDS = 12;

export type PasswordCheck = { valid: true } | { valid: false; message: string };

/**
 * Rejects the empty string explicitly: `typeof password === 'string'` used to be
 * the only guard, so `""` was hashed and stored, bricking the account.
 */
export function checkPassword(raw: unknown): PasswordCheck {
  if (typeof raw !== 'string') {
    return { valid: false, message: 'password must be a string.' };
  }
  if (raw.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      message: `password must have at least ${PASSWORD_MIN_LENGTH} characters.`,
    };
  }
  if (Buffer.byteLength(raw, 'utf8') > PASSWORD_MAX_LENGTH) {
    return {
      valid: false,
      message: `password must not exceed ${PASSWORD_MAX_LENGTH} bytes.`,
    };
  }
  return { valid: true };
}
