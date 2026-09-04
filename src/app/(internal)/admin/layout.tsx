import type { ReactNode } from 'react';
import { requirePanelPageSession } from '@/shared/lib/page-auth';
import { AdminShell } from '@/widgets/admin-shell/admin-shell';

/**
 * Guards the whole `/admin` subtree and provides the shared chrome.
 *
 * Administrator-only pages keep their own `requireAdminPageSession()` call:
 * the layout guard allows the restricted shared panel, while each page still
 * declares its required access level at its entrypoint.
 */
export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await requirePanelPageSession();

  return <AdminShell role={session.user.role}>{children}</AdminShell>;
}
