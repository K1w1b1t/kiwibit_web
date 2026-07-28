import Link from 'next/link';
import { prisma } from '@/shared/lib/prisma';
import { requireAdminPageSession } from '@/shared/lib/page-auth';
import { parseLimitParam, parsePageParam } from '@/shared/lib/pagination';
import { AdminPageShell } from '@/shared/ui/admin-page-shell';
import { AdminUsersTable } from '@/features/admin/users/ui/admin-users-table';

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; limit?: string }>;
}) {
  await requireAdminPageSession();

  const { page: pageParam, limit: limitParam } = await searchParams;
  const pageSize = parseLimitParam(limitParam);
  const page = parsePageParam(pageParam);

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      // password is deliberately absent.
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
  ]);

  return (
    <AdminPageShell
      title="Usuários"
      description="Contas que podem entrar no sistema."
      action={
        <Link
          href="/admin/users/new"
          className="rounded-full bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-black transition hover:bg-white/90"
        >
          Novo usuário
        </Link>
      }
    >
      <AdminUsersTable users={users} page={page} total={total} pageSize={pageSize} />
    </AdminPageShell>
  );
}
