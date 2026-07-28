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

      for (const label of ['Dashboard', 'Blog', 'Projetos', 'Equipe', 'Usuários']) {
        expect(html).toContain(label);
      }
      expect(html).toContain('/admin/members');
    });

    it('lista usuários com o e-mail do admin de e2e', async () => {
      const res = await client.get('/admin/users');
      const html = await res.text();

      expect(html).toContain('Usuários');
      expect(html).toContain('e2e-admin@kiwibit.test');
    });

    it('renderiza o formulário de novo membro', async () => {
      const res = await client.get('/admin/members/new');
      const html = await res.text();

      expect(html).toContain('Novo Membro');
      expect(html).toContain('Criar membro');
    });
  });
});
