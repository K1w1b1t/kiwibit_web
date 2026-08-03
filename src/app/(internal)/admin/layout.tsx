import type { ReactNode } from 'react';
import { requireAdminPageSession } from '@/shared/lib/page-auth';
import { AdminShell } from '@/widgets/admin-shell/admin-shell';

/**
 * Guards the whole `/admin` subtree and provides the shared chrome.
 *
 * Individual pages keep their own `requireAdminPageSession()` call: the layout
 * is not a substitute for the per-page guard, since a page can be rendered by
 * other means and AGENTS.md § 4 mandates the server guard at the entrypoint.
 */
export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireAdminPageSession();

  return <AdminShell>{children}</AdminShell>;
}
