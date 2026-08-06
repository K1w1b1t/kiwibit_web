'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/shared/api/api-client';
import { Button } from '@/shared/ui/button';
import { FormStatus } from '@/shared/ui/form-status';

type Props = {
  memberId: string;
  /** True when the signed-in user's account is linked to this member. */
  isOwner: boolean;
  isConnected: boolean;
  /** ISO date the LinkedIn was connected, or null. */
  connectedAt: string | null;
};

const CONNECT_MESSAGES: Record<string, { status: 'success' | 'error'; message: string }> = {
  connected: { status: 'success', message: 'LinkedIn conectado e foto sincronizada.' },
  error: { status: 'error', message: 'Não foi possível conectar o LinkedIn. Tente novamente.' },
  forbidden: { status: 'error', message: 'Você só pode conectar o seu próprio LinkedIn.' },
};

/**
 * Connects a member's own LinkedIn to sync the profile photo (issue #80).
 *
 * "Each connects their own": the button only works for the member linked to the
 * signed-in user's account. Mirrors `MemberAccountPanel` in shape and styling.
 */
export function MemberLinkedinPanel({
  memberId,
  isOwner,
  isConnected,
  connectedAt,
}: Readonly<Props>) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Seed the banner from the OAuth redirect outcome (?linkedin=connected|error|
  // forbidden). Derived once from the URL present on mount; the disconnect action
  // takes over the same state afterwards.
  const [{ status, message }, setBanner] = useState<{
    status: 'idle' | 'submitting' | 'success' | 'error';
    message: string;
  }>(() => {
    const outcome = searchParams.get('linkedin');
    const seed = outcome ? CONNECT_MESSAGES[outcome] : undefined;
    return seed ? { status: seed.status, message: seed.message } : { status: 'idle', message: '' };
  });

  const connectUrl = `/api/admin/members/${memberId}/linkedin/connect`;

  async function handleDisconnect() {
    setBanner({ status: 'submitting', message: '' });

    const result = await apiClient.delete(connectUrl.replace('/connect', ''));
    if (!result.ok) {
      setBanner({ status: 'error', message: result.message });
      return;
    }

    setBanner({ status: 'success', message: 'LinkedIn desconectado. A foto atual foi mantida.' });
    router.refresh();
  }

  const formattedDate = connectedAt
    ? new Date(connectedAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null;

  return (
    <section className="card-glow animate-fade-up delay-200 mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm">
      <h2 className="text-xs font-semibold uppercase tracking-[0.28em] text-white/40">LinkedIn</h2>

      <div className="mt-3 space-y-4">
        <FormStatus status={status} message={message} />

        {!isOwner ? (
          <p className="text-sm text-white/50">
            Só o próprio membro conecta seu LinkedIn, entrando com a conta dele.
          </p>
        ) : isConnected ? (
          <>
            <p className="text-sm text-white/80">
              Conectado{formattedDate ? ` em ${formattedDate}` : ''}.
            </p>
            <p className="text-xs text-white/40">
              A foto é sincronizada apenas no momento da conexão — reconecte para atualizá-la.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = connectUrl)}
              >
                Ressincronizar foto
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleDisconnect()}
                isLoading={status === 'submitting'}
                loadingLabel="Desconectando..."
              >
                Desconectar
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-white/50">
              Conecte sua conta do LinkedIn para sincronizar a foto de perfil.
            </p>
            <Button size="sm" onClick={() => (window.location.href = connectUrl)}>
              Conectar LinkedIn
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
