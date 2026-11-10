import { randomUUID } from 'node:crypto';
import { betterAuth } from 'better-auth';
import { createAuthEndpoint, APIError } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { cimd } from '@better-auth/cimd';
import { fetchClientMetadataResource } from '@better-auth/cimd/node';
import { mcp, type McpOptions } from '@better-auth/mcp';
import { getOAuthProviderApi } from '@better-auth/oauth-provider';
import { PostgresDialect } from 'kysely';
import { z } from 'zod';
import { getMcpSettings, MCP_SCOPES } from '@/shared/config/mcp';
import { getMcpDatabase } from '@/shared/lib/mcp-database';
import { prisma } from '@/shared/lib/prisma';
import { PANEL_ROLES } from '@/shared/lib/roles';

function buildMcpAuth() {
  const settings = getMcpSettings();
  const options: McpOptions = {
    resource: settings.resource,
    loginPage: '/api/mcp-auth/browser',
    consentPage: '/api/mcp-auth/browser',
    scopes: [...MCP_SCOPES],
    grantTypes: ['authorization_code', 'refresh_token'],
    disableJwtPlugin: true,
    detachAuthorizationSession: true,
    storeTokens: 'hashed',
    accessTokenExpiresIn: 300,
    codeExpiresIn: 300,
    refreshTokenExpiresIn: 30 * 24 * 3600,
    refreshTokenReuseInterval: 0,
    allowPublicClientPrelogin: true,
    postLogin: {
      page: '/api/mcp-auth/browser',
      shouldRedirect: () => Promise.resolve(false),
      consentReferenceId: ({ session }) => {
        if (typeof session.connectionId !== 'string')
          throw new APIError('UNAUTHORIZED', { code: 'MCP_CONNECTION_BINDING_MISSING' });
        return Promise.resolve(session.connectionId);
      },
    },
  };
  const providerPlugin = mcp(options);
  return betterAuth({
    baseURL: settings.origin,
    basePath: '/api/mcp-auth',
    secret: settings.secret,
    trustedOrigins: [settings.origin],
    database: {
      dialect: new PostgresDialect({ pool: getMcpDatabase() }),
      type: 'postgres',
      transaction: true,
      schemaName: 'mcp_oauth',
    },
    emailAndPassword: { enabled: false },
    session: {
      expiresIn: 120,
      storeSessionInDatabase: true,
      cookieCache: { enabled: false },
      additionalFields: { connectionId: { type: 'string', required: true, input: false } },
    },
    advanced: {
      cookiePrefix: 'kiwibit-mcp',
      defaultCookieAttributes: {
        path: '/api/mcp-auth',
        httpOnly: true,
        sameSite: 'lax',
        secure: settings.origin.startsWith('https:'),
      },
    },
    rateLimit: { enabled: true, storage: 'database' },
    logger: { disabled: true },
    onAPIError: { throw: true },
    plugins: [
      providerPlugin,
      cimd({ fetchClientMetadataResource, metadataProfile: 'mcp-2026-07-28' }),
      {
        id: 'kiwibit-mcp-internal',
        endpoints: {
          validatePanelGrantUser: createAuthEndpoint(
            '/validate-grant-user',
            {
              method: 'POST',
              metadata: { SERVER_ONLY: true },
              body: z
                .object({
                  grantType: z.enum(['authorization_code', 'refresh_token']),
                  value: z.string().max(4096),
                })
                .strict(),
            },
            async (ctx) => {
              const provider = getOAuthProviderApi(ctx, providerPlugin.options);
              let userId: unknown;
              if (ctx.body.grantType === 'authorization_code') {
                const verification = await ctx.context.internalAdapter.findVerificationValue(
                  await provider.hashToken(ctx.body.value, 'authorization_code'),
                );
                // Let the provider detect code replay and revoke its issued family.
                if (!verification) return { valid: true };
                if (verification) {
                  const stored: unknown = JSON.parse(verification.value);
                  if (stored && typeof stored === 'object' && 'userId' in stored)
                    userId = stored.userId;
                }
              } else {
                const token = await ctx.context.adapter.findOne<{ userId: string }>({
                  model: 'oauthRefreshToken',
                  where: [
                    {
                      field: 'token',
                      value: await provider.hashToken(ctx.body.value, 'refresh_token'),
                    },
                  ],
                });
                userId = token?.userId;
              }
              if (!z.uuid().safeParse(userId).success) throw new APIError('UNAUTHORIZED');
              const user = await prisma.user.findUnique({
                where: { id: userId as string },
                select: { role: true },
              });
              if (!user || !PANEL_ROLES.has(user.role)) throw new APIError('UNAUTHORIZED');
              return { valid: true };
            },
          ),
          panelBridge: createAuthEndpoint(
            '/panel-bridge',
            {
              method: 'POST',
              metadata: { SERVER_ONLY: true },
              body: z.object({ userId: z.uuid(), oauth_query: z.string().max(16000) }).strict(),
            },
            async (ctx) => {
              const current = await prisma.user.findUnique({
                where: { id: ctx.body.userId },
                select: { id: true, role: true },
              });
              if (!current || !PANEL_ROLES.has(current.role))
                throw new APIError('UNAUTHORIZED', { code: 'MCP_CURRENT_USER_MISSING' });
              let user = await ctx.context.internalAdapter.findUserById(current.id);
              if (!user) {
                try {
                  user = await ctx.context.adapter.create({
                    model: 'user',
                    forceAllowId: true,
                    data: {
                      id: current.id,
                      name: current.id,
                      email: `${current.id}@mcp.invalid`,
                      emailVerified: false,
                      panelUserId: current.id,
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    },
                  });
                } catch (error) {
                  // A simultaneous first authorization may have created this identity.
                  user = await ctx.context.internalAdapter.findUserById(current.id);
                  if (!user) throw error;
                }
              }
              const session = await ctx.context.internalAdapter.createSession(
                current.id,
                false,
                { connectionId: randomUUID(), ipAddress: '', userAgent: '' },
                true,
              );
              if (!user || !session)
                throw new APIError('UNAUTHORIZED', { code: 'MCP_OAUTH_SESSION_MISSING' });
              await setSessionCookie(ctx, { user, session });
              return ctx.json({ success: true });
            },
          ),
          validateMcpAccess: createAuthEndpoint(
            '/validate-access',
            {
              method: 'POST',
              metadata: { SERVER_ONLY: true },
              body: z.object({ token: z.string().max(4096) }).strict(),
            },
            async (ctx) => {
              const provider = getOAuthProviderApi(ctx, providerPlugin.options);
              const claims = await provider.requireActiveAccessToken(ctx.body.token);
              const stored = await ctx.context.adapter.findOne<{
                userId: string;
                refreshId: string;
              }>({
                model: 'oauthAccessToken',
                where: [
                  {
                    field: 'token',
                    value: await provider.hashToken(ctx.body.token, 'access_token'),
                  },
                ],
              });
              if (!stored?.refreshId) throw new APIError('UNAUTHORIZED');
              const root = await ctx.context.adapter.findOne<{
                familyId: string;
                expiresAt: Date;
                revoked: Date | null;
              }>({ model: 'oauthRefreshToken', where: [{ field: 'id', value: stored.refreshId }] });
              if (!root || root.expiresAt <= new Date()) throw new APIError('UNAUTHORIZED');
              const family = await ctx.context.adapter.findOne<{
                familyRevokedAt: Date | null;
                expiresAt: Date;
              }>({ model: 'oauthRefreshToken', where: [{ field: 'id', value: root.familyId }] });
              const user = await prisma.user.findUnique({
                where: { id: stored.userId },
                select: { id: true, role: true },
              });
              if (
                !family ||
                family.familyRevokedAt ||
                family.expiresAt <= new Date() ||
                !user ||
                !PANEL_ROLES.has(user.role)
              )
                throw new APIError('UNAUTHORIZED');
              if (
                claims.iss !== settings.issuer ||
                !(Array.isArray(claims.aud)
                  ? claims.aud.includes(settings.resource)
                  : claims.aud === settings.resource)
              )
                throw new APIError('UNAUTHORIZED');
              return {
                userId: user.id,
                connectionId: root.familyId,
                scopes: typeof claims.scope === 'string' ? claims.scope.split(' ') : [],
              };
            },
          ),
        },
      },
    ],
    user: { additionalFields: { panelUserId: { type: 'string', required: true, input: false } } },
  });
}

let auth: ReturnType<typeof buildMcpAuth> | undefined;
export function getMcpAuth() {
  getMcpSettings();
  auth ??= buildMcpAuth();
  return auth;
}
