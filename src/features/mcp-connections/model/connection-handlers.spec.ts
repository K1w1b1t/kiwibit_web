import { requirePanelSession } from '@/shared/lib/api-helpers';
import { prisma } from '@/shared/lib/prisma';
import { NextResponse } from 'next/server';
import { getConnections, deleteConnection } from './connection-handlers';
import { listMcpConnections, revokeMcpConnection } from './connection-store';

jest.mock('./connection-store', () => ({
  listMcpConnections: jest.fn(),
  revokeMcpConnection: jest.fn(),
}));

describe('Own MCP connections API', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    delete process.env.MCP_CANONICAL_ORIGIN;
    delete process.env.MCP_ENABLED;
    jest.mocked(requirePanelSession).mockResolvedValue({
      session: {
        user: {
          id: 'owner',
          role: 'member',
          name: 'Synthetic user',
          email: 'synthetic@example.invalid',
        },
        expires: '2026-12-10T00:00:00Z',
      },
      response: null,
    });
    jest.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'owner',
      role: 'member',
      name: 'Synthetic user',
      email: 'synthetic@example.invalid',
      password: 'synthetic-unused-fixture',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    jest.mocked(listMcpConnections).mockResolvedValue([]);
    jest.mocked(revokeMcpConnection).mockResolvedValue(true);
  });

  it('requires a NextAuth panel session before accessing provider data', async () => {
    const denied = NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
      { status: 401 },
    );
    jest.mocked(requirePanelSession).mockResolvedValue({ session: null, response: denied });
    expect(await getConnections()).toBe(denied);
    expect(listMcpConnections).not.toHaveBeenCalled();
  });

  it('lists only the current database user, even when new authorization is disabled', async () => {
    const response = await getConnections();
    expect(listMcpConnections).toHaveBeenCalledWith('owner');
    expect(await response?.json()).toEqual({ enabled: false, connections: [] });
  });

  it('rejects a removed account before querying connections', async () => {
    jest.mocked(prisma.user.findUnique).mockResolvedValue(null);
    expect((await getConnections())?.status).toBe(403);
    expect(listMcpConnections).not.toHaveBeenCalled();
  });

  it('normalizes the configured origin when revoking a connection', async () => {
    process.env.MCP_CANONICAL_ORIGIN = 'https://kiwibit.com.br/';
    const request = new Request('https://kiwibit.com.br/api/admin/connections/connection-a', {
      method: 'DELETE',
      headers: { origin: 'https://kiwibit.com.br' },
    });
    expect((await deleteConnection(request, 'connection-a'))?.status).toBe(200);
  });

  it('rejects cross-origin revocation', async () => {
    const request = new Request('https://kiwibit.com.br/api/admin/connections/connection-a', {
      method: 'DELETE',
      headers: { origin: 'https://attacker.example' },
    });
    expect((await deleteConnection(request, 'connection-a'))?.status).toBe(403);
    expect(revokeMcpConnection).not.toHaveBeenCalled();
  });

  it('scopes deletion to the signed-in user and permits revocation while disabled', async () => {
    const request = new Request('https://kiwibit.com.br/api/admin/connections/connection-a', {
      method: 'DELETE',
      headers: { origin: 'https://kiwibit.com.br' },
    });
    expect((await deleteConnection(request, 'connection-a'))?.status).toBe(200);
    expect(revokeMcpConnection).toHaveBeenCalledWith('owner', 'connection-a');
  });

  it('does not disclose another user connection', async () => {
    jest.mocked(revokeMcpConnection).mockResolvedValue(false);
    const request = new Request('https://kiwibit.com.br/api/admin/connections/foreign', {
      method: 'DELETE',
      headers: { origin: 'https://kiwibit.com.br' },
    });
    expect((await deleteConnection(request, 'foreign'))?.status).toBe(404);
  });

  it('does not convert a provider outage into a disconnected status', async () => {
    jest.mocked(listMcpConnections).mockRejectedValue(new Error('Synthetic database failure'));
    const response = await getConnections();
    expect(response?.status).toBe(503);
    expect(JSON.stringify(await response?.json())).not.toContain('Synthetic database failure');
  });
});
