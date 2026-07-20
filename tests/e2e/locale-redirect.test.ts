import { BASE_URL } from './helpers/constants';

describe('Locale negotiation (proxy)', () => {
  it('redirects "/" to /pt for Portuguese Accept-Language', async () => {
    const res = await fetch(`${BASE_URL}/`, {
      redirect: 'manual',
      headers: { 'accept-language': 'pt-BR,pt;q=0.9' },
    });
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toMatch(/\/pt$/);
  });

  it('redirects "/" to /en for English Accept-Language', async () => {
    const res = await fetch(`${BASE_URL}/`, {
      redirect: 'manual',
      headers: { 'accept-language': 'en-US,en;q=0.9' },
    });
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toMatch(/\/en$/);
  });

  it('does not redirect already-prefixed locale paths', async () => {
    const res = await fetch(`${BASE_URL}/pt`, { redirect: 'manual' });
    expect(res.status).toBe(200);
  });

  it('does not redirect /api routes (locale block excludes them)', async () => {
    const res = await fetch(`${BASE_URL}/api/projects`, { redirect: 'manual' });
    expect(res.status).toBe(200);
  });
});
