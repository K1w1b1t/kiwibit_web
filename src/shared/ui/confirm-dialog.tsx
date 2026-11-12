'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from '@/shared/ui/button';

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loadingLabel?: string;
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
  confirmVariant?: 'solid' | 'danger';
  confirmDisabled?: boolean;
};

/**
 * Native <dialog> so focus trapping, Esc and the backdrop come from the
 * platform instead of a dependency.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  loadingLabel = 'Excluindo...',
  isBusy = false,
  onConfirm,
  onCancel,
  children,
  confirmVariant = 'danger',
  confirmDisabled = false,
}: Readonly<Props>) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (!open) {
      if (dialog.open) dialog.close();
      return;
    }
    const previouslyFocused = document.activeElement;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!isBusy) onCancel();
      }}
      className="card-glow m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#0e0e0e] p-6 text-white backdrop:bg-black/70"
    >
      <h2 id={titleId} className="text-lg font-black uppercase tracking-[-0.02em]">
        {title}
      </h2>
      {description && <p className="mt-2 text-sm text-white/60">{description}</p>}
      {children}

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isBusy}>
          {cancelLabel}
        </Button>
        <Button
          variant={confirmVariant}
          size="sm"
          onClick={onConfirm}
          disabled={confirmDisabled}
          isLoading={isBusy}
          loadingLabel={loadingLabel}
        >
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
