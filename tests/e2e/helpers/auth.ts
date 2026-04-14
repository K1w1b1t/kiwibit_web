import { ApiClient } from './client';
import { BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD } from './constants';

/**
 * Signs in the given client as the E2E admin user via NextAuth credentials.
 * After this call the client's cookie jar holds the session token.
 */
export async function signInAsAdmin(client: ApiClient): Promise<void> {
  // Step 1 — obtain CSRF token (NextAuth requires it for credentials POST)
  const csrfRes = await client.get('/api/auth/csrf');
  if (!csrfRes.ok) {
    throw new Error(`Failed to fetch CSRF token: ${csrfRes.status}`);
  }
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

  // Step 2 — sign in; NextAuth v4 credential callback returns 302 + Set-Cookie
  await client.postForm('/api/auth/callback/credentials', {
    csrfToken,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    redirect: 'false',
    json: 'true',
    callbackUrl: BASE_URL,
  });
}

export function makeAdminClient(): ApiClient {
  return new ApiClient(BASE_URL);
}
