import { POST } from './route';
import { sendDiscordNotification } from '@/shared/lib/discord';
import { resetRateLimit } from '@/shared/lib/rate-limit';

jest.mock('@/shared/lib/discord', () => ({
  sendDiscordNotification: jest.fn(),
}));

const sendMock = sendDiscordNotification as jest.Mock;

const VALID = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  company: 'Engines',
  message: 'Please help us secure our API.',
};

function req(body: unknown, ip = '10.0.0.1') {
  return new Request('http://localhost/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/contact', () => {
  beforeEach(() => {
    resetRateLimit();
    sendMock.mockReset();
    sendMock.mockResolvedValue(true);
  });

  it('rejects invalid JSON with 400', async () => {
    const res = await POST(req('{ not json'));
    expect(res.status).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('silently accepts honeypot-filled submissions without notifying', async () => {
    const res = await POST(req({ ...VALID, website: 'http://spam.example' }));
    expect(res.status).toBe(200);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rejects invalid submissions with 400', async () => {
    const res = await POST(req({ name: 'A', email: 'bad', message: 'x' }));
    expect(res.status).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('delivers a valid submission and returns 200', async () => {
    const res = await POST(req(VALID, '10.0.0.2'));
    expect(res.status).toBe(200);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it('returns 503 when delivery fails', async () => {
    sendMock.mockResolvedValue(false);
    const res = await POST(req(VALID, '10.0.0.3'));
    expect(res.status).toBe(503);
  });

  it('rate-limits repeated submissions from the same ip', async () => {
    for (let i = 0; i < 5; i += 1) {
      const ok = await POST(req(VALID, '10.0.0.9'));
      expect(ok.status).toBe(200);
    }
    const limited = await POST(req(VALID, '10.0.0.9'));
    expect(limited.status).toBe(429);
  });
});
