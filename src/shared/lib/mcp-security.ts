type SecurityOutcome =
  | 'OAUTH_REJECTED'
  | 'CONSENT_GRANTED'
  | 'CONSENT_DENIED'
  | 'TOKEN_REJECTED'
  | 'DRAFT_CREATED'
  | 'IMAGE_PREPARED'
  | 'TOOL_REJECTED'
  | 'CONNECTION_REVOKED'
  | 'ALL_CONNECTIONS_REVOKED'
  | 'CLEANUP_RETRY';

/** Only internal identifiers and fixed codes cross this logging boundary. */
export function recordMcpSecurityOutcome(
  outcome: SecurityOutcome,
  identity?: { userId: string; connectionId?: string },
) {
  console.info('mcp_security', {
    app: 'kiwibit',
    environment:
      process.env.NEXT_PUBLIC_APP_ENV ?? process.env.POSTHOG_ENVIRONMENT ?? 'development',
    telemetry_source: 'server',
    outcome,
    ...(identity
      ? {
          userId: identity.userId,
          ...(identity.connectionId ? { connectionId: identity.connectionId } : {}),
        }
      : {}),
  });
}
