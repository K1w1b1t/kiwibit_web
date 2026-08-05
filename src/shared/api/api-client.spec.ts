import { apiClient } from '@/shared/api/api-client';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  } as unknown as Response;
}

describe('apiClient', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockReset();
  });

  it('desembrulha { success, data } de POST/PUT', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { success: true, data: { id: 'a1' } }));

    const result = await apiClient.post<{ id: string }>('/api/admin/members', { name: 'Ana' });

    expect(result).toEqual({ ok: true, data: { id: 'a1' } });
  });

  it('devolve o corpo cru quando não há envelope data', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { items: [], total: 0 }));

    const result = await apiClient.get<{ total: number }>('/api/admin/members');

    expect(result).toEqual({ ok: true, data: { items: [], total: 0 } });
  });

  it('extrai code e message do formato de erro da API', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(409, { error: { code: 'CONFLICT', message: 'Email already in use.' } }),
    );

    const result = await apiClient.post('/api/admin/users', {});

    expect(result).toEqual({
      ok: false,
      status: 409,
      code: 'CONFLICT',
      message: 'Email already in use.',
    });
  });

  it('usa mensagem genérica quando o erro não segue o formato', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, {}));

    const result = await apiClient.get('/api/admin/members');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('UNKNOWN');
      expect(result.message).toBeTruthy();
    }
  });

  it('trata corpo vazio como sucesso', async () => {
    fetchMock.mockResolvedValue(jsonResponse(204, undefined));

    const result = await apiClient.delete('/api/admin/members/a1');

    expect(result.ok).toBe(true);
  });

  it('trata falha de rede sem lançar', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));

    const result = await apiClient.get('/api/admin/members');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(0);
      expect(result.code).toBe('NETWORK');
    }
  });

  it('envia content-type json apenas quando há body', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await apiClient.get('/api/admin/members');
    expect(fetchMock.mock.calls[0][1].headers).toEqual({});

    await apiClient.post('/api/admin/members', { name: 'Ana' });
    expect(fetchMock.mock.calls[1][1].headers).toEqual({ 'content-type': 'application/json' });
  });
});
