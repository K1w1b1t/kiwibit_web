import type { ReactNode } from 'react';

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  align?: 'left' | 'center';
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = 'left',
}: SectionHeadingProps) {
  const isCentered = align === 'center';

  return (
    <div
      className={`mb-10 flex flex-col gap-4 ${
        isCentered ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between'
      }`}
    >
      <div className={isCentered ? 'max-w-2xl' : 'max-w-2xl'}>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-black uppercase leading-[0.95] tracking-[-0.03em] sm:text-4xl">
          {title}
        </h2>
        {description && <p className="mt-4 text-base text-white/70">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
