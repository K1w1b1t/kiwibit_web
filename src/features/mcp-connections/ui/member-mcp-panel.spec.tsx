/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { MemberMcpPanel } from './member-mcp-panel';
import { useMcpConnections } from '../model/use-mcp-connections';

jest.mock('../model/use-mcp-connections', () => ({ useMcpConnections: jest.fn() }));

const connection = {
  id: 'connection-a',
  client: 'codex' as const,
  name: 'Codex',
  metadataOrigin: 'https://chatgpt.com',
  connectedAt: '2026-11-10T12:00:00Z',
  expiresAt: '2026-12-10T12:00:00Z',
};

describe('Member MCP panel', () => {
  beforeEach(() => {
    jest.mocked(useMcpConnections).mockReturnValue({
      data: { enabled: true, connections: [] },
      loading: false,
      revoking: false,
      message: '',
      error: false,
      refresh: jest.fn(),
      revoke: jest.fn(),
    });
  });

  it('offers a separate connection guide for each client using the current origin', () => {
    render(<MemberMcpPanel />);
    for (const name of ['Codex', 'Claude Code', 'Antigravity']) {
      fireEvent.click(screen.getByRole('button', { name: `Conectar ${name}` }));
      expect(
        screen.getByText(`Servidor deste ambiente: ${window.location.origin}/api/mcp`),
      ).toBeTruthy();
      expect(
        screen.getByRole('button', { name: `Conectar ${name}` }).getAttribute('aria-expanded'),
      ).toBe('true');
    }
  });

  it('shows an authorized connection with an individual revocation action', () => {
    const state = jest.mocked(useMcpConnections).getMockImplementation()?.();
    if (!state) throw new Error('Missing hook fixture');
    jest
      .mocked(useMcpConnections)
      .mockReturnValue({ ...state, data: { enabled: true, connections: [connection] } });
    render(<MemberMcpPanel />);
    expect(screen.getByText('Conectado')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Revogar acesso' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Conectar outro dispositivo' })).toBeTruthy();
  });

  it('does not claim disconnection while the status is unavailable', () => {
    const state = jest.mocked(useMcpConnections).getMockImplementation()?.();
    if (!state) throw new Error('Missing hook fixture');
    jest
      .mocked(useMcpConnections)
      .mockReturnValue({ ...state, data: null, error: true, message: 'Indisponível' });
    render(<MemberMcpPanel />);
    expect(screen.queryByText('Não conectado')).toBeNull();
    expect(screen.getAllByText('Status indisponível')).toHaveLength(3);
  });
});
