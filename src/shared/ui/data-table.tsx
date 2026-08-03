import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export type Column<T> = {
  /** Stable key for React and for column identity. */
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right';
  /** Tailwind width utility, e.g. `w-[140px]`. */
  width?: string;
};

type Props<T> = {
  columns: ReadonlyArray<Column<T>>;
  rows: readonly T[];
  rowKey: (row: T) => string;
  /** Rendered instead of the table when there are no rows. */
  emptyState?: ReactNode;
};

const HEAD_CELL = 'px-4 py-3 text-xs font-medium uppercase tracking-[0.14em] text-white/40';

/**
 * A real `<table>`, not a CSS grid: Tailwind cannot generate dynamic
 * `grid-cols-[…]` from props, and rows need to host action buttons (a
 * whole-row `<a>` would swallow them).
 *
 * Row navigation is expressed as an actions column by the caller rather than
 * baked in here.
 */
export function DataTable<T>({ columns, rows, rowKey, emptyState }: Readonly<Props<T>>) {
  if (rows.length === 0 && emptyState) return <>{emptyState}</>;

  return (
    <div className="card-glow animate-fade-up delay-100 overflow-x-auto rounded-2xl border border-white/10 bg-[#0e0e0e]">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-white/10 bg-[#141414]">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(HEAD_CELL, column.align === 'right' && 'text-right', column.width)}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className="border-b border-white/[0.06] text-sm transition last:border-b-0 hover:bg-white/[0.04]"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn('px-4 py-3', column.align === 'right' && 'text-right')}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
