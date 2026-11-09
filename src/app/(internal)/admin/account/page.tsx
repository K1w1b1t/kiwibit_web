import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/shared/lib/prisma';
import { requirePanelPageSession } from '@/shared/lib/page-auth';
import { AdminPageShell } from '@/shared/ui/admin-page-shell';
import { AdminUserForm } from '@/features/admin/users/ui/admin-user-form';
import { UserPasswordPanel } from '@/features/admin/users/ui/user-password-panel';

export default async function AccountPage() {
  const session = await requirePanelPageSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, member: { select: { id: true } } },
  });
  if (!user) notFound();
  if (user.member) redirect(`/admin/members/${user.member.id}/edit`);
  return (
    <AdminPageShell title="Minha conta" width="form">
      <AdminUserForm initial={user} canAssignPrivileged={false} canChangeRole={false} />
      <UserPasswordPanel userId={user.id} userEmail={user.email} />
    </AdminPageShell>
  );
}
