// Re-export real utility implementations from the actual module (relative path bypasses moduleNameMapper)
export {
  parsePaginationParams,
  parseJsonBody,
  paginatedJson,
  runPaginatedQuery,
  valid,
  invalid,
  failure,
  rejected,
  isNonEmptyString,
} from '../lib/api-helpers';
export type { PaginatableDelegate, ApiFailure, Validated } from '../lib/api-helpers';

import type { ApiFailure } from '../lib/api-helpers';

// Controlled mocks for functions that tests need to spy on / override
export const requireAdminSession = jest.fn();
export const requirePanelSession = jest.fn();
export const apiError = jest
  .fn()
  .mockImplementation((code: string, message: string, status: number) => ({
    status,
    json: () => Promise.resolve({ error: { code, message } }),
  }));

// Delegates to the mocked `apiError` instead of re-exporting the real one, so
// specs that spy on `apiError` also observe validator-produced failures.
export const failureResponse = jest
  .fn()
  .mockImplementation(({ code, message, status }: ApiFailure) => apiError(code, message, status));
