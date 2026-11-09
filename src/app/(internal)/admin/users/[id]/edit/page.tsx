import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/shared/lib/prisma';
import { requirePanelPageSession } from '@/shared/lib/page-auth';
export default async function EditUserPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const session = await requirePanelPageSession();
  const { id } = await params;
  if (session.user.role === 'member' && session.user.id !== id) redirect('/admin/members');
  const user = await prisma.user.findUnique({
    where: { id },
    select: { member: { select: { id: true } } },
  });
  if (!user) notFound();
  if (user.member) redirect(`/admin/members/${user.member.id}/edit`);
  if (session.user.id === id) redirect('/admin/account');
  redirect('/admin/members');
}
