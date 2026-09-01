import { notFound } from 'next/navigation';
import { prisma } from '@/shared/lib/prisma';
import { requireAdminPageSession } from '@/shared/lib/page-auth';
import { AdminMemberForm } from '@/features/admin/members/ui/admin-member-form';
import { MemberAccountPanel } from '@/features/admin/members/ui/member-account-panel';
import { MemberLinkedinPanel } from '@/features/admin/members/ui/member-linkedin-panel';
import { isLinkedInAccessTokenExpired, scopeAllowsAutoPost } from '@/shared/lib/linkedin';
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
      avatarPath: true,
      // The screen must always show whether an account is associated.
      user: { select: { id: true, email: true, role: true } },
      // Never select the token here — only whether/when it was connected, the
      // granted scope (to know if auto-post is available), and the opt-in state.
      linkedinConnection: {
        select: {
          connectedAt: true,
          scope: true,
          autoPostEnabled: true,
          accessTokenExpiry: true,
          linkedinPersonId: true,
        },
      },
    },
  });

  if (!member) notFound();

  // "Each connects their own": the panel is actionable only for the member
  // linked to the signed-in user's account.
  const isLinkedinOwner = member.user?.id === session.user.id;
  const linkedinConnection = member.linkedinConnection ?? null;
  const canAutoPost =
    linkedinConnection !== null &&
    scopeAllowsAutoPost(linkedinConnection.scope) &&
    !isLinkedInAccessTokenExpired(linkedinConnection.accessTokenExpiry) &&
    linkedinConnection.linkedinPersonId !== null;

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
      <MemberLinkedinPanel
        memberId={member.id}
        isOwner={isLinkedinOwner}
        isConnected={linkedinConnection !== null}
        connectedAt={linkedinConnection?.connectedAt.toISOString() ?? null}
        canAutoPost={canAutoPost}
        autoPostEnabled={linkedinConnection?.autoPostEnabled ?? false}
      />
    </AdminPageShell>
  );
}
