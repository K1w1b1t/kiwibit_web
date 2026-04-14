import { ApiClient } from './client';
import { BASE_URL } from './constants';
import { signInAsAdmin, makeAdminClient } from './auth';

export const UNKNOWN_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Registers a `beforeAll` that creates and authenticates an admin client.
 * Returns a ref object whose `.client` is populated before the first test runs.
 */
export function useAdminClient(): { client: ApiClient } {
  const ref = { client: null as unknown as ApiClient };
  beforeAll(async () => {
    ref.client = makeAdminClient();
    await signInAsAdmin(ref.client);
  });
  return ref;
}

/** Returns an unauthenticated client for public endpoint assertions. */
export function anonClient(): ApiClient {
  return new ApiClient(BASE_URL);
}

/** Asserts a response is a valid paginated list. */
export async function expectPaginatedList(
  res: Response,
): Promise<{ items: unknown[]; total: number }> {
  expect(res.status).toBe(200);
  const body = (await res.json()) as { items: unknown[]; total: number };
  expect(Array.isArray(body.items)).toBe(true);
  expect(typeof body.total).toBe('number');
  return body;
}

/** Asserts a public read response returns 200 and the expected id. */
export async function expectPublicItem(resPromise: Promise<Response>, expectedId: string) {
  const res = await resPromise;
  expect(res.status).toBe(200);
  expect(((await res.json()) as { id: string }).id).toBe(expectedId);
}

/** Asserts a delete response returns 200 with success: true. */
export async function expectDeleteOk(resPromise: Promise<Response>) {
  const res = await resPromise;
  expect(res.status).toBe(200);
  expect(((await res.json()) as { success: boolean }).success).toBe(true);
}
/** Asserts a POST returns 201+success, runs fieldCheck on data, and returns the created id. */
export async function expectCreated(
  resPromise: Promise<Response>,
  fieldCheck: (data: Record<string, unknown>) => void,
): Promise<string> {
  const res = await resPromise;
  expect(res.status).toBe(201);
  const body = (await res.json()) as { success: boolean; data: Record<string, unknown> };
  expect(body.success).toBe(true);
  fieldCheck(body.data);
  return body.data.id as string;
}

/** Asserts a GET returns 200, the expected id, and optionally runs fieldCheck on the body. */
export async function expectAdminItem(
  resPromise: Promise<Response>,
  expectedId: string,
  fieldCheck?: (body: Record<string, unknown>) => void,
): Promise<void> {
  const res = await resPromise;
  expect(res.status).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body.id).toBe(expectedId);
  fieldCheck?.(body);
}
