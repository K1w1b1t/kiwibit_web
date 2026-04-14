const actual = jest.requireActual<typeof import('../api-helpers')>('../api-helpers');

export const parsePaginationParams = actual.parsePaginationParams;
export const parseJsonBody = actual.parseJsonBody;
export const paginatedJson = actual.paginatedJson;
export const runPaginatedQuery = actual.runPaginatedQuery;

export const requireAdminSession = jest.fn();
export const apiError = jest
  .fn()
  .mockImplementation((code: string, message: string, status: number) => ({
    status,
    json: () => Promise.resolve({ error: { code, message } }),
  }));
