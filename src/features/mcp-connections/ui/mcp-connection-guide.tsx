import type { McpClient } from '@/entities/mcp-connection/model/mcp-connection';
import { buildMcpClientGuide, MCP_CLIENT_LABELS } from '../model/client-guide';

type Props = { client: McpClient; origin: string };

export function McpConnectionGuide({ client, origin }: Readonly<Props>) {
  const guide = buildMcpClientGuide(client, origin);
  return (
    <div id={`mcp-guide-${client}`} className="mt-4 space-y-3 border-t border-white/10 pt-4">
      <h4 className="text-sm font-medium text-white">Conectar {MCP_CLIENT_LABELS[client]}</h4>
      <p className="break-all text-xs text-white/60">Servidor deste ambiente: {guide.endpoint}</p>
      <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white/80">
        <code>{guide.configuration}</code>
      </pre>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-white/70">
        {guide.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="text-xs text-white/50">
        Use uma versão atualizada com OAuth e CIMD. Se o terminal estiver em outra máquina, abra o
        endereço de autorização mostrado por ele no seu navegador. O ambiente precisa estar
        acessível pelo aplicativo.
      </p>
      <a
        className="text-xs text-white underline"
        href={guide.documentation}
        target="_blank"
        rel="noreferrer"
      >
        Documentação do {MCP_CLIENT_LABELS[client]}
      </a>
    </div>
  );
}
