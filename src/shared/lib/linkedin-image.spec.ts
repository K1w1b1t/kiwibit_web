import { prepareLinkedInCover, uploadLinkedInCover } from './linkedin-image';
import https from 'node:https';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import sharp from 'sharp';

describe('LinkedIn image transport', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it.each([
    'http://example.org/cover.png',
    'https://127.0.0.1/a',
    'https://[::1]/a',
    'https://user:pass@example.org/a',
  ])('rejects unsafe image URL %s', async (url) => {
    await expect(prepareLinkedInCover(url)).rejects.toThrow('LINKEDIN_IMAGE_URL_INVALID');
  });

  it.each([
    ['company', 'urn:li:organization:1', true, 'urn:li:image:123'],
    ['personal', 'urn:li:person:1', false, 'urn:li:digitalmediaAsset:123'],
  ] as const)('initializes and uploads an image for %s', async (_target, owner, company, urn) => {
    const value = company
      ? { image: urn, uploadUrl: 'https://www.linkedin.com/upload' }
      : {
          asset: urn,
          uploadMechanism: {
            'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
              uploadUrl: 'https://www.linkedin.com/upload',
            },
          },
        };
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ value }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 201 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'AVAILABLE' }), { status: 200 }),
      );
    global.fetch = fetchMock;
    await expect(uploadLinkedInCover('token', owner, company, Buffer.from('image'))).resolves.toBe(
      urn,
    );
    expect(fetchMock).toHaveBeenCalledTimes(company ? 3 : 2);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'PUT', redirect: 'error' });
    if (!company) {
      expect(
        JSON.parse(fetchMock.mock.calls[0][1].body).registerUploadRequest.supportedUploadMechanism,
      ).toEqual(['SYNCHRONOUS_UPLOAD']);
    }
  });

  it('blocks publication when LinkedIn image processing fails', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            value: { image: 'urn:li:image:123', uploadUrl: 'https://www.linkedin.com/upload' },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 201 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'PROCESSING_FAILED' }), { status: 200 }),
      );
    await expect(
      uploadLinkedInCover('token', 'urn:li:organization:1', true, Buffer.from('x')),
    ).rejects.toThrow('LINKEDIN_IMAGE_PROCESSING_FAILED');
  });

  it('rejects an untrusted upload URL before transmitting a token', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          value: { image: 'urn:li:image:123', uploadUrl: 'https://evil.example/upload' },
        }),
        { status: 200 },
      ),
    );
    global.fetch = fetchMock;
    await expect(
      uploadLinkedInCover('token', 'urn:li:organization:1', true, Buffer.from('x')),
    ).rejects.toThrow('LINKEDIN_IMAGE_INITIALIZE_FAILED');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports a rejected image upload', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            value: { image: 'urn:li:image:123', uploadUrl: 'https://www.linkedin.com/upload' },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 400 }));
    await expect(
      uploadLinkedInCover('token', 'urn:li:organization:1', true, Buffer.from('x')),
    ).rejects.toThrow('LINKEDIN_IMAGE_UPLOAD_FAILED');
  });

  it('converts a WebP cover to JPEG after downloading it from a public address', async () => {
    const webp = await sharp({
      create: { width: 2, height: 2, channels: 3, background: '#ff0000' },
    })
      .webp()
      .toBuffer();
    jest.spyOn(https, 'request').mockImplementation(((
      _options: unknown,
      callback: (response: unknown) => void,
    ) => {
      const response = Object.assign(Readable.from([webp]), { statusCode: 200, headers: {} });
      const request = Object.assign(new EventEmitter(), {
        setTimeout: jest.fn(),
        end: () => callback(response),
      });
      return request;
    }) as unknown as typeof https.request);
    const result = await prepareLinkedInCover('https://8.8.8.8/cover.webp');
    expect((await sharp(result).metadata()).format).toBe('jpeg');
  });
});
