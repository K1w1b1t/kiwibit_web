import { buildMcpClientGuide } from './client-guide';

describe('MCP client connection guides', () => {
  it.each(['http://localhost:3000', 'https://preview.kiwibit.dev', 'https://kiwibit.com.br'])(
    'uses the current environment origin %s',
    (origin) => {
      for (const client of ['codex', 'claude', 'antigravity'] as const) {
        const guide = buildMcpClientGuide(client, origin);
        expect(guide.endpoint).toBe(`${origin}/api/mcp`);
        expect(guide.configuration).toContain(`${origin}/api/mcp`);
        expect(guide.configuration).not.toContain('Bearer');
      }
    },
  );

  it('uses different server names for different environments and local ports', () => {
    const production = buildMcpClientGuide('codex', 'https://kiwibit.com.br').configuration;
    const staging = buildMcpClientGuide('codex', 'https://staging.kiwibit.com.br').configuration;
    expect(production.split(' --url')[0]).not.toEqual(staging.split(' --url')[0]);
    expect(buildMcpClientGuide('codex', 'http://localhost:3000').configuration).not.toBe(
      buildMcpClientGuide('codex', 'http://localhost:3001').configuration,
    );
  });

  it('rejects credential-bearing or non-HTTP origins', () => {
    expect(() => buildMcpClientGuide('codex', 'https://user:secret@example.org')).toThrow();
    expect(() => buildMcpClientGuide('codex', 'file:///tmp/mcp')).toThrow();
  });

  it('does not interpolate page paths or queries into the command', () => {
    const guide = buildMcpClientGuide('claude', 'https://kiwibit.com.br/admin?secret=private');
    expect(guide.configuration).not.toContain('secret');
    expect(guide.endpoint).toBe('https://kiwibit.com.br/api/mcp');
  });

  it('generates a valid Antigravity config for the active environment', () => {
    const { configuration } = buildMcpClientGuide('antigravity', 'http://localhost:3000');
    expect(JSON.parse(configuration)).toEqual({
      mcpServers: { 'kiwibit-localhost-3000': { serverUrl: 'http://localhost:3000/api/mcp' } },
    });
  });
});
