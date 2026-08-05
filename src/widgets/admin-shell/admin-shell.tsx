import type { ReactNode } from 'react';
import { AdminNav } from '@/widgets/admin-shell/admin-nav';

/**
 * Chrome shared by every admin screen: background, sticky nav and the <main>
 * landmark. Pages own only their content — see `AdminPageShell` for the
 * per-page header.
 */
export function AdminShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="architectural-grid min-h-screen bg-[#050505] text-white">
      <AdminNav />
      <main>{children}</main>
    </div>
  );
}
