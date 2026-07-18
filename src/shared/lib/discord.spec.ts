import { reportServerError, sendDiscordNotification } from './discord';

const WEBHOOK = 'https://discord.test/webhook';

describe('sendDiscordNotification', () => {
  afterEach(() => {
    delete (global as { fetch?: unknown }).fetch;
  });

  it('returns false when no webhook url is provided', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    await expect(sendDiscordNotification(undefined, { content: 'hi' })).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts the payload and returns true on ok response', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(sendDiscordNotification(WEBHOOK, { content: 'hi' })).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      WEBHOOK,
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ content: 'hi' }) }),
    );
  });

  it('returns false when the request throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch;
    await expect(sendDiscordNotification(WEBHOOK, { content: 'hi' })).resolves.toBe(false);
  });

  it('returns false on non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    await expect(sendDiscordNotification(WEBHOOK, { content: 'hi' })).resolves.toBe(false);
  });
});

describe('reportServerError', () => {
  const originalEnv = process.env.DISCORD_ERROR_WEBHOOK_URL;

  afterEach(() => {
    process.env.DISCORD_ERROR_WEBHOOK_URL = originalEnv;
    delete (global as { fetch?: unknown }).fetch;
  });

  it('is a no-op when the error webhook is unset', async () => {
    delete process.env.DISCORD_ERROR_WEBHOOK_URL;
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(reportServerError({ source: 'test', message: 'boom' })).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends an error embed when configured', async () => {
    process.env.DISCORD_ERROR_WEBHOOK_URL = WEBHOOK;
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      reportServerError({ source: '/api/x', message: 'boom', status: 500, method: 'GET' }),
    ).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
    expect(body.embeds[0].description).toBe('boom');
  });
});
