import { randomBytes } from 'node:crypto';
import { decryptToken, encryptToken, isTokenCryptoConfigured } from './token-crypto';

const VALID_KEY = randomBytes(32).toString('base64');

describe('token-crypto', () => {
  const originalKey = process.env.LINKEDIN_TOKEN_ENC_KEY;

  afterEach(() => {
    process.env.LINKEDIN_TOKEN_ENC_KEY = originalKey;
  });

  it('round-trips a token', () => {
    process.env.LINKEDIN_TOKEN_ENC_KEY = VALID_KEY;
    const token = 'AQXlinkedin-access-token-value';
    expect(decryptToken(encryptToken(token))).toBe(token);
  });

  it('produces a different ciphertext each time (random IV)', () => {
    process.env.LINKEDIN_TOKEN_ENC_KEY = VALID_KEY;
    expect(encryptToken('same')).not.toBe(encryptToken('same'));
  });

  it('rejects a tampered ciphertext', () => {
    process.env.LINKEDIN_TOKEN_ENC_KEY = VALID_KEY;
    const [iv, tag, ciphertext] = encryptToken('secret').split(':');
    const flipped = Buffer.from(ciphertext, 'base64');
    flipped[0] ^= 0xff;
    const tampered = [iv, tag, flipped.toString('base64')].join(':');
    expect(() => decryptToken(tampered)).toThrow();
  });

  it('throws on a malformed payload', () => {
    process.env.LINKEDIN_TOKEN_ENC_KEY = VALID_KEY;
    expect(() => decryptToken('not-a-valid-payload')).toThrow();
  });

  it('reports configuration state from the key', () => {
    process.env.LINKEDIN_TOKEN_ENC_KEY = VALID_KEY;
    expect(isTokenCryptoConfigured()).toBe(true);

    delete process.env.LINKEDIN_TOKEN_ENC_KEY;
    expect(isTokenCryptoConfigured()).toBe(false);

    // A key of the wrong length is not usable.
    process.env.LINKEDIN_TOKEN_ENC_KEY = randomBytes(16).toString('base64');
    expect(isTokenCryptoConfigured()).toBe(false);
  });

  it('refuses to encrypt without a valid key', () => {
    delete process.env.LINKEDIN_TOKEN_ENC_KEY;
    expect(() => encryptToken('x')).toThrow();
  });
});
