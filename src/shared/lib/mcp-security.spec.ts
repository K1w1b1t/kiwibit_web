import { recordMcpSecurityOutcome } from './mcp-security';

describe('MCP security logging', () => {
  it('logs only fixed outcomes, environment labels, and internal identity', () => {
    const output = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    try {
      const identity = {
        userId: 'internal-user',
        connectionId: 'internal-connection',
        email: 'private-email',
        token: 'private-token',
        body: 'private-post-content',
        headers: 'private-headers',
        query: 'private-query',
        bytesBase64: 'private-bytes',
      };
      recordMcpSecurityOutcome('DRAFT_CREATED', identity);
      const serialized = JSON.stringify(output.mock.calls);
      for (const secret of [
        'private-email',
        'private-token',
        'private-post-content',
        'private-headers',
        'private-query',
        'private-bytes',
      ])
        expect(serialized).not.toContain(secret);
      expect(serialized).toContain('kiwibit');
      expect(serialized).toContain('telemetry_source');
      expect(serialized).toContain('internal-connection');
    } finally {
      output.mockRestore();
    }
  });
});
