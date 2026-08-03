'use client';

import { useState } from 'react';
import { apiClient } from '@/shared/api/api-client';
import { generatePassword } from '@/shared/lib/generate-password';
import { Button } from '@/shared/ui/button';
import { FormStatus } from '@/shared/ui/form-status';

type Props = {
  userId: string;
  userEmail: string;
};

/**
 * Password reset as its own action, separate from the profile form.
 *
 * Keeping it apart means saving a name change can never accidentally rewrite the
 * password, and the generated value can be displayed once for copying.
 */
export function UserPasswordPanel({ userId, userEmail }: Readonly<Props>) {
  const [generated, setGenerated] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleReset() {
    const password = generatePassword();
    setStatus('submitting');
    setMessage('');
    setGenerated('');

    const result = await apiClient.put(`/api/admin/users/${userId}`, { password });

    if (!result.ok) {
      setStatus('error');
      setMessage(result.message);
      return;
    }

    setStatus('success');
    setMessage('Senha redefinida. Copie agora — ela não será exibida de novo.');
    setGenerated(password);
  }

  return (
    <div className="card-glow animate-fade-up delay-200 mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm">
      <h2 className="text-xs font-semibold uppercase tracking-[0.28em] text-white/40">
        Redefinir senha
      </h2>
      <p className="mt-2 text-sm text-white/50">
        Gera uma senha forte para <span className="text-white/80">{userEmail}</span> e a aplica
        imediatamente. A senha atual deixa de funcionar.
      </p>

      <div className="mt-4">
        <FormStatus status={status} message={message} />
      </div>

      {generated && (
        <p className="mb-4 select-all break-all rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-sm text-accent">
          {generated}
        </p>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => void handleReset()}
        isLoading={status === 'submitting'}
        loadingLabel="Redefinindo..."
      >
        Gerar e aplicar nova senha
      </Button>
    </div>
  );
}
