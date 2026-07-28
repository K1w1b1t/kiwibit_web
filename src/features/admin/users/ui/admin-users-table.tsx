import Link from 'next/link';
import type { UserRole } from '@prisma/client';
import { formatDate } from '@/shared/lib/format-date';
import { DataTable, type Column } from '@/shared/ui/data-table';
import { EmptyState } from '@/shared/ui/empty-state';
import { PageSizeSelector, Pagination } from '@/shared/ui/pagination';
import { RoleBadge } from './role-badge';

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
};

type Props = {
  users: UserRow[];
  page: number;
  total: number;
  pageSize: number;
};

const COLUMNS: ReadonlyArray<Column<UserRow>> = [
  {
    key: 'name',
    header: 'Nome',
    cell: (user) => <span className="text-white/90">{user.name}</span>,
  },
  {
    key: 'email',
    header: 'E-mail',
    cell: (user) => <span className="text-white/50">{user.email}</span>,
  },
  {
    key: 'role',
    header: 'Função',
    width: 'w-[180px]',
    cell: (user) => <RoleBadge role={user.role} />,
  },
  {
    key: 'createdAt',
    header: 'Criado em',
    width: 'w-[130px]',
    cell: (user) => <span className="text-white/50">{formatDate(user.createdAt)}</span>,
  },
  {
    key: 'actions',
    header: 'Ações',
    align: 'right',
    width: 'w-[100px]',
    cell: (user) => (
      <Link
        href={`/admin/users/${user.id}/edit`}
        className="text-xs uppercase tracking-[0.12em] text-white/40 transition hover:text-white"
      >
        Editar →
      </Link>
    ),
  },
];

export function AdminUsersTable({ users, page, total, pageSize }: Props) {
  if (users.length === 0) {
    return (
      <EmptyState
        message="Nenhum usuário encontrado."
        action={
          <Link
            href="/admin/users/new"
            className="inline-block rounded-full border border-white/20 px-5 py-2 text-xs uppercase tracking-[0.14em] text-white/70 transition hover:border-white/50 hover:text-white"
          >
            Criar usuário
          </Link>
        }
      />
    );
  }

  return (
    <div className="animate-fade-up delay-100">
      <PageSizeSelector pageSize={pageSize} total={total} />
      <DataTable columns={COLUMNS} rows={users} rowKey={(user) => user.id} />
      <Pagination page={page} total={total} pageSize={pageSize} />
    </div>
  );
}
