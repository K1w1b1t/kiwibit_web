/**
 * Navigation entries for the admin area.
 *
 * An item is only added here in the same change that creates its route —
 * otherwise the nav links to a 404.
 */
export type AdminNavItem = {
  label: string;
  href: string;
  /** When set, only these roles may see the navigation entry. */
  roles?: readonly UserRole[];
  /** When true, only an exact pathname match counts as active. */
  exact?: boolean;
};

const ADMIN_ONLY_ROLES: readonly UserRole[] = ['admin', 'editor', 'member_manager'];

export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  { label: 'Dashboard', href: '/admin', exact: true },
  { label: 'Blog', href: '/admin/posts' },
  { label: 'Projetos', href: '/admin/projects', roles: ADMIN_ONLY_ROLES },
  { label: 'Equipe', href: '/admin/members', roles: ADMIN_ONLY_ROLES },
  { label: 'Usuários', href: '/admin/users' },
];

export function isVisibleNavItem(role: UserRole, item: AdminNavItem): boolean {
  return item.roles === undefined || item.roles.includes(role);
}

/**
 * Whether `href` should be highlighted for the current `pathname`.
 *
 * Section entries match by prefix so nested routes (`/admin/members/new`) keep
 * their section active. `/admin` must be exact, otherwise it would match every
 * admin route.
 */
export function isActiveNavItem(pathname: string, item: AdminNavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
import type { UserRole } from '@prisma/client';
