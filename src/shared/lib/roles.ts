import type { UserRole } from '@prisma/client';

/** Roles com acesso à área administrativa (páginas /admin e APIs /api/admin). */
export const ADMIN_ROLES = new Set<UserRole>(['admin', 'editor', 'member_manager']);
