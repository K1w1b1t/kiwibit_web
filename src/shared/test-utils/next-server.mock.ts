export class NextRequest extends Request {
  nextUrl: URL;
  cookies: {
    get: (name: string) => { value: string } | undefined;
  };

  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(input, init);
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    this.nextUrl = new URL(urlStr);

    const cookieHeader = (init?.headers as Record<string, string> | undefined)?.cookie;
    const cookieMap = new Map<string, string>();
    if (cookieHeader) {
      cookieHeader.split(';').forEach((pair) => {
        const [k, v] = pair.trim().split('=');
        if (k && v) cookieMap.set(k, v);
      });
    }
    this.cookies = {
      get: (name: string) => {
        const val = cookieMap.get(name);
        return val !== undefined ? { value: val } : undefined;
      },
    };
  }
}

export const NextResponse = {
  json: jest.fn().mockImplementation((body: unknown, init?: { status?: number }) => ({
    status: init?.status ?? 200,
    json: () => Promise.resolve(body),
  })),
  redirect: jest.fn().mockImplementation((url: string | URL, init?: { status?: number }) => {
    const cookiesSet: string[] = [];
    return {
      status: init?.status ?? 307,
      headers: {
        get: (name: string) => {
          if (name.toLowerCase() === 'location') return url.toString();
          if (name.toLowerCase() === 'set-cookie') return cookiesSet.join(', ');
          return null;
        },
      },
      cookies: {
        set: (name: string, value: string) => {
          cookiesSet.push(`${name}=${value}; HttpOnly`);
        },
        delete: (name: string) => {
          cookiesSet.push(`${name}=; Max-Age=0`);
        },
      },
    };
  }),
};

/**
 * Runs the callback immediately: there is no request lifecycle to defer to in
 * unit tests, and specs assert on the side effects synchronously.
 */
export const after = jest.fn().mockImplementation((work: () => unknown) => {
  void work();
});
