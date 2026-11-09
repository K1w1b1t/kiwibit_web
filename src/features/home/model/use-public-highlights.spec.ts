import { fetchPublicItems } from './use-public-highlights';

describe('Public project catalog loading', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });
  it('loads every page, including projects beyond the first six', async () => {
    const first = Array.from({ length: 100 }, (_, id) => ({ id }));
    const last = [{ id: 100 }, { id: 101 }];
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: first, total: 102 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: last, total: 102 }) });
    global.fetch = fetchMock;
    const items = await fetchPublicItems(
      '/api/projects?page=1&limit=100',
      new AbortController().signal,
      true,
    );
    expect(items).toEqual([...first, ...last]);
    expect(fetchMock.mock.calls[1][0]).toBe('/api/projects?page=2&limit=100');
  });
  it('keeps highlights limited to their first page', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ items: [{ id: 1 }], total: 50 }) });
    global.fetch = fetchMock;
    expect(
      await fetchPublicItems(
        '/api/projects?page=1&limit=6&featured=true',
        new AbortController().signal,
      ),
    ).toEqual([{ id: 1 }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('reports an error when a later page fails instead of silently truncating the catalog', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ id: 1 }], total: 2 }) })
      .mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(
      fetchPublicItems('/api/projects?page=1&limit=100', new AbortController().signal, true),
    ).rejects.toThrow('500');
  });
  it('does not request data after cancellation', async () => {
    global.fetch = jest.fn();
    const controller = new AbortController();
    controller.abort();
    await expect(fetchPublicItems('/api/projects', controller.signal, true)).rejects.toThrow(
      'aborted',
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
