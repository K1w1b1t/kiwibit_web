import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/cn';
import {
  FIELD_CONTROL_CLASS,
  FIELD_ERROR_CLASS,
  FIELD_HINT_CLASS,
  FIELD_LABEL_CLASS,
} from '@/shared/ui/field-classes';

export type SelectOption = {
  value: string;
  label: string;
  /** Used to grey out choices the current operator may not assign. */
  disabled?: boolean;
};

type Props = Omit<ComponentProps<'select'>, 'className' | 'children'> & {
  id: string;
  label: string;
  options: readonly SelectOption[];
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
};

export function SelectField({
  id,
  label,
  options,
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
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(FIELD_CONTROL_CLASS, 'appearance-none', error && 'border-amber-300/40')}
        {...props}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className="bg-[#0e0e0e]"
          >
            {option.label}
          </option>
        ))}
      </select>
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
