import { isSearchIndexingEnabled } from './search-indexing';

describe('isSearchIndexingEnabled', () => {
  const originalValue = process.env.SEARCH_INDEXING_ENABLED;

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env.SEARCH_INDEXING_ENABLED;
      return;
    }

    process.env.SEARCH_INDEXING_ENABLED = originalValue;
  });

  it('enables indexing only for the literal true value', () => {
    process.env.SEARCH_INDEXING_ENABLED = 'true';

    expect(isSearchIndexingEnabled()).toBe(true);
  });

  it('disables indexing for false', () => {
    process.env.SEARCH_INDEXING_ENABLED = 'false';

    expect(isSearchIndexingEnabled()).toBe(false);
  });

  it('disables indexing when the variable is absent', () => {
    delete process.env.SEARCH_INDEXING_ENABLED;

    expect(isSearchIndexingEnabled()).toBe(false);
  });

  it('disables indexing for invalid values', () => {
    process.env.SEARCH_INDEXING_ENABLED = 'TRUE';

    expect(isSearchIndexingEnabled()).toBe(false);
  });
});
