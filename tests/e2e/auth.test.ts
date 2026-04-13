import { ApiClient } from './helpers/client';
import { signInAsAdmin, makeAdminClient } from './helpers/auth';
import { BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD } from './helpers/constants';

describe('Authentication', () => {
  describe('Unauthenticated access to protected routes', () => {
    it('returns 401 for GET /api/admin/users without a session', async () => {
      const client = new ApiClient(BASE_URL);
      const res = await client.get('/api/admin/users');
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 for POST /api/admin/projects without a session', async () => {
      const client = new ApiClient(BASE_URL);
      const res = await client.post('/api/admin/projects', { title: 'X', description: 'Y' });
      expect(res.status).toBe(401);
    });
  });

  describe('CSRF endpoint', () => {
    it('GET /api/auth/csrf returns a csrfToken', async () => {
      const client = new ApiClient(BASE_URL);
      const res = await client.get('/api/auth/csrf');
      expect(res.ok).toBe(true);
      const body = await res.json();
      expect(typeof body.csrfToken).toBe('string');
      expect(body.csrfToken.length).toBeGreaterThan(0);
    });
  });

  describe('Credentials sign-in', () => {
    it('rejects wrong password', async () => {
      const client = new ApiClient(BASE_URL);

      const csrfRes = await client.get('/api/auth/csrf');
      const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

      const res = await client.postForm('/api/auth/callback/credentials', {
        csrfToken,
        email: ADMIN_EMAIL,
        password: 'wrong-password',
        redirect: 'false',
        json: 'true',
        callbackUrl: BASE_URL,
      });

      // NextAuth returns 302 to an error page on bad credentials
      // The session should NOT be set
      const sessionRes = await client.get('/api/auth/session');
      const session = await sessionRes.json();
      expect(session.user).toBeUndefined();
    });

    it('rejects unknown email', async () => {
      const client = new ApiClient(BASE_URL);

      const csrfRes = await client.get('/api/auth/csrf');
      const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

      await client.postForm('/api/auth/callback/credentials', {
        csrfToken,
        email: 'nobody@kiwibit.test',
        password: ADMIN_PASSWORD,
        redirect: 'false',
        json: 'true',
        callbackUrl: BASE_URL,
      });

      const sessionRes = await client.get('/api/auth/session');
      const session = await sessionRes.json();
      expect(session.user).toBeUndefined();
    });

    it('succeeds with correct credentials and returns a session', async () => {
      const client = makeAdminClient();
      await signInAsAdmin(client);

      const sessionRes = await client.get('/api/auth/session');
      expect(sessionRes.ok).toBe(true);
      const session = (await sessionRes.json()) as { user?: { email: string; role: string } };

      expect(session.user).toBeDefined();
      expect(session.user!.email).toBe(ADMIN_EMAIL);
      expect(session.user!.role).toBe('admin');
    });

    it('authenticated client can access protected admin route', async () => {
      const client = makeAdminClient();
      await signInAsAdmin(client);

      const res = await client.get('/api/admin/users');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.items)).toBe(true);
    });

    it('cleared session loses access to protected route', async () => {
      const client = makeAdminClient();
      await signInAsAdmin(client);

      // confirm access
      const before = await client.get('/api/admin/users');
      expect(before.status).toBe(200);

      // drop cookies to simulate logout
      client.clearCookies();

      const after = await client.get('/api/admin/users');
      expect(after.status).toBe(401);
    });
  });
});
