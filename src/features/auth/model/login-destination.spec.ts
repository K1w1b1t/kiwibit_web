import { loginDestination } from './login-destination';

describe('OAuth login continuation', () => {
  it('continues only to the same-origin OAuth browser endpoint', () => {
    expect(
      loginDestination(
        '?callbackUrl=%2Fapi%2Fmcp-auth%2Fbrowser%3Ftransaction%3Dexample',
        'https://kiwibit.com.br',
      ),
    ).toBe('/api/mcp-auth/browser?transaction=example');
  });
  it.each([
    'https://attacker.invalid/api/mcp-auth/browser',
    '//attacker.invalid/api/mcp-auth/browser',
    '/admin/users',
    'javascript:alert(1)',
  ])('rejects a forged callback %s', (callback) => {
    expect(
      loginDestination(`?callbackUrl=${encodeURIComponent(callback)}`, 'https://kiwibit.com.br'),
    ).toBe('/admin');
  });
});
