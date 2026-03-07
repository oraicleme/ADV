import type { ImageSearchProvider, ImageSearchResult } from './image-search-providers/types';
import { MockImageSearchProvider } from './image-search-providers/mock-provider';
import { UnsplashImageSearchProvider } from './image-search-providers/unsplash-provider';

export type { ImageSearchResult } from './image-search-providers/types';

let _provider: ImageSearchProvider | null = null;

function getProvider(): ImageSearchProvider {
  if (_provider) return _provider;

  const unsplashKey =
    typeof import.meta !== 'undefined' &&
    import.meta.env?.PUBLIC_UNSPLASH_ACCESS_KEY;

  if (unsplashKey) {
    _provider = new UnsplashImageSearchProvider(unsplashKey);
  } else {
    _provider = new MockImageSearchProvider();
  }

  return _provider;
}

/**
 * Override the active provider (useful for tests).
 */
export function setProvider(provider: ImageSearchProvider | null): void {
  _provider = provider;
}

/**
 * Search for product images. Returns up to `limit` results.
 * Uses Unsplash when configured, otherwise falls back to the mock provider.
 */
export async function searchImages(
  query: string,
  limit = 3,
): Promise<ImageSearchResult[]> {
  if (!query.trim()) return [];
  return getProvider().search(query, limit);
}
