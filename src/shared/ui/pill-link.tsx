import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { PILL_VARIANT_CLASSES, type PillVariant } from '@/shared/ui/pill-variants';

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
      className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] transition ${PILL_VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}
