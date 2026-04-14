import { requireAdminSession } from '@/shared/lib/api-helpers';

export function makeReq(url: string, body?: unknown, method?: string) {
  const m = method ?? (body !== undefined ? 'POST' : 'GET');
  return new Request(url, {
    method: m,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function paramsFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

export const ADMIN_SESSION = {
  session: {
    user: { id: 'uid-1', name: 'Admin', email: 'admin@test.com', role: 'admin' as const },
  },
  response: null,
};

export const UNAUTH_RESPONSE = {
  status: 401,
  json: () => Promise.resolve({ error: { code: 'UNAUTHORIZED' } }),
};

export function mockAuth(ok = true) {
  (requireAdminSession as jest.Mock).mockResolvedValue(
    ok ? ADMIN_SESSION : { session: null, response: UNAUTH_RESPONSE },
  );
}
