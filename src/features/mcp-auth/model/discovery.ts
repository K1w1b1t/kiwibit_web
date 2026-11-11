import { oauthProviderAuthServerMetadata } from '@better-auth/oauth-provider';
import { getMcpAuth } from '@/shared/lib/mcp-oauth-provider';
import { getMcpSettings, MCP_SCOPES } from '@/shared/config/mcp';

export async function mcpDiscovery(request: Request, path: string) {
  try {
    const settings = getMcpSettings();
    if (['oauth-protected-resource', 'oauth-protected-resource/api/mcp'].includes(path))
      return Response.json(
        {
          resource: settings.resource,
          authorization_servers: [settings.issuer],
          scopes_supported: [...MCP_SCOPES],
          bearer_methods_supported: ['header'],
        },
        { headers: { 'access-control-allow-origin': '*' } },
      );
    if (['oauth-authorization-server', 'oauth-authorization-server/api/mcp-auth'].includes(path))
      return await oauthProviderAuthServerMetadata(getMcpAuth(), {
        headers: { 'access-control-allow-origin': '*' },
      })(request);
    return new Response(null, { status: 404 });
  } catch {
    return new Response(null, { status: process.env.MCP_ENABLED === 'true' ? 503 : 404 });
  }
}
