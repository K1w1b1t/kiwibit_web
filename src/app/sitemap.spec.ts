import sitemap from './sitemap';

describe('sitemap', () => {
  const originalValue = process.env.SEARCH_INDEXING_ENABLED;

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env.SEARCH_INDEXING_ENABLED;
      return;
    }

    process.env.SEARCH_INDEXING_ENABLED = originalValue;
  });

  it('returns an empty sitemap when search indexing is disabled', () => {
    process.env.SEARCH_INDEXING_ENABLED = 'false';

    expect(sitemap()).toEqual([]);
  });

  it('returns the public routes when search indexing is enabled', () => {
    process.env.SEARCH_INDEXING_ENABLED = 'true';

    expect(sitemap()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: expect.stringContaining('/pt') }),
        expect.objectContaining({ url: expect.stringContaining('/en') }),
      ]),
    );
  });
});
