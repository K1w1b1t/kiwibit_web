import type { UserRole } from '@prisma/client';

/** Every role the schema allows, in ascending order of privilege. */
export const USER_ROLES = ['member', 'member_manager', 'editor', 'admin'] as const;

/** Roles com acesso à área administrativa (páginas /admin e APIs /api/admin). */
export const ADMIN_ROLES = new Set<UserRole>(['admin', 'editor', 'member_manager']);

/**
 * Roles that only an `admin` may assign. Without this, an `editor` could mint
 * another `admin` via POST /api/admin/users and escalate privileges.
 */
export const PRIVILEGED_ROLES = new Set<UserRole>(['admin', 'editor', 'member_manager']);

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  member_manager: 'Gestor de equipe',
  member: 'Membro',
};

/** Narrows unknown input to a schema role — an invalid cast reaches Postgres and 500s. */
export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
}

export function isPrivilegedRole(role: UserRole): boolean {
  return PRIVILEGED_ROLES.has(role);
}
