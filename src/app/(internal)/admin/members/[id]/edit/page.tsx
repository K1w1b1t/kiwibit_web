import { notFound } from 'next/navigation';
import { prisma } from '@/shared/lib/prisma';
import { requireAdminPageSession } from '@/shared/lib/page-auth';
import { AdminMemberForm } from '@/features/admin/members/ui/admin-member-form';
import { MemberAccountPanel } from '@/features/admin/members/ui/member-account-panel';
import { DeleteButton } from '@/shared/ui/delete-button';
import { AdminPageShell } from '@/shared/ui/admin-page-shell';

type Params = { params: Promise<{ id: string }> };

export default async function EditMemberPage({ params }: Params) {
  const session = await requireAdminPageSession();

  const { id } = await params;

  const member = await prisma.member.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      bio: true,
      avatarUrl: true,
      // The screen must always show whether an account is associated.
      user: { select: { id: true, email: true, role: true } },
    },
  });

  if (!member) notFound();

  return (
    <AdminPageShell
      title="Editar Membro"
      width="form"
      description="Atualize os dados do membro. As alterações são salvas na hora."
      action={
        <DeleteButton
          endpoint={`/api/admin/members/${member.id}`}
          resourceLabel="membro"
          redirectTo="/admin/members"
        />
      }
    >
      <AdminMemberForm initial={member} />
      <MemberAccountPanel
        memberId={member.id}
        account={member.user}
        canAssignPrivileged={session.user.role === 'admin'}
      />
    </AdminPageShell>
  );
}
