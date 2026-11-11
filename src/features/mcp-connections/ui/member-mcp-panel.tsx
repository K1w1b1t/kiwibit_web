'use client';

import { useState } from 'react';
import {
  MCP_CLIENTS,
  type McpClient,
  type McpConnection,
} from '@/entities/mcp-connection/model/mcp-connection';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { FormStatus } from '@/shared/ui/form-status';
import { MCP_CLIENT_LABELS } from '../model/client-guide';
import { useMcpConnections } from '../model/use-mcp-connections';
import { McpConnectionGuide } from './mcp-connection-guide';

export function MemberMcpPanel() {
  const { data, loading, revoking, message, error, refresh, revoke } = useMcpConnections();
  const [selected, setSelected] = useState<McpClient | null>(null);
  const [origin, setOrigin] = useState('');
  const [pending, setPending] = useState<McpConnection | 'all' | null>(null);

  function showGuide(client: McpClient) {
    setOrigin(window.location.origin);
    setSelected(selected === client ? null : client);
  }

  async function confirmRevocation() {
    if (!pending) return;
    await revoke(pending === 'all' ? undefined : pending.id);
    setPending(null);
  }

  let formStatus: 'idle' | 'error' | 'success' = 'idle';
  if (error) formStatus = 'error';
  else if (message) formStatus = 'success';

  function connectionLabel(connected: boolean) {
    if (loading) return 'Consultando…';
    if (error || !data) return 'Status indisponível';
    return connected ? 'Conectado' : 'Não conectado';
  }

  return (
    <section
      className="card-glow mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6"
      aria-labelledby="mcp-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="mcp-heading"
          className="text-xs font-semibold uppercase tracking-[0.28em] text-white/40"
        >
          Assistentes de IA
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refresh()}
          disabled={loading || revoking}
        >
          Atualizar status
        </Button>
      </div>
      <p className="mt-3 text-sm text-white/60">
        Conecte seu assistente para preparar imagens e criar rascunhos na sua conta. A publicação
        continua no painel.
      </p>
      <p className="mt-2 text-xs text-white/40">
        Cada autorização pertence a este ambiente. “Conectado” indica acesso autorizado, não que o
        aplicativo esteja online.
      </p>
      <div className="mt-4" role="status" aria-live="polite">
        {loading && <p className="text-sm text-white/60">Consultando conexões…</p>}
        <FormStatus status={formStatus} message={message} />
        {data && !data.enabled && (
          <p className="text-sm text-amber-200">
            Novas conexões ainda não estão disponíveis neste ambiente. Você pode consultar o passo a
            passo e revogar acessos existentes.
          </p>
        )}
      </div>
      <div className="mt-4 space-y-4">
        {Boolean(data?.connections.length) && (
          <Button
            variant="outline"
            size="sm"
            disabled={loading || revoking}
            onClick={() => setPending('all')}
          >
            Revogar todas as conexões
          </Button>
        )}
        {MCP_CLIENTS.map((client) => {
          const connections =
            data?.connections.filter((connection) => connection.client === client) ?? [];
          const connected = connections.length > 0;
          return (
            <article key={client} className="rounded-xl border border-white/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-medium text-white">{MCP_CLIENT_LABELS[client]}</h3>
                <span className={connected ? 'text-xs text-emerald-300' : 'text-xs text-white/50'}>
                  {connectionLabel(connected)}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                aria-expanded={selected === client}
                aria-controls={`mcp-guide-${client}`}
                onClick={() => showGuide(client)}
              >
                {connected ? 'Conectar outro dispositivo' : `Conectar ${MCP_CLIENT_LABELS[client]}`}
              </Button>
              {selected === client && <McpConnectionGuide client={client} origin={origin} />}
              {connections.map((connection) => (
                <ConnectionRow
                  key={connection.id}
                  connection={connection}
                  disabled={revoking}
                  onRevoke={setPending}
                />
              ))}
            </article>
          );
        })}
        {data?.connections
          .filter((connection) => connection.client === 'other')
          .map((connection) => (
            <ConnectionRow
              key={connection.id}
              connection={connection}
              disabled={revoking}
              onRevoke={setPending}
            />
          ))}
      </div>
      <ConfirmDialog
        open={pending !== null}
        title={pending === 'all' ? 'Revogar todas as conexões?' : 'Revogar conexão?'}
        description={
          pending === 'all'
            ? 'Todos os assistentes perderão o acesso à sua conta neste ambiente. Seus rascunhos serão mantidos.'
            : 'O aplicativo perderá o acesso desta autorização. Seus rascunhos serão mantidos e outras conexões continuarão funcionando.'
        }
        confirmLabel="Revogar acesso"
        loadingLabel="Revogando…"
        isBusy={revoking}
        onConfirm={() => void confirmRevocation()}
        onCancel={() => setPending(null)}
      />
    </section>
  );
}

function ConnectionRow({
  connection,
  disabled,
  onRevoke,
}: Readonly<{
  connection: McpConnection;
  disabled: boolean;
  onRevoke: (connection: McpConnection) => void;
}>) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
      <div className="min-w-0 text-xs text-white/60">
        <p className="break-all">
          {connection.name} · {connection.metadataOrigin ?? 'Cliente pré-cadastrado'}
        </p>
        <p>
          Autorizado em{' '}
          {new Date(connection.connectedAt).toLocaleDateString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
          })}{' '}
          · válido até{' '}
          {new Date(connection.expiresAt).toLocaleDateString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
          })}
        </p>
      </div>
      <Button variant="outline" size="sm" disabled={disabled} onClick={() => onRevoke(connection)}>
        Revogar acesso
      </Button>
    </div>
  );
}
