import { BASE_URL } from './helpers/constants';

const VALID = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  company: 'Engines',
  message: 'Please help us secure our platform.',
};

async function postContact(body: unknown) {
  return fetch(`${BASE_URL}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/contact', () => {
  it('rejects invalid submissions with 400', async () => {
    const res = await postContact({ name: 'A', email: 'bad', message: 'x' });
    expect(res.status).toBe(400);
  });

  it('silently accepts honeypot-filled submissions with 200', async () => {
    const res = await postContact({ ...VALID, website: 'http://spam.example' });
    expect(res.status).toBe(200);
  });

  it('returns 503 for a valid submission when no webhook is configured', async () => {
    // DISCORD_CONTACT_WEBHOOK_URL is unset in the E2E environment, so delivery
    // fails deterministically with a 503 (the UI falls back to mailto).
    const res = await postContact(VALID);
    expect(res.status).toBe(503);
  });
});
