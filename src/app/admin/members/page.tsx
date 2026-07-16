// src/app/admin/members/page.tsx
// TODO: restore auth check when login flow is ready
import Link from 'next/link';
import { prisma } from '@/shared/lib/prisma';
import { AdminMembersTable } from '@/features/admin/members/ui/admin-members-table';

const VALID_LIMITS = [10, 20, 50] as const;
type Limit = (typeof VALID_LIMITS)[number];

function parseLimit(raw: string | undefined): Limit {
  const n = Number(raw);
  return (VALID_LIMITS as readonly number[]).includes(n) ? (n as Limit) : 20;
}

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; limit?: string }>;
}) {
  const { page: pageParam, limit: limitParam } = await searchParams;
  const pageSize = parseLimit(limitParam);
  const page = Math.max(1, Number(pageParam ?? 1) || 1);

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
    <div className="architectural-grid min-h-screen bg-[#050505] px-6 py-16 text-white sm:px-10 lg:px-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/40">Admin</p>
            <h1 className="mt-2 text-4xl font-black uppercase tracking-[-0.03em]">Membros</h1>
          </div>
          <Link
            href="/admin/members/new"
            className="rounded-full bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-black transition hover:bg-white/90"
          >
            Novo membro
          </Link>
        </div>

        <AdminMembersTable members={members} page={page} total={total} pageSize={pageSize} />
      </div>
    </div>
  );
}
