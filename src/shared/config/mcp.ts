export const MCP_SCOPES = [
  'posts:drafts:create',
  'posts:images:prepare',
  'offline_access',
] as const;

export function getMcpSettings() {
  if (process.env.MCP_ENABLED !== 'true') throw new Error('MCP_DISABLED');
  const raw = process.env.MCP_CANONICAL_ORIGIN;
  const secret = process.env.MCP_AUTH_SECRET;
  if (!raw || !secret || secret.length < 32 || secret === process.env.NEXTAUTH_SECRET)
    throw new Error('MCP_CONFIGURATION_INVALID');
  const url = new URL(raw);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  )
    throw new Error('MCP_CONFIGURATION_INVALID');
  return {
    origin: url.origin,
    issuer: `${url.origin}/api/mcp-auth`,
    resource: `${url.origin}/api/mcp`,
    secret,
  };
}
