jest.mock('next/font/google', () => ({
  Geist: jest.fn(() => ({ variable: 'geist-sans' })),
  Geist_Mono: jest.fn(() => ({ variable: 'geist-mono' })),
}));

import { generateMetadata } from './layout';

describe('generateMetadata', () => {
  const originalValue = process.env.SEARCH_INDEXING_ENABLED;

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env.SEARCH_INDEXING_ENABLED;
      return;
    }

    process.env.SEARCH_INDEXING_ENABLED = originalValue;
  });

  it('emits noindex metadata when search indexing is disabled', async () => {
    process.env.SEARCH_INDEXING_ENABLED = 'false';

    const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'pt' }) });

    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it('does not emit noindex metadata when search indexing is enabled', async () => {
    process.env.SEARCH_INDEXING_ENABLED = 'true';

    const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'pt' }) });

    expect(metadata.robots).toBeUndefined();
  });
});
