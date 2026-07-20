/**
 * Verifies the real apiError() implementation fires reportServerError for 5xx.
 * Route specs use the mocked api-helpers, so this imports the real module via a
 * relative path (bypassing the moduleNameMapper alias) and mocks its deps.
 */
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/shared/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/shared/lib/discord', () => ({
  reportServerError: jest.fn().mockResolvedValue(true),
}));

import { apiError } from './api-helpers';
import { reportServerError } from './discord';

const reportMock = reportServerError as jest.Mock;

describe('apiError error reporting', () => {
  it('reports 5xx responses to Discord', () => {
    apiError('INTERNAL', 'boom', 500);
    expect(reportMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 500, code: 'INTERNAL' }),
    );
  });

  it('does not report 4xx responses', () => {
    apiError('VALIDATION_ERROR', 'bad', 400);
    expect(reportMock).not.toHaveBeenCalled();
  });
});
