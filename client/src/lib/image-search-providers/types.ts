export interface ImageSearchResult {
  id: string;
  url: string;
  thumbnailUrl: string;
  description: string;
  source: 'unsplash' | 'pexels' | 'mock';
  attribution?: string;
  width: number;
  height: number;
}

export interface ImageSearchProvider {
  search(query: string, limit?: number): Promise<ImageSearchResult[]>;
}
