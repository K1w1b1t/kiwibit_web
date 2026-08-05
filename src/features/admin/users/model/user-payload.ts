import type { UserRole } from '@prisma/client';
import type { UserFormValues } from './validate-user';

export type CreateUserPayload = {
  name: string;
  email: string;
  role: UserRole;
  password: string;
};

export type UpdateUserPayload = {
  name: string;
  email: string;
  role: UserRole;
  /** Omitted entirely when unchanged — the PUT ignores absent keys. */
  password?: string;
};

type ValidatedValues = UserFormValues & { role: UserRole };

export function toCreateUserPayload(values: ValidatedValues): CreateUserPayload {
  return {
    name: values.name,
    email: values.email,
    role: values.role,
    password: values.password,
  };
}

/**
 * An empty password field means "keep the current one", so the key must be
 * absent rather than an empty string — `PUT /api/admin/users/[id]` rejects an
 * empty password with a 400.
 */
export function toUpdateUserPayload(values: ValidatedValues): UpdateUserPayload {
  return {
    name: values.name,
    email: values.email,
    role: values.role,
    ...(values.password !== '' && { password: values.password }),
  };
}
