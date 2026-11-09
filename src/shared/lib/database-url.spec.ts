import { requireDatabaseSsl } from './database-url';

describe('Migration database SSL URL', () => {
  it('requires SSL when the URL has no query string', () => {
    const result = new URL(
      requireDatabaseSsl('postgresql://user:password@db.example.com:5432/postgres'),
    );
    expect(result.searchParams.get('sslmode')).toBe('require');
    expect(result.hostname).toBe('db.example.com');
  });
  it('preserves credentials, port, database and unrelated query parameters', () => {
    const source = new URL(
      'postgres://user:p%40ss%3Aword@db.example.com:5432/postgres?schema=public&pgbouncer=true',
    );
    const result = new URL(requireDatabaseSsl(source.toString()));
    expect(result.username).toBe(source.username);
    expect(result.password).toBe(source.password);
    expect(result.port).toBe(source.port);
    expect(result.pathname).toBe(source.pathname);
    expect(result.searchParams.get('schema')).toBe('public');
    expect(result.searchParams.get('pgbouncer')).toBe('true');
  });
  it.each(['disable', 'allow', 'prefer', 'require'])('enforces require for mode %s', (mode) => {
    expect(
      new URL(
        requireDatabaseSsl(`postgresql://user:password@db.example.com/postgres?sslmode=${mode}`),
      ).searchParams.get('sslmode'),
    ).toBe('require');
  });
  it.each(['verify-ca', 'verify-full'])('preserves the stronger %s mode', (mode) => {
    expect(
      new URL(
        requireDatabaseSsl(
          `postgresql://user:password@db.example.com/postgres?sslmode=${mode}&sslrootcert=ca.pem`,
        ),
      ).searchParams.get('sslmode'),
    ).toBe(mode);
  });
  it('removes a conflicting legacy ssl=false flag', () => {
    const result = new URL(
      requireDatabaseSsl('postgresql://user:password@db.example.com/postgres?ssl=false'),
    );
    expect(result.searchParams.has('ssl')).toBe(false);
    expect(result.searchParams.get('sslmode')).toBe('require');
  });
  it.each([undefined, '', 'not-a-url', 'https://user:private-password@example.com'])(
    'rejects invalid input without exposing its contents',
    (raw) => {
      expect(() => requireDatabaseSsl(raw)).toThrow('DATABASE_URL must');
      try {
        requireDatabaseSsl(raw);
      } catch (error) {
        expect(String(error)).not.toContain('private-password');
      }
    },
  );
  it('is idempotent', () => {
    const value = requireDatabaseSsl(
      'postgresql://user:password@db.example.com/postgres?schema=public',
    );
    expect(requireDatabaseSsl(value)).toBe(value);
  });
});
