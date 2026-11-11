export function loginDestination(search: string, origin: string) {
  const candidate = new URLSearchParams(search).get('callbackUrl');
  if (!candidate) return '/admin';
  try {
    const destination = new URL(candidate, origin);
    if (destination.origin === origin && destination.pathname === '/api/mcp-auth/browser')
      return destination.pathname + destination.search;
  } catch {
    /* Invalid callbacks fall back to the panel. */
  }
  return '/admin';
}
