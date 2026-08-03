import type { UserRole } from '@prisma/client';
import { invalid, isNonEmptyString, valid, type Validated } from '@/shared/lib/api-helpers';
import { isValidEmail } from '@/shared/lib/email';
import { checkPassword } from '@/shared/lib/password';
import { isPrivilegedRole, isUserRole } from '@/shared/lib/roles';
import { isHttpUrl } from '@/shared/lib/url';

export type MemberUpdateInput = {
  /** Present-but-not-a-string clears the column; absent leaves it untouched. */
  userId?: string | null;
  name?: string;
  bio?: string | null;
  avatarUrl?: string | null;
};

/** `avatarUrl` is checked server-side too — a client-only URL check is not a check. */
function invalidAvatarUrl(avatarUrl: unknown): boolean {
  return typeof avatarUrl === 'string' && avatarUrl !== '' && !isHttpUrl(avatarUrl);
}

/** Server-side shape check for `PUT /api/admin/members/[id]`. */
export function validateUpdateMemberBody(body: unknown): Validated<MemberUpdateInput> {
  const { userId, name, bio, avatarUrl } = body as Record<string, unknown>;

  if (name !== undefined && !isNonEmptyString(name)) {
    return invalid('BAD_REQUEST', 'name must be a non-empty string.', 400);
  }
  if (invalidAvatarUrl(avatarUrl)) {
    return invalid('BAD_REQUEST', 'avatarUrl must be an http(s) URL.', 400);
  }

  return valid({
    ...(userId !== undefined && { userId: typeof userId === 'string' ? userId : null }),
    ...(typeof name === 'string' && { name: name.trim() }),
    ...(bio !== undefined && { bio: typeof bio === 'string' ? bio : null }),
    ...(avatarUrl !== undefined && {
      avatarUrl: typeof avatarUrl === 'string' ? avatarUrl : null,
    }),
  });
}

export type MemberCreateFields = {
  userId?: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
  avatarPath?: string;
};

export type MemberAccountInput = { email: string; password: string; role: UserRole };

export type MemberCreateInput = {
  member: MemberCreateFields;
  /** `null` when the member has no system account — `Member.userId` is nullable. */
  account: MemberAccountInput | null;
};

function validateCreateMemberFields(body: Record<string, unknown>): Validated<MemberCreateFields> {
  const { userId, name, bio, avatarUrl, avatarPath } = body;

  if (!isNonEmptyString(name)) {
    return invalid('BAD_REQUEST', 'name is required.', 400);
  }
  if (userId !== undefined && typeof userId !== 'string') {
    return invalid('BAD_REQUEST', 'userId must be a string.', 400);
  }
  if (invalidAvatarUrl(avatarUrl)) {
    return invalid('BAD_REQUEST', 'avatarUrl must be an http(s) URL.', 400);
  }

  return valid({
    ...(typeof userId === 'string' && { userId }),
    name: name.trim(),
    ...(typeof bio === 'string' && { bio }),
    ...(typeof avatarUrl === 'string' && { avatarUrl }),
    ...(typeof avatarPath === 'string' && { avatarPath }),
  });
}

/**
 * The optional `account` block creates the member's login in the same request.
 * Mutually exclusive with `userId`: one links an existing user, the other makes a
 * new one, and accepting both would silently ignore one of them.
 */
function validateAccountBlock(
  account: unknown,
  userId: unknown,
  actorRole: UserRole,
): Validated<MemberAccountInput | null> {
  if (account === undefined || account === null) return valid(null);

  if (typeof account !== 'object') {
    return invalid('BAD_REQUEST', 'account must be an object.', 400);
  }
  if (typeof userId === 'string') {
    return invalid('BAD_REQUEST', 'Provide either userId or account, not both.', 400);
  }

  const { email, password, role } = account as Record<string, unknown>;

  if (!isValidEmail(email)) {
    return invalid('BAD_REQUEST', 'account.email must be a valid address.', 400);
  }
  const passwordCheck = checkPassword(password);
  if (!passwordCheck.valid) {
    return invalid('BAD_REQUEST', `account.${passwordCheck.message}`, 400);
  }
  const requestedRole = role === undefined ? 'member' : role;
  if (!isUserRole(requestedRole)) {
    return invalid('BAD_REQUEST', 'account.role must be a valid user role.', 400);
  }
  if (isPrivilegedRole(requestedRole) && actorRole !== 'admin') {
    return invalid('FORBIDDEN', 'Only admins can assign privileged roles.', 403);
  }

  return valid({
    email: (email as string).trim(),
    password: password as string,
    role: requestedRole,
  });
}

/** Server-side shape check for `POST /api/admin/members`. */
export function validateCreateMemberBody(
  body: unknown,
  actorRole: UserRole,
): Validated<MemberCreateInput> {
  const raw = body as Record<string, unknown>;

  const member = validateCreateMemberFields(raw);
  if (member.failure) return { data: null, failure: member.failure };

  const account = validateAccountBlock(raw.account, raw.userId, actorRole);
  if (account.failure) return { data: null, failure: account.failure };

  return valid({ member: member.data, account: account.data });
}
