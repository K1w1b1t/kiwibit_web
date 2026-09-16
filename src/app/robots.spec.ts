import robots from './robots';

describe('robots', () => {
  const originalValue = process.env.SEARCH_INDEXING_ENABLED;

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env.SEARCH_INDEXING_ENABLED;
      return;
    }

    process.env.SEARCH_INDEXING_ENABLED = originalValue;
  });

  it('omits sitemap and host while allowing crawlers to reach noindex pages', () => {
    process.env.SEARCH_INDEXING_ENABLED = 'false';

    expect(robots()).toEqual({
      rules: {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/login'],
      },
    });
  });

  it('announces sitemap and host when search indexing is enabled', () => {
    process.env.SEARCH_INDEXING_ENABLED = 'true';

    expect(robots()).toEqual(
      expect.objectContaining({
        sitemap: expect.stringContaining('/sitemap.xml'),
        host: expect.any(String),
      }),
    );
  });
});
