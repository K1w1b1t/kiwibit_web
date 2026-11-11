import { getMcpDatabase } from '@/shared/lib/mcp-database';
import { listMcpConnections, revokeMcpConnection } from './connection-store';

jest.mock('@/shared/lib/mcp-database', () => ({ getMcpDatabase: jest.fn() }));

const query = jest.fn();
const clientQuery = jest.fn();
const release = jest.fn();

describe('MCP connection persistence', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (getMcpDatabase as jest.Mock).mockReturnValue({
      query,
      connect: async () => ({ query: clientQuery, release }),
    });
    query.mockResolvedValue({ rows: [{ table: 'mcp_oauth.oauthRefreshToken' }] });
    clientQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('handles an environment without provider tables as having no grants', async () => {
    query.mockResolvedValue({ rows: [{ table: null }] });
    expect(await listMcpConnections('owner')).toEqual([]);
    expect(await revokeMcpConnection('owner', 'missing')).toBe(false);
    expect(clientQuery).not.toHaveBeenCalled();
  });

  it('projects connection metadata without returning token hashes or user identity', async () => {
    query.mockResolvedValueOnce({ rows: [{ table: 'mcp_oauth.oauthRefreshToken' }] });
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'grant-a',
          clientId: 'https://chatgpt.com/oauth/codex/example/client.json',
          name: 'Codex',
          createdAt: new Date('2026-11-10T00:00:00Z'),
          expiresAt: new Date('2026-12-10T00:00:00Z'),
          token: 'synthetic-token-hash',
        },
      ],
    });
    const result = await listMcpConnections('owner');
    expect(result[0].client).toBe('codex');
    expect(result[0].metadataOrigin).toBe('https://chatgpt.com');
    expect(JSON.stringify(result)).not.toContain('synthetic-token-hash');
    expect(query.mock.calls[1][1]).toEqual(['owner']);
  });

  it('does not mutate a connection that is absent or belongs to another user', async () => {
    expect(await revokeMcpConnection('owner', 'foreign')).toBe(false);
    expect(clientQuery.mock.calls[1][1]).toEqual(['foreign', 'owner']);
    expect(clientQuery.mock.calls.some(([sql]: [string]) => /^\s*UPDATE\b/.test(sql))).toBe(false);
    expect(clientQuery).toHaveBeenLastCalledWith('ROLLBACK');
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('rolls back a partial failure and releases the connection without leaking database errors', async () => {
    clientQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    clientQuery.mockResolvedValueOnce({ rows: [{ id: 'grant-a' }], rowCount: 1 });
    clientQuery.mockRejectedValueOnce(new Error('Synthetic private database error'));
    await expect(revokeMcpConnection('owner', 'grant-a')).rejects.toThrow('MCP_REVOCATION_FAILED');
    expect(clientQuery).toHaveBeenLastCalledWith('ROLLBACK');
    expect(release).toHaveBeenCalledTimes(1);
  });
});
