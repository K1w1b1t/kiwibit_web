import { requireAdminPageSession } from '@/shared/lib/page-auth';
import { AdminPageShell } from '@/shared/ui/admin-page-shell';
import { AdminUserForm } from '@/features/admin/users/ui/admin-user-form';

export default async function NewUserPage() {
  const session = await requireAdminPageSession();

  return (
    <AdminPageShell title="Novo Usuário" width="form">
      <AdminUserForm canAssignPrivileged={session.user.role === 'admin'} />
    </AdminPageShell>
  );
}
