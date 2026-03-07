import type { ImageSearchProvider, ImageSearchResult } from './types';

interface UnsplashPhoto {
  id: string;
  urls: { regular: string; small: string; thumb: string };
  alt_description: string | null;
  description: string | null;
  width: number;
  height: number;
  user: { name: string };
}

interface UnsplashSearchResponse {
  results: UnsplashPhoto[];
  total: number;
}

export class UnsplashImageSearchProvider implements ImageSearchProvider {
  private accessKey: string;

  constructor(accessKey: string) {
    this.accessKey = accessKey;
  }

  async search(query: string, limit = 3): Promise<ImageSearchResult[]> {
    const params = new URLSearchParams({
      query: `${query} product`,
      per_page: String(limit),
      orientation: 'squarish',
    });

    const res = await fetch(
      `https://api.unsplash.com/search/photos?${params}`,
      {
        headers: { Authorization: `Client-ID ${this.accessKey}` },
      },
    );

    if (!res.ok) {
      console.warn(`Unsplash search failed (${res.status}): ${await res.text()}`);
      return [];
    }

    const data: UnsplashSearchResponse = await res.json();

    return data.results.map((photo) => ({
      id: photo.id,
      url: photo.urls.regular,
      thumbnailUrl: photo.urls.small,
      description: photo.alt_description ?? photo.description ?? query,
      source: 'unsplash' as const,
      attribution: `Photo by ${photo.user.name} on Unsplash`,
      width: photo.width,
      height: photo.height,
    }));
  }
}
