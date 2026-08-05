'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/shared/api/api-client';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';

type Props = {
  endpoint: string;
  /** Shown inside the confirmation dialog. */
  resourceLabel: string;
  /** Navigate here after deleting; omit to just refresh in place. */
  redirectTo?: string;
  label?: string;
};

/**
 * Delete action with confirmation. Until now the DELETE endpoints existed but
 * nothing in the UI could reach them.
 */
export function DeleteButton({
  endpoint,
  resourceLabel,
  redirectTo,
  label = 'Excluir',
}: Readonly<Props>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleConfirm() {
    setIsBusy(true);
    setError('');

    const result = await apiClient.delete(endpoint);

    if (!result.ok) {
      setIsBusy(false);
      setOpen(false);
      setError(result.message);
      return;
    }

    setIsBusy(false);
    setOpen(false);

    if (redirectTo) {
      router.push(redirectTo);
    }
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs uppercase tracking-[0.12em] text-red-300/70 transition hover:text-red-200"
      >
        {label}
      </button>

      {error && (
        <p role="alert" className="mt-1 text-xs text-red-300">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={open}
        title={`Excluir ${resourceLabel}?`}
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        isBusy={isBusy}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
