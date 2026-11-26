'use client';

import { useRef, useState, type MouseEvent, type ReactNode, type RefObject } from 'react';
import { Eye, X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { FIELD_ERROR_CLASS, FIELD_LABEL_CLASS } from './field-classes';

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  preview: ReactNode;
  onPreviewChange?: (open: boolean) => void;
  toolbar?: ReactNode;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  variant?: 'article' | 'plain';
  disabled?: boolean;
  autoFocus?: boolean;
  maxLength?: number;
  placeholder?: string;
  describedBy?: string;
  error?: string;
};

export function TextPreviewField({
  id,
  label,
  value,
  onChange,
  preview,
  onPreviewChange,
  toolbar,
  inputRef,
  variant = 'plain',
  disabled,
  autoFocus,
  maxLength,
  placeholder,
  describedBy,
  error,
}: Readonly<Props>) {
  const localRef = useRef<HTMLTextAreaElement>(null);
  const input = inputRef ?? localRef;
  const [previewOpen, setPreviewOpen] = useState(false);
  const selection = useRef<Pick<
    HTMLTextAreaElement,
    'selectionStart' | 'selectionEnd' | 'selectionDirection'
  > | null>(null);
  const previewLabel = previewOpen ? 'Fechar prévia' : 'Abrir prévia';
  const height = variant === 'article' ? 'min-h-[max(18rem,50dvh)]' : 'min-h-48';

  function togglePreview(event: MouseEvent<HTMLButtonElement>) {
    const textarea = input.current;
    if (textarea && !previewOpen) {
      const { selectionStart, selectionEnd, selectionDirection } = textarea;
      selection.current = { selectionStart, selectionEnd, selectionDirection };
    }
    const next = !previewOpen;
    if (next) event.currentTarget.focus({ preventScroll: true });
    setPreviewOpen(next);
    onPreviewChange?.(next);
    if (!next && !disabled) {
      requestAnimationFrame(() => {
        input.current?.focus();
        if (selection.current) {
          const { selectionStart, selectionEnd, selectionDirection } = selection.current;
          input.current?.setSelectionRange(selectionStart, selectionEnd, selectionDirection);
        }
      });
    }
  }

  return (
    <div className="min-w-0">
      <label htmlFor={id} className={FIELD_LABEL_CLASS}>
        {label}
      </label>
      <div
        className={cn(
          'rounded-xl border border-white/15 bg-black/30 focus-within:border-white/40',
          error && 'border-amber-300/40',
        )}
      >
        <div className="flex min-h-14 items-start gap-2 rounded-t-xl border-b border-white/10 bg-white/5 p-2">
          {!previewOpen && toolbar}
          <button
            type="button"
            aria-label={previewLabel}
            aria-expanded={previewOpen}
            title={previewLabel}
            onClick={togglePreview}
            className="ml-auto inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-white/80 hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {previewOpen ? <X aria-hidden size={19} /> : <Eye aria-hidden size={19} />}
          </button>
        </div>
        <textarea
          id={id}
          ref={input}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          hidden={previewOpen}
          disabled={disabled}
          autoFocus={autoFocus}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [describedBy, error && `${id}-error`].filter(Boolean).join(' ') || undefined
          }
          className={cn(
            'w-full resize-y rounded-b-xl p-4 align-top text-base text-white outline-none sm:text-sm',
            variant === 'article' && 'font-mono',
            height,
          )}
        />
        {previewOpen && (
          <div
            role="region"
            aria-label={`Prévia de ${label.toLowerCase()}`}
            className={cn('wrap-anywhere p-4', height)}
          >
            {preview}
          </div>
        )}
      </div>
      {error && (
        <p role="alert" id={`${id}-error`} className={FIELD_ERROR_CLASS}>
          {error}
        </p>
      )}
    </div>
  );
}
