export const MCP_CLIENTS = ['codex', 'claude', 'antigravity'] as const;
export type McpClient = (typeof MCP_CLIENTS)[number];

export type McpConnection = {
  id: string;
  client: McpClient | 'other';
  name: string;
  metadataOrigin: string | null;
  connectedAt: string;
  expiresAt: string;
};

export type McpConnectionStatus = {
  enabled: boolean;
  connections: McpConnection[];
};

/** Classify by metadata provenance, never by a client-declared display name. */
export function classifyMcpClient(clientId: string): McpClient | 'other' {
  let url: URL;
  try {
    url = new URL(clientId);
  } catch {
    return 'other';
  }
  if (url.protocol !== 'https:' || url.username || url.password) return 'other';
  if (url.origin === 'https://chatgpt.com' && url.pathname.startsWith('/oauth/codex/'))
    return 'codex';
  if (url.origin === 'https://claude.ai' || url.origin === 'https://claude.com') return 'claude';
  if (url.href === 'https://antigravity.google/oauth/client-metadata.json') return 'antigravity';
  return 'other';
}
