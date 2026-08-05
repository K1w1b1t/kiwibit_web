import { notFound } from 'next/navigation';
import { prisma } from '@/shared/lib/prisma';
import { requireAdminPageSession } from '@/shared/lib/page-auth';
import { AdminPageShell } from '@/shared/ui/admin-page-shell';
import { AdminUserForm } from '@/features/admin/users/ui/admin-user-form';
import { UserPasswordPanel } from '@/features/admin/users/ui/user-password-panel';
import { DeleteButton } from '@/shared/ui/delete-button';

type Params = { params: Promise<{ id: string }> };

export default async function EditUserPage({ params }: Readonly<Params>) {
  const session = await requireAdminPageSession();

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) notFound();

  const isSelf = session.user.id === user.id;

  return (
    <AdminPageShell
      title="Editar Usuário"
      width="form"
      description={isSelf ? 'Esta é a sua própria conta.' : undefined}
      action={
        // The API refuses self-deletion anyway; not offering it avoids a dead end.
        isSelf ? undefined : (
          <DeleteButton
            endpoint={`/api/admin/users/${user.id}`}
            resourceLabel="usuário"
            redirectTo="/admin/users"
          />
        )
      }
    >
      <AdminUserForm initial={user} canAssignPrivileged={session.user.role === 'admin'} />
      <UserPasswordPanel userId={user.id} userEmail={user.email} />
    </AdminPageShell>
  );
}
