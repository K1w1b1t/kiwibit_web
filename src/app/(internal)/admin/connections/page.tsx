import { requirePanelPageSession } from '@/shared/lib/page-auth';
import { AdminPageShell } from '@/shared/ui/admin-page-shell';
import { MemberMcpPanel } from '@/features/mcp-connections/ui/member-mcp-panel';

export default async function ConnectionsPage() {
  await requirePanelPageSession();
  return (
    <AdminPageShell title="Minhas conexões" width="form">
      <MemberMcpPanel />
    </AdminPageShell>
  );
}
