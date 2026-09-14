'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { UserRole } from '@prisma/client';
import { SignOutButton } from '@/features/auth/ui/sign-out-button';
import { ADMIN_NAV_ITEMS, isActiveNavItem } from '@/widgets/admin-shell/model/admin-nav-items';

const LINK_BASE =
  'shrink-0 rounded-full px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] transition';
const LINK_ACTIVE = 'bg-white/10 text-white';
const LINK_IDLE = 'text-white/60 hover:bg-white/5 hover:text-white';

export function AdminNav({ role }: Readonly<{ role: UserRole }>) {
  const pathname = usePathname();
  const navItems =
    role === 'member'
      ? ADMIN_NAV_ITEMS.filter(
          (item) =>
            item.href === '/admin' ||
            item.href === '/admin/posts' ||
            item.href === '/admin/members' ||
            item.href === '/admin/users',
        )
      : ADMIN_NAV_ITEMS;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-3 sm:px-10 lg:px-16">
        <Link
          href="/admin"
          className="shrink-0 text-sm font-black uppercase tracking-[-0.02em] text-white"
        >
          Kiwibit
        </Link>

        <nav aria-label="Administração" className="flex flex-1 gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const active = isActiveNavItem(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`${LINK_BASE} ${active ? LINK_ACTIVE : LINK_IDLE}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <SignOutButton />
      </div>
    </header>
  );
}
