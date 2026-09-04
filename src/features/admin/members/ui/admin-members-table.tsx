import Link from 'next/link';
import type { UserRole } from '@prisma/client';
import { formatDate } from '@/shared/lib/format-date';
import { ROLE_LABELS } from '@/shared/lib/roles';
import { DataTable, type Column } from '@/shared/ui/data-table';
import { EmptyState } from '@/shared/ui/empty-state';
import { PageSizeSelector, Pagination } from '@/shared/ui/pagination';

export type MemberRow = {
  id: string;
  name: string;
  updatedAt: Date;
  user: { role: UserRole } | null;
};

type Props = {
  members: MemberRow[];
  page: number;
  total: number;
  pageSize: number;
  canCreate?: boolean;
};

const COLUMNS: ReadonlyArray<Column<MemberRow>> = [
  {
    key: 'name',
    header: 'Nome',
    cell: (member) => <span className="text-white/90">{member.name}</span>,
  },
  {
    key: 'role',
    header: 'Função',
    width: 'w-[160px]',
    cell: (member) => (
      <span className="text-white/50">
        {member.user ? ROLE_LABELS[member.user.role] : 'Sem conta'}
      </span>
    ),
  },
  {
    key: 'updatedAt',
    header: 'Atualizado em',
    width: 'w-[140px]',
    cell: (member) => <span className="text-white/50">{formatDate(member.updatedAt)}</span>,
  },
  {
    key: 'actions',
    header: 'Ações',
    align: 'right',
    width: 'w-[100px]',
    cell: (member) => (
      <Link
        href={`/admin/members/${member.id}/edit`}
        className="text-xs uppercase tracking-[0.12em] text-white/40 transition hover:text-white"
      >
        Editar →
      </Link>
    ),
  },
];

export function AdminMembersTable({
  members,
  page: rawPage,
  total,
  pageSize,
  canCreate = true,
}: Props) {
  const page = Math.max(1, rawPage);

  if (members.length === 0) {
    return (
      <EmptyState
        message="Nenhum membro cadastrado."
        action={
          canCreate ? (
            <Link
              href="/admin/members/new"
              className="inline-block rounded-full border border-white/20 px-5 py-2 text-xs uppercase tracking-[0.14em] text-white/70 transition hover:border-white/50 hover:text-white"
            >
              Criar primeiro membro
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="animate-fade-up delay-100">
      <PageSizeSelector pageSize={pageSize} total={total} />
      <DataTable columns={COLUMNS} rows={members} rowKey={(member) => member.id} />
      <Pagination page={page} total={total} pageSize={pageSize} />
    </div>
  );
}
