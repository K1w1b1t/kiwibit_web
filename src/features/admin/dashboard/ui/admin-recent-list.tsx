import Link from 'next/link';
import type { DashboardItem } from '@/features/admin/dashboard/model/to-dashboard-items';

type Props = {
  title: string;
  items: readonly DashboardItem[];
  emptyMessage: string;
  /** Link to the full list, when that screen exists. */
  seeAllHref?: string;
  delayClass?: string;
};

function Row({ item }: Readonly<{ item: DashboardItem }>) {
  const content = (
    <>
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm text-white/90">{item.title}</span>
        {item.tag && (
          <span className="shrink-0 rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-white/40">
            {item.tag}
          </span>
        )}
      </span>
      <span className="shrink-0 text-xs text-white/40">{item.meta}</span>
    </>
  );

  if (!item.href) {
    return <div className="flex items-center justify-between gap-3 px-4 py-3">{content}</div>;
  }

  return (
    <Link
      href={item.href}
      className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-white/[0.04]"
    >
      {content}
    </Link>
  );
}

export function AdminRecentList({
  title,
  items,
  emptyMessage,
  seeAllHref,
  delayClass = '',
}: Readonly<Props>) {
  return (
    <section
      className={`card-glow animate-fade-up ${delayClass} overflow-hidden rounded-2xl border border-white/10 bg-[#0e0e0e]`}
    >
      <header className="flex items-center justify-between border-b border-white/10 bg-[#141414] px-4 py-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-white/40">{title}</h2>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="text-xs uppercase tracking-[0.12em] text-white/40 transition hover:text-white"
          >
            Ver todos →
          </Link>
        )}
      </header>

      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-white/40">{emptyMessage}</p>
      ) : (
        <div className="divide-y divide-white/[0.06]">
          {items.map((item) => (
            <Row key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
