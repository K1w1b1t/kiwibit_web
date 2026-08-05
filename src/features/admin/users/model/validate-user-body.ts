import type { UserRole } from '@prisma/client';
import {
  failure,
  invalid,
  isNonEmptyString,
  rejected,
  valid,
  type ApiFailure,
  type Validated,
} from '@/shared/lib/api-helpers';
import { isValidEmail } from '@/shared/lib/email';
import { checkPassword } from '@/shared/lib/password';
import { isPrivilegedRole, isUserRole } from '@/shared/lib/roles';

/**
 * Server-side shape checks for `PUT /api/admin/users/[id]`.
 *
 * Split from the "last admin" guard on purpose: that one needs a DB round-trip
 * and has to run between the role checks and the password check, which is the
 * precedence the route specs assert.
 */
export type UserUpdateFields = {
  name?: string;
  email?: string;
  role?: UserRole;
};

/** Checking and building are split so neither half approaches the complexity budget. */
function checkUserFields(
  { name, email, role }: Record<string, unknown>,
  actorRole: UserRole,
): ApiFailure | null {
  if (name !== undefined && !isNonEmptyString(name)) {
    return failure('BAD_REQUEST', 'name must be a non-empty string.', 400);
  }
  if (email !== undefined && !isValidEmail(email)) {
    return failure('BAD_REQUEST', 'email must be a valid address.', 400);
  }
  if (role === undefined) return null;

  if (!isUserRole(role)) {
    return failure('BAD_REQUEST', 'role must be a valid user role.', 400);
  }
  if (isPrivilegedRole(role) && actorRole !== 'admin') {
    return failure('FORBIDDEN', 'Only admins can assign privileged roles.', 403);
  }
  return null;
}

export function validateUpdateUserFields(
  body: unknown,
  actorRole: UserRole,
): Validated<UserUpdateFields> {
  const raw = body as Record<string, unknown>;

  const problem = checkUserFields(raw, actorRole);
  if (problem) return rejected(problem);

  const { name, email, role } = raw;
  return valid({
    ...(typeof name === 'string' && { name: name.trim() }),
    ...(typeof email === 'string' && { email: email.trim() }),
    ...(isUserRole(role) && { role }),
  });
}

/** Strength check only — hashing stays in the route, which is server-only. */
export function validateUserPassword(password: unknown): Validated<string> {
  const check = checkPassword(password);
  if (!check.valid) {
    return invalid('BAD_REQUEST', check.message, 400);
  }
  return valid(password as string);
}
