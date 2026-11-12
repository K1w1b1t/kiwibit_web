import { triggerLinkedInAutoPost } from './linkedin';
import { prepareLinkedInCover, uploadLinkedInCover } from './linkedin-image';

jest.mock('./linkedin-image', () => ({
  prepareLinkedInCover: jest.fn(),
  uploadLinkedInCover: jest.fn(),
}));

describe('LinkedIn posts with a cover', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      LINKEDIN_COMPANY_AUTO_POST_ENABLED: 'true',
      LINKEDIN_COMPANY_ACCESS_TOKEN: 'company-token',
      LINKEDIN_COMPANY_AUTHOR_URN: 'urn:li:organization:123',
      LINKEDIN_PERSONAL_AUTO_POST_ENABLED: 'true',
      LINKEDIN_PERSONAL_ACCESS_TOKEN: 'person-token',
      LINKEDIN_PERSONAL_AUTHOR_URN: 'urn:li:person:456',
    };
    jest.mocked(prepareLinkedInCover).mockResolvedValue(Buffer.from('cover'));
  });
  afterAll(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it.each([
    ['personal', 'urn:li:digitalmediaAsset:123'],
    ['company', 'urn:li:image:123'],
  ] as const)('uploads and attaches the cover for %s', async (target, urn) => {
    jest.mocked(uploadLinkedInCover).mockResolvedValueOnce(urn);
    const fetchMock = jest
      .fn()
      .mockResolvedValue(
        new Response(null, { status: 201, headers: { 'x-restli-id': 'urn:li:share:1' } }),
      );
    global.fetch = fetchMock;
    const result = await triggerLinkedInAutoPost(target, {
      title: 'Title',
      url: 'https://example.org/post',
      imageUrl: 'https://example.org/cover.png',
      commentary: 'Reviewed text\n\n#Kiwibit',
    });
    expect(result).toMatchObject({ ok: true, postUrn: 'urn:li:share:1', imageUrn: urn });
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    if (target === 'company') {
      expect(payload.content).toEqual({ media: { id: urn } });
      expect(payload.commentary).toContain('#Kiwibit');
    } else {
      const content = payload.specificContent['com.linkedin.ugc.ShareContent'];
      expect(content.shareMediaCategory).toBe('IMAGE');
      expect(content.media[0].media).toBe(urn);
      expect(content.shareCommentary.text).toBe('Reviewed text\n\n#Kiwibit');
    }
  });

  it('does not send a text-only post when image upload fails', async () => {
    jest.mocked(uploadLinkedInCover).mockRejectedValueOnce(new Error('failed'));
    const fetchMock = jest.fn();
    global.fetch = fetchMock;
    const result = await triggerLinkedInAutoPost('company', {
      title: 'Title',
      url: 'https://example.org/post',
      imageUrl: 'https://example.org/cover.png',
    });
    expect(result).toMatchObject({ ok: false, code: 'LINKEDIN_IMAGE_FAILED' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports an expired token when image initialization is rejected', async () => {
    jest.mocked(uploadLinkedInCover).mockRejectedValueOnce(new Error('LINKEDIN_TOKEN_EXPIRED'));
    const fetchMock = jest.fn();
    global.fetch = fetchMock;
    const result = await triggerLinkedInAutoPost('personal', {
      title: 'Title',
      url: 'https://example.org/post',
      imageUrl: 'https://example.org/cover.png',
    });
    expect(result).toMatchObject({ ok: false, expired: true, code: 'LINKEDIN_TOKEN_EXPIRED' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
