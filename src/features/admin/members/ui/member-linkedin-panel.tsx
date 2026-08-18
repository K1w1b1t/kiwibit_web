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
  /** True when the stored connection granted the `w_member_social` scope. */
  canAutoPost: boolean;
  /** Current per-member auto-post opt-in state. */
  autoPostEnabled: boolean;
};

const CONNECT_MESSAGES: Record<string, { status: 'success' | 'error'; message: string }> = {
  connected: { status: 'success', message: 'LinkedIn conectado e foto sincronizada.' },
  error: { status: 'error', message: 'Não foi possível conectar o LinkedIn. Tente novamente.' },
  forbidden: { status: 'error', message: 'Você só pode conectar o seu próprio LinkedIn.' },
};

/**
 * Connects a member's own LinkedIn to sync the profile photo (issue #80) and,
 * with the extra opt-in, auto-post to their profile when they publish (#81).
 *
 * "Each connects their own": the buttons only work for the member linked to the
 * signed-in user's account. Mirrors `MemberAccountPanel` in shape and styling.
 */
export function MemberLinkedinPanel({
  memberId,
  isOwner,
  isConnected,
  connectedAt,
  canAutoPost,
  autoPostEnabled,
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

  const autoPostUrl = `${connectUrl}?autopost=1`;

  async function handleToggleAutoPost(next: boolean) {
    setBanner({ status: 'submitting', message: '' });

    const result = await apiClient.patch(connectUrl.replace('/connect', ''), {
      autoPostEnabled: next,
    });
    if (!result.ok) {
      setBanner({ status: 'error', message: result.message });
      return;
    }

    setBanner({
      status: 'success',
      message: next
        ? 'Post automático no LinkedIn ativado.'
        : 'Post automático no LinkedIn desativado.',
    });
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

            <div className="mt-2 border-t border-white/10 pt-4">
              <p className="text-sm font-medium text-white/80">Post automático no blog</p>
              {canAutoPost ? (
                <>
                  <label className="mt-2 flex items-center gap-3 text-sm text-white/70">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-white/20 bg-transparent"
                      checked={autoPostEnabled}
                      disabled={status === 'submitting'}
                      onChange={(event) => void handleToggleAutoPost(event.target.checked)}
                    />
                    Postar automaticamente no meu LinkedIn quando eu publicar no blog.
                  </label>
                  <p className="mt-2 text-xs text-white/40">
                    O acesso do LinkedIn expira a cada ~60 dias — se expirar, o post automático é
                    desativado e você precisa reconectar.
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-sm text-white/50">
                    Requer uma permissão extra do LinkedIn. Reconecte concedendo o acesso de
                    publicação para ativar.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => (window.location.href = autoPostUrl)}
                  >
                    Ativar post automático
                  </Button>
                </>
              )}
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
