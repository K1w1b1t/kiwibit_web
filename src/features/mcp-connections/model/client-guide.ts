import type { McpClient } from '@/entities/mcp-connection/model/mcp-connection';

export const MCP_CLIENT_LABELS: Record<McpClient, string> = {
  codex: 'Codex',
  claude: 'Claude Code',
  antigravity: 'Antigravity',
};

export function buildMcpClientGuide(client: McpClient, origin: string) {
  const parsed = new URL(origin);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password)
    throw new Error('Invalid site origin');
  const endpoint = `${parsed.origin}/api/mcp`;
  const escapedEndpoint = endpoint.replaceAll("'", String.raw`'\''`);
  const quotedEndpoint = `'${escapedEndpoint}'`;
  const name = `kiwibit-${parsed.host.replace(/[^a-zA-Z0-9-]/g, '-')}`;
  const common = [
    'Entre no Kiwibit com a sua conta quando o navegador abrir.',
    'Confira o ambiente e as permissões, autorize a conexão e volte ao aplicativo.',
    'Atualize o status nesta página para conferir a autorização.',
  ];
  if (client === 'codex')
    return {
      endpoint,
      configuration: `codex mcp add ${name} --url ${quotedEndpoint}\ncodex mcp login ${name}`,
      steps: ['Execute os comandos no terminal com o Codex instalado.', ...common],
      documentation: 'https://learn.chatgpt.com/docs/extend/mcp',
    };
  if (client === 'claude')
    return {
      endpoint,
      configuration: `claude mcp add --transport http --scope user ${name} ${quotedEndpoint}`,
      steps: [
        'Execute o comando no terminal com o Claude Code instalado.',
        'Abra o Claude Code, execute /mcp e selecione este servidor para autenticar.',
        ...common,
      ],
      documentation: 'https://code.claude.com/docs/en/mcp',
    };
  return {
    endpoint,
    configuration: JSON.stringify({ mcpServers: { [name]: { serverUrl: endpoint } } }, null, 2),
    steps: [
      'No Antigravity CLI (agy), abra /mcp para gerenciar os servidores.',
      'Adicione a configuração ao mcp_config.json global ou do projeto, preservando os servidores existentes.',
      'Selecione o servidor e a ação Authenticate. Autorize no navegador e cole no CLI o código exibido no retorno.',
      ...common,
    ],
    documentation: 'https://antigravity.google/docs/mcp?tab=cli',
  };
}
