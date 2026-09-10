/** Returns whether search engines may index the current deployment. */
export function isSearchIndexingEnabled(): boolean {
  return process.env.SEARCH_INDEXING_ENABLED === 'true';
}
