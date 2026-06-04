// src/features/admin/members/ui/admin-members-table.tsx
import Link from 'next/link';
import type { UserRole } from '@prisma/client';

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
};

const LIMIT_OPTIONS = [10, 20, 50] as const;

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function AdminMembersTable({ members, page: rawPage, total, pageSize }: Props) {
  const page = Math.max(1, rawPage);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  if (members.length === 0) {
    return (
      <div className="card-glow animate-fade-up rounded-2xl border border-white/10 bg-[#0e0e0e] p-8 text-center">
        <p className="text-sm text-white/50">Nenhum membro cadastrado.</p>
        <Link
          href="/admin/members/new"
          className="mt-4 inline-block rounded-full border border-white/20 px-5 py-2 text-xs uppercase tracking-[0.14em] text-white/70 transition hover:border-white/50 hover:text-white"
        >
          Criar primeiro membro
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-up delay-100">
      <div className="mb-3 flex items-center gap-1 text-xs text-white/40">
        <span className="mr-1">Por página:</span>
        {LIMIT_OPTIONS.map((opt) => (
          <Link
            key={opt}
            href={`?page=1&limit=${opt}`}
            className={`rounded-full px-3 py-1 transition ${
              opt === pageSize
                ? 'border border-white/30 text-white/80'
                : 'border border-white/10 hover:border-white/25 hover:text-white/60'
            }`}
          >
            {opt}
          </Link>
        ))}
        <span className="ml-2 text-white/25">{total} total</span>
      </div>

      <div className="card-glow overflow-hidden rounded-2xl border border-white/10 bg-[#0e0e0e]">
        <div className="grid grid-cols-[1fr_140px_140px_80px] border-b border-white/10 bg-[#141414] px-4 py-3">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-white/40">
            Nome
          </span>
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-white/40">
            Função
          </span>
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-white/40">
            Atualizado em
          </span>
          <span className="text-right text-xs font-medium uppercase tracking-[0.14em] text-white/40">
            Ações
          </span>
        </div>

        {members.map((member, index) => (
          <Link
            key={member.id}
            href={`/admin/members/${member.id}/edit`}
            className={`grid grid-cols-[1fr_140px_140px_80px] items-center px-4 py-3 text-sm transition hover:bg-white/[0.04] ${
              index < members.length - 1 ? 'border-b border-white/[0.06]' : ''
            }`}
          >
            <span className="text-white/90">{member.name}</span>
            <span className="text-white/50">{member.user?.role ?? '—'}</span>
            <span className="text-white/50">{formatDate(member.updatedAt)}</span>
            <span className="text-right text-xs uppercase tracking-[0.12em] text-white/30 transition group-hover:text-white">
              Editar →
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-white/40">
        <span>
          Página {page} de {totalPages}
        </span>
        <div className="flex gap-2">
          {hasPrev ? (
            <Link
              href={`?page=${page - 1}&limit=${pageSize}`}
              className="rounded-full border border-white/15 px-4 py-1.5 uppercase tracking-[0.12em] transition hover:border-white/40 hover:text-white/80"
            >
              Anterior
            </Link>
          ) : (
            <span className="cursor-not-allowed rounded-full border border-white/5 px-4 py-1.5 uppercase tracking-[0.12em] opacity-30">
              Anterior
            </span>
          )}
          {hasNext ? (
            <Link
              href={`?page=${page + 1}&limit=${pageSize}`}
              className="rounded-full border border-white/15 px-4 py-1.5 uppercase tracking-[0.12em] transition hover:border-white/40 hover:text-white/80"
            >
              Próxima
            </Link>
          ) : (
            <span className="cursor-not-allowed rounded-full border border-white/5 px-4 py-1.5 uppercase tracking-[0.12em] opacity-30">
              Próxima
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
