import { notFound } from 'next/navigation';
import { prisma } from '@/shared/lib/prisma';
import { AdminMemberEditForm } from '@/features/admin/members/ui/admin-member-edit-form';

type Params = { params: Promise<{ id: string }> };

export default async function EditMemberPage({ params }: Params) {
  const { id } = await params;

  const member = await prisma.member.findUnique({
    where: { id },
    select: { id: true, name: true, bio: true, avatarUrl: true },
  });

  if (!member) notFound();

  return (
    <main>
      <AdminMemberEditForm initial={member} />
    </main>
  );
}
