import type { ReactNode } from 'react';
import type { UserRole } from '@prisma/client';
import { AdminNav } from '@/widgets/admin-shell/admin-nav';

/**
 * Chrome shared by every admin screen: background, sticky nav and the <main>
 * landmark. Pages own only their content — see `AdminPageShell` for the
 * per-page header.
 */
export function AdminShell({ children, role }: Readonly<{ children: ReactNode; role: UserRole }>) {
  return (
    <div className="architectural-grid min-h-screen bg-[#050505] text-white">
      <AdminNav role={role} />
      <main>{children}</main>
    </div>
  );
}
