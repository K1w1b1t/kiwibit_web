import { isValidEmail } from '@/shared/lib/email';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/shared/lib/password';
import { isUserRole } from '@/shared/lib/roles';
import type { UserRole } from '@prisma/client';

export type UserFormValues = {
  name: string;
  email: string;
  role: string;
  /** Empty on edit means "keep the current password". */
  password: string;
};

export type UserField = 'name' | 'email' | 'role' | 'password';

export type UserFieldErrors = Partial<Record<UserField, string>>;

export type UserValidationResult =
  | { valid: true; data: UserFormValues & { role: UserRole } }
  | { valid: false; fieldErrors: UserFieldErrors };

export const EMPTY_USER_FIELD_ERRORS: UserFieldErrors = {};

export const USER_NAME_MIN = 2;
export const USER_NAME_MAX = 120;

/**
 * Mirrors the server rules in `POST/PUT /api/admin/users` so the form fails
 * fast. The server still re-validates — this is a UX shortcut, not the gate.
 */
export function validateUser(
  values: UserFormValues,
  { requirePassword }: { requirePassword: boolean },
): UserValidationResult {
  const name = values.name.trim();
  const email = values.email.trim();
  const password = values.password;

  const fieldErrors: UserFieldErrors = {};

  if (name.length < USER_NAME_MIN) {
    fieldErrors.name = `Nome precisa ter pelo menos ${USER_NAME_MIN} caracteres.`;
  } else if (name.length > USER_NAME_MAX) {
    fieldErrors.name = `Nome não pode passar de ${USER_NAME_MAX} caracteres.`;
  }

  if (!isValidEmail(email)) {
    fieldErrors.email = 'Informe um e-mail válido.';
  }

  if (!isUserRole(values.role)) {
    fieldErrors.role = 'Selecione uma função válida.';
  }

  // On edit an empty field means "unchanged"; on create it is required.
  if (requirePassword || password !== '') {
    if (password.length < PASSWORD_MIN_LENGTH) {
      fieldErrors.password = `Senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
    } else if (password.length > PASSWORD_MAX_LENGTH) {
      fieldErrors.password = `Senha não pode passar de ${PASSWORD_MAX_LENGTH} caracteres.`;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { valid: false, fieldErrors };
  }

  return {
    valid: true,
    data: { name, email, role: values.role as UserRole, password },
  };
}
