// Re-export real utility implementations from the actual module (relative path bypasses moduleNameMapper)
export {
  parsePaginationParams,
  parseJsonBody,
  paginatedJson,
  runPaginatedQuery,
} from '../lib/api-helpers';
export type { PaginatableDelegate } from '../lib/api-helpers';

// Controlled mocks for functions that tests need to spy on / override
export const requireAdminSession = jest.fn();
export const apiError = jest
  .fn()
  .mockImplementation((code: string, message: string, status: number) => ({
    status,
    json: () => Promise.resolve({ error: { code, message } }),
  }));
