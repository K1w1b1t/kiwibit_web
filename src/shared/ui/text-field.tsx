import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/cn';
import {
  FIELD_CONTROL_CLASS,
  FIELD_ERROR_CLASS,
  FIELD_HINT_CLASS,
  FIELD_LABEL_CLASS,
} from '@/shared/ui/field-classes';

type Props = Omit<ComponentProps<'input'>, 'className'> & {
  id: string;
  label: string;
  required?: boolean;
  /** Message shown below the control; also flips `aria-invalid`. */
  error?: string;
  hint?: string;
  className?: string;
};

export function TextField({
  id,
  label,
  required = false,
  error,
  hint,
  className,
  ...props
}: Props) {
  return (
    <div className={className}>
      <label htmlFor={id} className={FIELD_LABEL_CLASS}>
        {label} {required && <span aria-hidden="true">*</span>}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(FIELD_CONTROL_CLASS, error && 'border-amber-300/40')}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className={FIELD_ERROR_CLASS}>
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${id}-hint`} className={FIELD_HINT_CLASS}>
          {hint}
        </p>
      )}
    </div>
  );
}
