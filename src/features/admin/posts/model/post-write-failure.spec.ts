import { postWriteFailure } from './post-write-failure';

describe('Post persistence errors', () => {
  it('does not disclose content included in a database error', async () => {
    const response = postWriteFailure(new Error('private-post-content private-user-email'));
    expect(response.status).toBe(500);
    const body = JSON.stringify(await response.json());
    expect(body).not.toContain('private-post-content');
    expect(body).not.toContain('private-user-email');
  });
  it('returns a generic validation failure for unavailable media', () => {
    expect(postWriteFailure(new Error('POST_MEDIA_UNAVAILABLE')).status).toBe(400);
  });
});
