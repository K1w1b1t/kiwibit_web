import { ApiClient } from './helpers/client';
import { makeAdminClient, signInAsAdmin } from './helpers/auth';
import { BASE_URL } from './helpers/constants';

/**
 * Smoke coverage for the admin *pages* (not the APIs).
 *
 * The unit suite runs in a node environment without jsdom, so rendered markup
 * is unreachable there. These tests are the only place that proves an admin
 * screen actually renders and that the proxy guards it.
 *
 * Every new admin route should be added to ADMIN_ROUTES.
 */
const ADMIN_ROUTES = [
  '/admin',
  '/admin/members',
  '/admin/members/new',
  '/admin/users',
  '/admin/users/new',
  '/admin/posts',
  '/admin/posts/new',
  '/admin/projects',
  '/admin/projects/new',
  '/admin/account',
  '/admin/connections',
] as const;

describe('admin pages', () => {
  describe('unauthenticated', () => {
    it.each(ADMIN_ROUTES)('redireciona %s para /login', async (path) => {
      const res = await fetch(`${BASE_URL}${path}`, { redirect: 'manual' });

      expect([302, 307]).toContain(res.status);
      const location = res.headers.get('location') ?? '';
      expect(new URL(location, BASE_URL).pathname).toBe('/login');
    });
  });

  describe('authenticated as admin', () => {
    let client: ApiClient;

    beforeAll(async () => {
      client = makeAdminClient();
      await signInAsAdmin(client);
    });

    it.each(ADMIN_ROUTES)('serve %s com 200', async (path) => {
      const res = await client.get(path);
      expect(res.status).toBe(200);
    });

    it('renderiza a navegação do admin no dashboard', async () => {
      const res = await client.get('/admin');
      const html = await res.text();

      for (const label of ['Dashboard', 'Blog', 'Projetos', 'Equipe', 'Minha conta']) {
        expect(html).toContain(label);
      }
      expect(html).toContain('/admin/members');
      expect(html).not.toContain('Minhas conexões');
      expect(html).not.toContain('href="/admin/connections"');
    });

    it('redireciona a lista antiga para membros', async () => {
      const res = await client.get('/admin/users');
      const html = await res.text();

      expect(html).toContain('Membros');
    });

    it('renderiza o formulário de novo membro', async () => {
      const res = await client.get('/admin/members/new');
      const html = await res.text();

      expect(html).toContain('Novo Membro');
      expect(html).toContain('Criar membro');
    });

    it.each(['/admin/account', '/admin/connections'])(
      'renders connection controls at the unlinked account via %s',
      async (path) => {
        const res = await client.get(path);
        expect(new URL(res.url).pathname).toBe('/admin/account');
        const html = await res.text();
        for (const label of [
          'Assistentes de IA',
          'Conectar Codex',
          'Conectar Claude Code',
          'Conectar Antigravity',
        ]) {
          expect(html).toContain(label);
        }
      },
    );

    it.each(['admin', 'editor', 'member_manager', 'member'] as const)(
      'routes a linked %s account to its own member controls',
      async (role) => {
        const email = `e2e-account-${role}-${Date.now()}@kiwibit.test`;
        const password = 'Password#123!';
        const response = await client.post('/api/admin/members', {
          name: 'Account navigation test',
          account: { email, password, role },
        });
        expect(response.status).toBe(201);
        const { data: member } = await response.json();
        try {
          const linked = makeAdminClient();
          const { csrfToken } = await (await linked.get('/api/auth/csrf')).json();
          await linked.postForm('/api/auth/callback/credentials', {
            csrfToken,
            email,
            password,
            redirect: 'false',
            json: 'true',
            callbackUrl: '/',
          });
          for (const path of ['/admin/account', '/admin/connections']) {
            const res = await linked.get(path);
            expect(res.status).toBe(200);
            expect(new URL(res.url).pathname).toBe(`/admin/members/${member.id}/edit`);
            const html = await res.text();
            for (const label of [
              'Minha conta',
              'Assistentes de IA',
              'Conectar Codex',
              'Conectar Claude Code',
              'Conectar Antigravity',
            ]) {
              expect(html).toContain(label);
            }
            expect(html).not.toContain('Minhas conexões');
            expect(html).not.toContain('href="/admin/connections"');
          }
        } finally {
          expect((await client.delete(`/api/admin/members/${member.id}`)).status).toBe(200);
        }
      },
    );
  });
});
