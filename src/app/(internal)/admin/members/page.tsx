// src/app/admin/members/page.tsx
import Link from 'next/link';
import { prisma } from '@/shared/lib/prisma';
import { requireAdminPageSession } from '@/shared/lib/page-auth';
import { AdminMembersTable } from '@/features/admin/members/ui/admin-members-table';
import { AdminPageShell } from '@/shared/ui/admin-page-shell';
import { parseLimitParam, parsePageParam } from '@/shared/lib/pagination';

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; limit?: string }>;
}) {
  await requireAdminPageSession();

  const { page: pageParam, limit: limitParam } = await searchParams;
  const pageSize = parseLimitParam(limitParam);
  const page = parsePageParam(pageParam);

  const where = {};
  const [members, total] = await Promise.all([
    prisma.member.findMany({
      select: {
        id: true,
        name: true,
        updatedAt: true,
        user: { select: { role: true } },
      },
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.member.count({ where }),
  ]);

  return (
    <AdminPageShell
      title="Membros"
      action={
        <Link
          href="/admin/members/new"
          className="rounded-full bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-black transition hover:bg-white/90"
        >
          Novo membro
        </Link>
      }
    >
      <AdminMembersTable members={members} page={page} total={total} pageSize={pageSize} />
    </AdminPageShell>
  );
}
