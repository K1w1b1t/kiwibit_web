import { McpServer, createMcpHandler, requireScopes } from '@modelcontextprotocol/server';
import { getMcpSettings, MCP_SCOPES } from '@/shared/config/mcp';
import { getMcpAuth } from '@/shared/lib/mcp-oauth-provider';
import { takeMcpRateLimit, mcpRequestIp } from '@/shared/lib/mcp-rate-limit';
import { createPostDraft } from './create-post-draft';
import { preparePostImage } from './prepare-post-image';
import { createPostDraftSchema, preparePostImageSchema, McpToolError } from './tool-schemas';
import { recordMcpSecurityOutcome } from '@/shared/lib/mcp-security';

async function toolResult(operation: () => Promise<unknown>) {
  try {
    const result = await operation();
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
  } catch (error) {
    recordMcpSecurityOutcome('TOOL_REJECTED');
    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: { code: error instanceof McpToolError ? error.code : 'INTERNAL_ERROR' },
          }),
        },
      ],
    };
  }
}

export async function handleMcp(request: Request) {
  let settings: ReturnType<typeof getMcpSettings>;
  try {
    settings = getMcpSettings();
  } catch {
    return new Response(null, { status: process.env.MCP_ENABLED === 'true' ? 503 : 404 });
  }
  const challenge = `Bearer resource_metadata="${settings.origin}/.well-known/oauth-protected-resource/api/mcp", scope="${MCP_SCOPES.join(' ')}"`;
  const headers = { 'www-authenticate': challenge, 'cache-control': 'no-store' };
  if (
    new URL(request.url).origin !== settings.origin ||
    (request.headers.has('origin') && request.headers.get('origin') !== settings.origin)
  )
    return new Response(null, { status: 403 });
  try {
    const ip = await takeMcpRateLimit('mcp-ip', mcpRequestIp(request), 120, 60);
    if (!ip.allowed)
      return new Response(null, { status: 429, headers: { 'retry-after': String(ip.retryAfter) } });
    const token = /^Bearer ([A-Za-z0-9_-]+)$/.exec(request.headers.get('authorization') ?? '')?.[1];
    if (!token) return new Response(null, { status: 401, headers });
    let principal;
    try {
      principal = await getMcpAuth().api.validateMcpAccess({ body: { token } });
    } catch {
      recordMcpSecurityOutcome('TOKEN_REJECTED');
      return new Response(null, { status: 401, headers });
    }
    const limit = await takeMcpRateLimit('mcp-connection', principal.connectionId, 60, 60);
    if (!limit.allowed)
      return new Response(null, {
        status: 429,
        headers: { 'retry-after': String(limit.retryAfter) },
      });
    const handler = createMcpHandler(
      () => {
        const server = new McpServer({ name: 'kiwibit-drafts', version: '0.1.0' });
        server.registerTool(
          'prepare_post_image',
          {
            description:
              'Prepare a JPEG, PNG, WebP or AVIF image, up to 3 MiB. Use the returned mcp-image placeholder and reference when creating a draft.',
            inputSchema: preparePostImageSchema,
            scopeChallenge: requireScopes('posts:images:prepare'),
          },
          async (input) =>
            toolResult(async () => {
              if (!principal.scopes.includes('posts:images:prepare'))
                throw new McpToolError('INSUFFICIENT_SCOPE');
              return preparePostImage(principal, input);
            }),
        );
        server.registerTool(
          'create_post_draft',
          {
            description:
              'Create one complete bilingual draft, using your prepared image references and a stable idempotency key. It never publishes. Edit the result in the panel.',
            inputSchema: createPostDraftSchema,
            scopeChallenge: requireScopes('posts:drafts:create'),
          },
          async (input) =>
            toolResult(async () => {
              if (!principal.scopes.includes('posts:drafts:create'))
                throw new McpToolError('INSUFFICIENT_SCOPE');
              return createPostDraft(principal, input);
            }),
        );
        return server;
      },
      {
        responseMode: 'json',
        legacy: 'stateless',
        maxRequestBodySize: 4400000,
        onerror: () => undefined,
      },
    );
    const response = await handler.fetch(request, {
      authInfo: {
        token: '',
        clientId: principal.connectionId,
        scopes: principal.scopes,
        resource: new URL(settings.resource),
      },
    });
    response.headers.set('cache-control', 'no-store');
    return response;
  } catch {
    return Response.json(
      { error: { code: 'MCP_UNAVAILABLE', message: 'MCP is temporarily unavailable.' } },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    );
  }
}
