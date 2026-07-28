import { AdminMemberForm } from '@/features/admin/members/ui/admin-member-form';
import { requireAdminPageSession } from '@/shared/lib/page-auth';
import { AdminPageShell } from '@/shared/ui/admin-page-shell';

export default async function NewMemberPage() {
  await requireAdminPageSession();

  return (
    <AdminPageShell title="Novo Membro" width="form">
      <AdminMemberForm />
    </AdminPageShell>
  );
}
