import { makeAdminClient, signInAsAdmin } from './helpers/auth';
import { BASE_URL } from './helpers/constants';

describe('Consent server rendering', () => {
  it.each(['/pt', '/en', '/login'])('omits the unresolved dialog on %s', async (path) => {
    const response = await fetch(`${BASE_URL}${path}`);
    expect(response.status).toBe(200);
    expect(await response.text()).not.toContain('role="dialog" aria-labelledby="analytics-title"');
  });

  it('omits the unresolved dialog on authenticated panel pages', async () => {
    const client = makeAdminClient();
    await signInAsAdmin(client);
    for (const path of [
      '/admin',
      '/admin/account',
      '/admin/posts',
      '/admin/members',
      '/admin/projects',
    ]) {
      const response = await client.get(path);
      expect(response.status).toBe(200);
      expect(await response.text()).not.toContain(
        'role="dialog" aria-labelledby="analytics-title"',
      );
    }
  });
});
