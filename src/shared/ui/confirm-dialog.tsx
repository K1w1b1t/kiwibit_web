'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/shared/ui/button';

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
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
  isBusy = false,
  onConfirm,
  onCancel,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        if (!isBusy) onCancel();
      }}
      className="card-glow max-w-md rounded-2xl border border-white/10 bg-[#0e0e0e] p-6 text-white backdrop:bg-black/70"
    >
      <h2 className="text-lg font-black uppercase tracking-[-0.02em]">{title}</h2>
      {description && <p className="mt-2 text-sm text-white/60">{description}</p>}

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isBusy}>
          {cancelLabel}
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={onConfirm}
          isLoading={isBusy}
          loadingLabel="Excluindo..."
        >
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
