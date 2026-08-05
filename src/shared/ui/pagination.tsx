import Link from 'next/link';
import { countTotalPages, LIMIT_OPTIONS } from '@/shared/lib/pagination';
import { cn } from '@/shared/lib/cn';

type Props = {
  page: number;
  total: number;
  pageSize: number;
  /** Extra querystring params to preserve across page changes (e.g. search). */
  extraParams?: Record<string, string>;
};

const NAV_LINK =
  'rounded-full border border-white/15 px-4 py-1.5 uppercase tracking-[0.12em] transition hover:border-white/40 hover:text-white/80';
const NAV_DISABLED =
  'cursor-not-allowed rounded-full border border-white/5 px-4 py-1.5 uppercase tracking-[0.12em] opacity-30';

function buildHref(page: number, limit: number, extra?: Record<string, string>): string {
  const params = new URLSearchParams({ ...extra, page: String(page), limit: String(limit) });
  return `?${params.toString()}`;
}

/** Page-size selector rendered above a list. */
export function PageSizeSelector({ pageSize, total, extraParams }: Readonly<Omit<Props, 'page'>>) {
  return (
    <div className="mb-3 flex items-center gap-1 text-xs text-white/40">
      <span className="mr-1">Por página:</span>
      {LIMIT_OPTIONS.map((opt) => (
        <Link
          key={opt}
          href={buildHref(1, opt, extraParams)}
          aria-current={opt === pageSize ? 'true' : undefined}
          className={cn(
            'rounded-full px-3 py-1 transition',
            opt === pageSize
              ? 'border border-white/30 text-white/80'
              : 'border border-white/10 hover:border-white/25 hover:text-white/60',
          )}
        >
          {opt}
        </Link>
      ))}
      <span className="ml-2 text-white/25">{total} total</span>
    </div>
  );
}

/** Prev/next controls rendered below a list. */
export function Pagination({ page, total, pageSize, extraParams }: Readonly<Props>) {
  const totalPages = countTotalPages(total, pageSize);
  const current = Math.min(Math.max(1, page), totalPages);
  const hasPrev = current > 1;
  const hasNext = current < totalPages;

  return (
    <nav
      aria-label="Paginação"
      className="mt-4 flex items-center justify-between text-xs text-white/40"
    >
      <span>
        Página {current} de {totalPages}
      </span>
      <div className="flex gap-2">
        {hasPrev ? (
          <Link href={buildHref(current - 1, pageSize, extraParams)} className={NAV_LINK}>
            Anterior
          </Link>
        ) : (
          <span className={NAV_DISABLED}>Anterior</span>
        )}
        {hasNext ? (
          <Link href={buildHref(current + 1, pageSize, extraParams)} className={NAV_LINK}>
            Próxima
          </Link>
        ) : (
          <span className={NAV_DISABLED}>Próxima</span>
        )}
      </div>
    </nav>
  );
}
