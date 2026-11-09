/** Requires encrypted PostgreSQL connections without printing credentials. */
export function requireDatabaseSsl(rawUrl: string | undefined): string {
  let url: URL;
  try {
    url = new URL(rawUrl ?? '');
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL.');
  }
  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new Error('DATABASE_URL must use the postgres or postgresql protocol.');
  }

  const mode = url.searchParams.get('sslmode');
  if (mode !== 'verify-ca' && mode !== 'verify-full') {
    url.searchParams.set('sslmode', 'require');
  }
  // A conflicting legacy ssl=false flag must not override the required mode.
  url.searchParams.delete('ssl');
  return url.toString();
}
