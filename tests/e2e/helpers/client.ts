/**
 * Minimal HTTP client that maintains a cookie jar across requests.
 * Used exclusively for E2E tests — no app imports.
 */
export class ApiClient {
  private readonly cookieStore = new Map<string, string>();

  constructor(private readonly baseUrl: string) {}

  private storeCookies(headers: Headers): void {
    // Node 18+ exposes getSetCookie() returning string[]
    const setCookies: string[] =
      typeof (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === 'function'
        ? (headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
        : headers.get('set-cookie')
          ? [headers.get('set-cookie')!]
          : [];

    for (const raw of setCookies) {
      const [pair] = raw.split(';');
      const eqIdx = pair.indexOf('=');
      if (eqIdx < 1) continue;
      const name = pair.slice(0, eqIdx).trim();
      const value = pair.slice(eqIdx + 1).trim();
      if (value) {
        this.cookieStore.set(name, value);
      } else {
        this.cookieStore.delete(name);
      }
    }
  }

  private get cookieHeader(): string {
    return [...this.cookieStore.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  async get(path: string): Promise<Response> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { Cookie: this.cookieHeader },
    });
    this.storeCookies(res.headers);
    return res;
  }

  async post(path: string, body: unknown): Promise<Response> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: this.cookieHeader },
      body: JSON.stringify(body),
    });
    this.storeCookies(res.headers);
    return res;
  }

  async postForm(path: string, data: Record<string, string>): Promise<Response> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: this.cookieHeader,
      },
      body: new URLSearchParams(data).toString(),
      redirect: 'manual',
    });
    this.storeCookies(res.headers);
    return res;
  }

  async put(path: string, body: unknown): Promise<Response> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: this.cookieHeader },
      body: JSON.stringify(body),
    });
    this.storeCookies(res.headers);
    return res;
  }

  async delete(path: string): Promise<Response> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: { Cookie: this.cookieHeader },
    });
    this.storeCookies(res.headers);
    return res;
  }

  hasCookie(name: string): boolean {
    return this.cookieStore.has(name);
  }

  clearCookies(): void {
    this.cookieStore.clear();
  }
}
