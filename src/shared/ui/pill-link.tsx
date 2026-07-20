import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

type PillVariant = 'solid' | 'outline' | 'accent';

const VARIANT_CLASSES: Record<PillVariant, string> = {
  solid: 'bg-white text-black hover:bg-white/85',
  outline: 'border border-white/35 text-white hover:border-white/80',
  accent: 'bg-accent text-black hover:bg-accent/85',
};

interface PillLinkProps extends Omit<ComponentProps<typeof Link>, 'className'> {
  variant?: PillVariant;
  children: ReactNode;
  className?: string;
}

/** Shared rounded-pill link used across the marketing site. */
export function PillLink({ variant = 'solid', children, className = '', ...props }: PillLinkProps) {
  return (
    <Link
      {...props}
      className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] transition ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}
