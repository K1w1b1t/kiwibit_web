import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import {
  PILL_BASE,
  PILL_SIZE_CLASSES,
  PILL_VARIANT_CLASSES,
  type PillSize,
  type PillVariant,
} from '@/shared/ui/pill-variants';

type Props = Omit<ComponentProps<'button'>, 'className'> & {
  variant?: PillVariant;
  size?: PillSize;
  /** Renders the loading label and applies the scanning sweep. */
  isLoading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
  className?: string;
};

/**
 * The admin counterpart to `PillLink`: same visual language, but an actual
 * `<button>` so it can submit a form.
 */
export function Button({
  variant = 'solid',
  size = 'md',
  isLoading = false,
  loadingLabel,
  children,
  className,
  disabled,
  type = 'button',
  ...props
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={cn(
        PILL_BASE,
        PILL_SIZE_CLASSES[size],
        PILL_VARIANT_CLASSES[variant],
        isLoading && 'btn-scanning',
        className,
      )}
      {...props}
    >
      {isLoading && loadingLabel ? loadingLabel : children}
    </button>
  );
}
