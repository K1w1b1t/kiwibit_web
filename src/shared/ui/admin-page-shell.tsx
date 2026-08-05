import type { ReactNode } from 'react';

type Props = {
  title: string;
  /** Small caps label above the title. */
  eyebrow?: string;
  description?: string;
  /** Right-aligned slot for the primary action of the screen. */
  action?: ReactNode;
  /** `form` narrows the column for single-column forms. */
  width?: 'wide' | 'form';
  children: ReactNode;
};

const WIDTHS = {
  wide: 'mx-auto max-w-5xl',
  form: 'mx-auto max-w-xl',
} as const;

/**
 * Per-page header and column for admin screens. Replaces the page chrome that
 * used to be copy-pasted into every admin page and form.
 *
 * Note there is no `min-h-screen` here: `AdminShell` already owns the viewport
 * height, and repeating it under the sticky nav produces a double-viewport
 * scroll.
 */
export function AdminPageShell({
  title,
  eyebrow = 'Admin',
  description,
  action,
  width = 'wide',
  children,
}: Readonly<Props>) {
  return (
    <div className="px-6 py-12 sm:px-10 lg:px-16">
      <div className={WIDTHS[width]}>
        <div className="animate-fade-up mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/40">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-4xl font-black uppercase tracking-[-0.03em]">{title}</h1>
            {description && <p className="mt-2 max-w-prose text-sm text-white/50">{description}</p>}
            <div className="mt-3 h-px w-12 bg-white/20" />
          </div>
          {action}
        </div>

        {children}
      </div>
    </div>
  );
}
